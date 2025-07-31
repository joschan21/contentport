import { db } from '@/db'
import { listKnowledgeDocuments } from '@/db/queries/knowledge'
import { knowledgeDocument } from '@/db/schema'
import { firecrawl } from '@/lib/firecrawl'
import { and, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

const client = new TwitterApi(Bun.env.TWITTER_BEARER_TOKEN).readOnly

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

export const knowledgeRouter = j.router({
  getDocument: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx

      const [document] = await db
        .select()
        .from(knowledgeDocument)
        .where(
          and(eq(knowledgeDocument.userId, user.id), eq(knowledgeDocument.id, input.id))
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
        .optional()
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx

      const documents = await listKnowledgeDocuments(user.id, {
        isStarred: input?.isStarred,
        limit: input?.limit ?? 100,
        offset: input?.offset,
      })

      return c.superjson({
        documents,
        total: documents.length,
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
            and(eq(knowledgeDocument.id, input.id), eq(knowledgeDocument.userId, user.id))
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
