import { getBaseUrl } from '@/constants/base-url'
import { db } from '@/db'
import {
  account as accountSchema,
  knowledgeDocument,
  user as userSchema,
} from '@/db/schema'
import { firecrawl } from '@/lib/firecrawl'
import { qstash } from '@/lib/qstash'
import { realtime } from '@/lib/realtime'
import { redis } from '@/lib/redis'
import { vector } from '@/lib/vector'
import { XmlPrompt } from '@/lib/xml-prompt'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { generateText } from 'ai'
import { and, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure, qstashProcedure } from '../jstack'
import { Account } from './settings-router'
import { getAccount, getAccounts } from './utils/get-account'
import { getTweet } from './utils/get-tweet'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

const isTwitterUrl = (url: string): boolean => {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)
}

const extractTweetId = (url: string): string | null => {
  const match = url.match(/\/status\/(\d+)/)
  return match?.[1] ? match[1] : null
}

export type TweetMetadata = {
  isTweet: true
  author: {
    name: string
    username: string
    profileImageUrl: string
  }
  tweet: {
    id: string
    text: string
    createdAt: string
  }
}

type Bio = {
  username: string
  name: string
  description: string
  id: string
}

type TSitemap = {
  id: string
  name: string
  url: string
  updatedAt: number // unix
  length: number
}

export const knowledgeRouter = j.router({
  reindex_all_accounts: privateProcedure.post(async ({ c, ctx }) => {
    const { user } = ctx

    const [dbUser] = await db.select().from(userSchema).where(eq(userSchema.id, user.id))

    if (!dbUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const accounts = await getAccounts({ userId: user.id })

    const baseUrl =
      process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

    for (const account of accounts) {
      await Promise.all([
        qstash.publishJSON({
          url: baseUrl + '/api/knowledge/index_tweets',
          body: {
            userId: user.id,
            accountId: account.id,
            handle: account.username,
          },
        }),
        qstash.publishJSON({
          url: baseUrl + '/api/knowledge/index_memories',
          body: {
            userId: user.id,
            accountId: account.id,
            handle: account.username,
          },
        }),
      ])
    }

    return c.json({ success: true })
  }),

  get_sitemaps: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const sitemaps = await redis.hgetall<
      Record<string, { id: string; name: string; url: string; updatedAt: number }>
    >(`sitemaps:${user.email}`)

    if (!sitemaps) {
      return c.json({
        sitemaps: {} as Record<
          string,
          { id: string; name: string; url: string; length: number; updatedAt: number }
        >,
      })
    }

    const sitemapsWithLength: Record<
      string,
      { id: string; name: string; url: string; length: number; updatedAt: number }
    > = {}

    await Promise.all(
      Object.entries(sitemaps).map(async ([key, sitemap]) => {
        const length = await redis.scard(`sitemap:${sitemap.id}`)

        sitemapsWithLength[key] = { ...sitemap, length }
      }),
    )

    return c.json({ sitemaps: sitemapsWithLength })
  }),

  delete_sitemap: privateProcedure
    .input(z.object({ id: z.string() }))
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { id } = input

      const sitemap = await redis.hget<{
        id: string
        name: string
        url: string
        updatedAt: number
      }>(`sitemaps:${user.email}`, id)

      if (sitemap) {
        await redis.hdel(`sitemaps:${user.email}`, id)
        await redis.del(`sitemap:${sitemap.url}`)
      }

      vector.deleteNamespace(`sitemap:${id}`)

      return c.json({ success: true })
    }),

  refresh_sitemap: privateProcedure
    .input(z.object({ id: z.string() }))
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { id } = input

      const namespace = vector.namespace(`sitemap:${id}`)

      const sitemap = await redis.hget<{
        id: string
        name: string
        url: string
        updatedAt: number
      }>(`sitemaps:${user.email}`, id)

      if (!sitemap) {
        throw new HTTPException(404, { message: 'Sitemap not found' })
      }

      const map = await firecrawl.mapUrl(sitemap.url)

      if (map.error) {
        throw new HTTPException(500, { message: `Unable to index sitemap: ${map.error}` })
      }

      if (map.success && map.links) {
        await redis.del(`sitemap:${sitemap.id}`)
        await redis.sadd(`sitemap:${sitemap.id}`, ...(map.links as [string]))

        const batchSize = 1_000

        await namespace.reset()

        // upstash vector has max batch size of 1_000
        for (let i = 0; i < map.links.length; i += batchSize) {
          const batch = map.links.slice(i, i + batchSize)
          await namespace.upsert(
            batch.map((link) => ({
              id: link,
              data: link,
              metadata: { userId: user.id },
            })),
          )
        }
      }

      return c.json({ success: true })
    }),

  // start_indexing_sitemap: privateProcedure
  //   .input(z.object({ name: z.string(), url: z.string() }))
  //   .post(async ({ c, ctx, input }) => {
  //     const { user } = ctx
  //     const { name, url } = input

  //     const id = randomUUID()

  //     const baseUrl =
  //       process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

  //     await qstash.publishJSON({
  //       url: baseUrl + '/api/knowledge/index_sitemap',
  //       method: 'POST',
  //       body: { id, name, url, userId: user.id },
  //     })

  //     return c.json({ success: true, id })
  //   }),
  index_sitemap: privateProcedure
    .input(
      z.object({
        name: z.string(),
        url: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { name, url } = input

      const [dbUser] = await db
        .select()
        .from(userSchema)
        .where(eq(userSchema.id, user.id))

      if (!dbUser) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      const id = nanoid()

      await redis.hset(`sitemaps:${dbUser.email}`, {
        [id]: { id, name, url, updatedAt: new Date().getTime() },
      })

      const map = await firecrawl.mapUrl(url)

      if (map.error) {
        throw new HTTPException(500, { message: `Unable to index sitemap: ${map.error}` })
      }

      const namespace = vector.namespace(`sitemap:${id}`)

      if (map.success && map.links) {
        await redis.del(`sitemap:${id}`)
        await redis.sadd(`sitemap:${id}`, ...(map.links as [string]))

        await namespace.reset()

        const batchSize = 1_000

        // upstash vector has max batch size of 1_000
        for (let i = 0; i < map.links.length; i += batchSize) {
          const batch = map.links.slice(i, i + batchSize)
          await namespace.upsert(
            batch.map((link) => ({
              id: link,
              data: link,
              metadata: { userId: user.id },
            })),
          )
        }
      }

      return c.json({ success: true })
    }),

  get_own_tweets: privateProcedure.get(async ({ c, ctx, input }) => {
    const { user } = ctx

    const account = await getAccount({ email: user.email })

    if (!account) {
      throw new HTTPException(404, {
        message: 'Account not found',
      })
    }

    const ids = await redis.smembers(`posts:${account.id}`)

    const tweets = await Promise.all(ids.map((id) => getTweet(id)))

    const returnTweets = tweets
      .filter(Boolean)
      .filter((t) => t.user.id_str === account.twitterId)
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      .map((t) => ({ main: t, replyChains: [] }))

    return c.json(returnTweets)
  }),

  index_memories: qstashProcedure.post(async ({ c, ctx }) => {
    const { body } = ctx
    const { userId, accountId } = body

    const [dbUser] = await db.select().from(userSchema).where(eq(userSchema.id, userId))

    if (!dbUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const account = await getAccount({ email: dbUser.email, accountId })

    if (!account) {
      throw new HTTPException(404, { message: 'Account not found' })
    }

    // clear existing memory
    await redis.del(`memories:${account.id}`)

    let bios: Array<Bio> = []

    const twitterUser = await client.v2.user(account.twitterId!, {
      'user.fields': ['description', 'entities'],
    })

    bios.push({
      username: twitterUser.data.username,
      name: twitterUser.data.name,
      description: twitterUser.data.description || '',
      id: twitterUser.data.id,
    })

    const mentionedUsers = twitterUser.data?.entities?.description?.mentions

    if (mentionedUsers && mentionedUsers.length > 0) {
      const mentionedUsernames = mentionedUsers.map((mention) => mention.username)
      const usersResponse = await client.v2.usersByUsernames(mentionedUsernames, {
        'user.fields': ['description', 'entities', 'public_metrics'],
      })

      bios.push(
        ...usersResponse.data?.map((user) => ({
          username: user.username,
          name: user.name,
          description: user.description || '',
          id: user.id,
        })),
      )
    }

    if (bios.filter((b) => Boolean(b.description)).length === 0) {
      return c.json({ success: true })
    }

    const prompt = new XmlPrompt()

    prompt.open('prompt')
    prompt.tag(
      'instructions',
      'summarize this twitter user in 5-10 bullet points. frame it from the perspective of the main user (e.g. Im a software engineer at XYZ)',
    )

    bios.forEach((bio, i) => {
      let note: string | undefined = undefined

      if (i === 0 && bios.length > 1) {
        note =
          "This is the main user we're talking about. Other bios are attached because they are mentioned in the main user's description."
      } else if (i > 0) {
        note = "This is a user/company/project mentioned in the main user's description."
      }

      prompt.tag(
        'bio',
        `Name: ${bio.name} Username: ${bio.username} Description: ${bio.description}`,
        { ...(note ? { note } : {}) },
      )
    })

    prompt.tag(
      'example_output',
      `- memory one
- memory two
- memory three`,
      {
        note: "Respond with all bullet points directly. No 'here's the bullet points' or similar, just start immediately with the first bullet point and end with the last. Use standard hypens for the bullet points, nothing else.",
      },
    )

    prompt.close('prompt')

    const result = await generateText({
      model: openrouter.chat('anthropic/claude-sonnet-4'),
      prompt: prompt.toString(),
    })

    const memories = result.text
      .split('\n')
      .map((line) => line.trim())
      .map((line) => (line.startsWith('-') ? line.slice(1).trim() : line))

    await Promise.all(
      memories.map(async (memory) => {
        await redis.lpush(`memories:${account.id}`, memory)
      }),
    )

    const namespace = realtime.channel(userId)
    await namespace.index_memories.status.emit({ status: 'success' })

    return c.json({ success: true })
  }),

  show_indexing_modal: privateProcedure.query(async ({ c, ctx, input }) => {
    const { user } = ctx

    const passedIndexing = await redis.hget(`passed_indexing_users`, user.id)

    if (passedIndexing) {
      return c.json({ shouldShow: false })
    }

    const accounts = await getAccounts({ userId: user.id })

    const accountStatuses = await Promise.all(
      accounts.map(async ({ id }) => {
        const account = await getAccount({ email: user.email, accountId: id })

        const status = await redis.get<'started' | 'success' | 'error'>(
          `status:posts:${account?.id}`,
        )

        if (status === 'started') return { isAcceptable: true }
        if (status === 'success') return { isAcceptable: true }

        if (account) {
          // status can expire, so double-check
          const posts = await redis.exists(`posts:${account.id}`)
          if (posts) return { isAcceptable: true }
        }

        return { isAcceptable: false }
      }),
    )

    if (accountStatuses.some((account) => account.isAcceptable === false)) {
      return c.json({ shouldShow: true })
    }

    await redis.hset(`passed_indexing_users`, { [user.id]: true })

    return c.json({ shouldShow: false })
  }),

  reindex_tweets: privateProcedure
    .input(z.object({ accountId: z.string() }))
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx

      const [dbAccount] = await db
        .select({ id: accountSchema.id })
        .from(accountSchema)
        .where(
          and(
            eq(accountSchema.userId, user.id),
            eq(accountSchema.providerId, 'twitter'),
            eq(accountSchema.id, input.accountId),
          ),
        )

      if (!dbAccount) {
        throw new HTTPException(404, { message: 'Database account not found' })
      }

      // re-indexing

      const account = await redis.json.get<Account>(
        `account:${user.email}:${dbAccount.id}`,
      )

      if (!account) {
        throw new HTTPException(404, { message: 'Account not found' })
      }

      await redis.del(`status:posts:${account.id}`)
      await redis.set(`status:posts:${account.id}`, 'started')

      const baseUrl =
        process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

      await qstash.publishJSON({
        url: baseUrl + '/api/knowledge/index_tweets',
        body: {
          userId: user.id,
          accountId: account.id,
          handle: account.username,
        },
      })

      return c.json({ success: true })
    }),

  index_tweets: qstashProcedure.post(async ({ c, ctx, input }) => {
    const { body } = ctx
    const { userId, accountId, handle } = body

    // clear existing tweets
    await redis.del(`posts:${accountId}`)
    await vector.deleteNamespace(`${accountId}`).catch(() => {})

    await redis.set(`status:posts:${accountId}`, 'started')

    try {
      const res = await fetch(
        process.env.TWITTER_API_SERVICE + '/knowledge/index_tweets',
        {
          method: 'POST',
          body: JSON.stringify({
            accountId,
            handle,
          }),
          headers: {
            Authorization: `Bearer ${process.env.CONTENTPORT_IDENTITY_KEY}`,
          },
        },
      )

      if (!res.ok) {
        throw new HTTPException(500, {
          message: 'Failed to index tweets:' + res.statusText,
        })
      }

      await redis.set(`status:posts:${accountId}`, 'success')
    } catch (err) {
      await redis.set(`status:posts:${accountId}`, 'error')
      console.error('[ERROR] Indexing tweets:', err)
    }

    // should take max 2 mins
    await redis.expire(`status:posts:${accountId}`, 60 * 2)

    const namespace = realtime.channel(userId)
    await namespace.index_tweets.status.emit({ status: 'resolved' })

    return c.json({ success: true })
  }),

  get_memories: privateProcedure.get(async ({ c, ctx, input }) => {
    const { user } = ctx

    const account = await getAccount({ email: user.email })

    if (!account) {
      throw new HTTPException(404, { message: 'Account not found' })
    }

    const memories = await redis.lrange(`memories:${account.id}`, 0, -1)

    return c.json({ memories })
  }),

  add_memory: privateProcedure
    .input(z.object({ memory: z.string() }))
    .post(async ({ c, ctx, input }) => {
      const { memory } = input
      const { user } = ctx

      const account = await getAccount({ email: user.email })

      if (!account) {
        throw new HTTPException(404, { message: 'Account not found' })
      }

      await redis.lpush(`memories:${account.id}`, memory)

      return c.json({ success: true })
    }),

  delete_memory: privateProcedure
    .input(z.object({ memory: z.string() }))
    .post(async ({ c, ctx, input }) => {
      const { memory } = input
      const { user } = ctx

      const account = await getAccount({ email: user.email })

      if (!account) {
        throw new HTTPException(404, { message: 'Account not found' })
      }

      await redis.lrem(`memories:${account.id}`, 1, memory)

      return c.json({ success: true })
    }),

  getDocument: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx

      const [document] = await db
        .select()
        .from(knowledgeDocument)
        .where(
          and(eq(knowledgeDocument.userId, user.id), eq(knowledgeDocument.id, input.id)),
        )

      if (!document) {
        throw new HTTPException(404, { message: 'Document not found' })
      }

      return c.superjson({ document })
    }),
  list: privateProcedure
    .input(
      z
        .object({
          isStarred: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(100).optional(),
          offset: z.number().min(0).default(0).optional(),
        })
        .optional(),
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx

      // const documents = await listKnowledgeDocuments(user.id, {
      //   isStarred: input?.isStarred,
      //   limit: input?.limit ?? 100,
      //   offset: input?.offset,
      // })

      return c.superjson({
        documents: [],
        total: 0,
      })
    }),

  delete: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx

      try {
        await db
          .update(knowledgeDocument)
          .set({ isDeleted: true })
          .where(
            and(
              eq(knowledgeDocument.id, input.id),
              eq(knowledgeDocument.userId, user.id),
            ),
          )

        return c.json({
          success: true,
        })
      } catch (error) {
        console.error('Error deleting knowledge document:', error)

        if (error instanceof HTTPException) {
          throw error
        }

        throw new HTTPException(500, {
          message: 'Failed to delete document',
        })
      }
    }),

  importUrl: privateProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx

      if (isTwitterUrl(input.url)) {
        const tweetId = extractTweetId(input.url)

        if (!tweetId) {
          throw new HTTPException(400, {
            message: 'Could not extract tweet ID from URL',
          })
        }

        try {
          const res = await client.v2.tweets(tweetId, {
            'tweet.fields': ['id', 'text', 'created_at', 'author_id', 'note_tweet'],
            'user.fields': ['username', 'profile_image_url', 'name'],
            expansions: ['author_id', 'referenced_tweets.id'],
          })

          const [tweet] = res.data
          const includes = res.includes
          const author = includes?.users?.[0]

          const [document] = await db
            .insert(knowledgeDocument)
            .values({
              fileName: '',
              s3Key: '',
              type: 'url',
              userId: user.id,
              description: tweet?.text,
              title: `Tweet by @${author?.username}`,
              sourceUrl: input.url,
              metadata: {
                isTweet: true,
                author: {
                  name: author?.name,
                  username: author?.username,
                  profileImageUrl: author?.profile_image_url,
                },
                tweet: {
                  id: tweet?.id,
                  text: tweet?.text,
                  createdAt: tweet?.created_at,
                },
              },
            })
            .returning()

          if (!document) {
            throw new HTTPException(500, {
              message: 'Failed to create document',
            })
          }

          return c.json({
            success: true,
            documentId: document.id,
            title: document.title,
            url: input.url,
          })
        } catch (error) {
          throw new HTTPException(400, {
            message: 'Failed to fetch tweet',
          })
        }
      }

      const result = await firecrawl.scrapeUrl(input.url)

      if (!result.success) {
        throw new HTTPException(400, {
          message: `Failed to fetch URL: ${result.error || 'Unknown error'}`,
        })
      }

      const title = result.metadata?.title || new URL(input.url).hostname

      const [document] = await db
        .insert(knowledgeDocument)
        .values({
          fileName: '',
          s3Key: '',
          type: 'url',
          userId: user.id,
          description: result.metadata?.description,
          title,
          sourceUrl: input.url,
        })
        .returning()

      if (!document) {
        throw new HTTPException(500, {
          message: 'Failed to create document',
        })
      }

      return c.json({
        success: true,
        documentId: document.id,
        title: title,
        url: input.url,
      })
    }),
})
