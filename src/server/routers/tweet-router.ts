import { db } from '@/db'
import { account as accountSchema, tweets } from '@/db/schema'
import { qstash } from '@/lib/qstash'
import { BUCKET_NAME, s3Client } from '@/lib/s3'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { Receiver } from '@upstash/qstash'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { SendTweetV2Params, TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure, publicProcedure } from '../jstack'
import { getBaseUrl } from '@/constants/base-url'
import { getAccount } from './utils/get-account'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY as string,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY as string,
})

// Function to fetch media URLs from S3 keys using S3Client
async function fetchMediaFromS3(
  s3Keys: string[],
): Promise<Array<{ url: string; type: 'image' | 'gif' | 'video' }>> {
  const mediaData = await Promise.all(
    s3Keys.map(async (s3Key) => {
      try {
        const headResponse = await s3Client.send(
          new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
          }),
        )

        const url = `https://contentport-dev.s3.amazonaws.com/${s3Key}`
        const contentType = headResponse.ContentType || ''

        // Determine media type from content-type or file extension
        let type: 'image' | 'gif' | 'video' = 'image'

        if (
          contentType.startsWith('video/') ||
          s3Key.toLowerCase().includes('.mp4') ||
          s3Key.toLowerCase().includes('.mov')
        ) {
          type = 'video'
        } else if (contentType === 'image/gif' || s3Key.toLowerCase().endsWith('.gif')) {
          type = 'gif'
        } else if (contentType.startsWith('image/')) {
          type = 'image'
        }

        return { url, type }
      } catch (error) {
        console.error('Failed to fetch media from S3:', error)
        throw new Error('Failed to fetch media from S3')
      }
    }),
  )
  return mediaData
}

export const tweetRouter = j.router({
  getConnectedAccount: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const connectedAccount = await db.query.account.findFirst({
      where: and(eq(accountSchema.userId, user.id), eq(accountSchema.id, 'twitter')),
    })

    return c.json({ isConnected: Boolean(connectedAccount) })
  }),
  recents: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const recentTweets = await db.query.tweets.findMany({
      where: eq(tweets.userId, user.id),
      orderBy: desc(tweets.createdAt),
      limit: 5,
      columns: { id: true, content: true },
    })

    return c.json({ tweets: recentTweets })
  }),

  getTweet: privateProcedure
    .input(z.object({ tweetId: z.string() }))
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { tweetId } = input

      const tweet = await db.query.tweets.findFirst({
        where: and(eq(tweets.id, tweetId), eq(tweets.userId, user.id)),
      })

      return c.superjson({ tweet })
    }),

  create: privateProcedure.post(async ({ c, ctx }) => {
    const { user } = ctx

    const account = await getAccount({
      email: user.email,
    })

    if (!account?.id) {
      throw new HTTPException(400, {
        message: 'Please connect your Twitter account',
      })
    }

    const id = crypto.randomUUID()

    const [tweet] = await db
      .insert(tweets)
      .values({
        id,
        accountId: account.id,
        userId: user.id,
        content: '',
        editorState: {},
      })
      .returning()

    if (!tweet) {
      throw new HTTPException(500, { message: 'Failed to create tweet' })
    }

    return c.superjson({ id, tweet })
  }),

  // save: privateProcedure
  //   .input(
  //     z.object({
  //       tweetId: z.string(),
  //       content: z.string(),
  //       mediaData: z
  //         .array(
  //           z.object({
  //             media_id: z.string(),
  //             media_key: z.string().optional(),
  //             type: z.enum(['image', 'video', 'gif']),
  //             url: z.string(),
  //             width: z.number().optional(),
  //             height: z.number().optional(),
  //             size: z.number().optional(),
  //           }),
  //         )
  //         .optional(),
  //     }),
  //   )
  //   .post(async ({ c, ctx, input }) => {
  //     const { user } = ctx
  //     const { tweetId, content, mediaData } = input

  //     const mediaIds = mediaData?.map((m) => m.media_id) || []

  //     const [tweet] = await db
  //       .insert(tweets)
  //       .values({
  //         id: tweetId,
  //         userId: user.id,
  //         content,
  //         mediaIds,
  //         s3Keys: [],
  //         updatedAt: new Date(),
  //       })
  //       .onConflictDoUpdate({
  //         target: tweets.id,
  //         set: {
  //           content,
  //           mediaIds,
  //           s3Keys: [],
  //           updatedAt: new Date(),
  //         },
  //       })
  //       .returning()

  //     return c.superjson({ success: true, assignedId: tweetId, tweet })
  //   }),

  uploadMediaToTwitter: privateProcedure
    .input(
      z.object({
        s3Key: z.string(),
        mediaType: z.enum(['image', 'gif', 'video']),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { s3Key, mediaType } = input

      const activeAccount = await getAccount({ email: user.email })

      if (!activeAccount) {
        throw new HTTPException(400, {
          message: 'No active account found',
        })
      }

      const account = await db.query.account.findFirst({
        where: and(
          eq(accountSchema.userId, user.id),
          eq(accountSchema.id, activeAccount.id),
        ),
      })

      if (!account) {
        throw new HTTPException(400, {
          message: 'Twitter account not connected or access token missing',
        })
      }

      const consumerKey = 'dtcZgPjt85VKEe4XrxhmTs0n5'
      const consumerSecret = 'dSWDC5M4kROfyQPpiQiZDs5Y8eT8IWTUZ9HHBP6p0T15Iy6xk1'

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: account.accessToken as string,
        accessSecret: account.accessSecret as string,
      })

      const mediaUrl = `https://contentport-dev.s3.amazonaws.com/${s3Key}`
      const response = await fetch(mediaUrl)

      if (!response.ok) {
        throw new HTTPException(400, { message: 'Failed to fetch media from S3' })
      }

      const buffer = await response.arrayBuffer()

      // Determine media category and type for Twitter
      let mediaCategory: string
      let mimeType: string

      switch (mediaType) {
        case 'image':
          mediaCategory = 'tweet_image'
          mimeType = response.headers.get('content-type') || 'image/png'
          break
        case 'gif':
          mediaCategory = 'tweet_gif'
          mimeType = 'image/gif'
          break
        case 'video':
          mediaCategory = 'tweet_video'
          mimeType = response.headers.get('content-type') || 'video/mp4'
          break
      }

      const mediaBuffer = Buffer.from(buffer)
      const mediaId = await client.v1.uploadMedia(mediaBuffer, { mimeType })

      const mediaUpload = mediaId

      return c.json({
        media_id: mediaUpload,
        media_key: `3_${mediaUpload}`,
      })
    }),

  delete: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { id } = input

      const [tweet] = await db
        .select()
        .from(tweets)
        .where(and(eq(tweets.id, id), eq(tweets.userId, user.id)))

      if (!tweet) {
        throw new HTTPException(404, { message: 'Tweet not found' })
      }

      await db.delete(tweets).where(and(eq(tweets.id, id), eq(tweets.userId, user.id)))

      const messages = qstash.messages

      if (tweet.qstashId) {
        try {
          await messages.delete(tweet.qstashId)
        } catch (err) {
          // fail silently
        }
      }

      return c.json({ success: true })
    }),

  schedule: privateProcedure
    .input(
      z.object({
        content: z.string().min(1).max(4000),
        scheduledUnix: z.number(),
        mediaIds: z.array(z.string()).default([]),
        s3Keys: z.array(z.string()).default([]),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { content, scheduledUnix, mediaIds, s3Keys } = input

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      const dbAccount = await db.query.account.findFirst({
        where: and(eq(accountSchema.userId, user.id), eq(accountSchema.id, account.id)),
      })

      if (!dbAccount || !dbAccount.accessToken) {
        throw new HTTPException(400, {
          message: 'Twitter account not connected or access token missing',
        })
      }

      const tweetId = crypto.randomUUID()

      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? 'https://sponge-relaxing-separately.ngrok-free.app'
          : getBaseUrl()

      const { messageId } = await qstash.publishJSON({
        url: baseUrl + '/api/tweet/post',
        body: { tweetId, userId: user.id, accountId: dbAccount.id },
        notBefore: scheduledUnix,
      })

      const [tweet] = await db
        .insert(tweets)
        .values({
          id: tweetId,
          accountId: account.id,
          userId: user.id,
          content,
          isScheduled: true,
          scheduledFor: new Date(scheduledUnix * 1000),
          mediaIds,
          s3Keys,
          qstashId: messageId,
        })
        .returning()

      if (!tweet) {
        throw new HTTPException(500, { message: 'Problem with database' })
      }

      return c.json({ success: true })
    }),

  post: publicProcedure.post(async ({ c }) => {
    const body = await c.req.text()

    const signature =
      c.req.header('Upstash-Signature') ?? c.req.header('upstash-signature') ?? ''

    try {
      await receiver.verify({
        body,
        signature,
      })
    } catch (err) {
      throw new HTTPException(403, { message: 'Invalid credentials' })
    }

    const { tweetId, userId, accountId } = JSON.parse(body) as {
      tweetId: string
      userId: string
      accountId: string
    }

    const tweet = await db.query.tweets.findFirst({
      where: eq(tweets.id, tweetId),
    })

    const account = await db.query.account.findFirst({
      where: and(
        eq(accountSchema.userId, userId),
        // use account that this was scheduled with
        eq(accountSchema.id, accountId),
      ),
    })

    if (!account || !account.accessToken) {
      console.log('no account')
      throw new HTTPException(400, {
        message: 'Twitter account not connected or access token missing',
      })
    }

    if (!tweet) {
      throw new HTTPException(404, { message: 'Tweet not found' })
    }

    try {
      const consumerKey = 'dtcZgPjt85VKEe4XrxhmTs0n5'
      const consumerSecret = 'dSWDC5M4kROfyQPpiQiZDs5Y8eT8IWTUZ9HHBP6p0T15Iy6xk1'

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: account.accessToken as string,
        accessSecret: account.accessSecret as string,
      })

      // Create tweet payload
      const tweetPayload: any = {
        text: tweet.content,
      }

      // Add media if present
      if (tweet.mediaIds && tweet.mediaIds.length > 0) {
        tweetPayload.media = {
          media_ids: tweet.mediaIds,
        }
      }

      try {
        console.log("ℹ️ tweet payload", JSON.stringify(tweetPayload, null, 2))
        const res = await client.v2.tweet(tweetPayload)
        res.errors?.map((error) =>
          console.error('⚠️ Twitter error:', JSON.stringify(error, null, 2)),
        )
      } catch (err) {
        console.error('🔴 Twitter error:', JSON.stringify(err, null, 2))
      }

      await db
        .update(tweets)
        .set({
          isScheduled: false,
          isPublished: true,
          updatedAt: new Date(),
        })
        .where(eq(tweets.id, tweetId))
    } catch (error) {
      console.error('Failed to post tweet:', error)
      throw new HTTPException(500, {
        message: 'Failed to post tweet to Twitter',
      })
    }

    return c.json({ success: true })
  }),

  postImmediate: privateProcedure
    .input(
      z.object({
        content: z.string().min(1).max(4000),
        mediaIds: z.array(z.string()).default([]),
        s3Keys: z.array(z.string()).default([]),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { content, mediaIds, s3Keys } = input

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      const dbAccount = await db.query.account.findFirst({
        where: and(eq(accountSchema.userId, user.id), eq(accountSchema.id, account.id)),
      })

      if (!dbAccount) {
        throw new HTTPException(400, {
          message: 'Account not found',
        })
      }

      const consumerKey = 'dtcZgPjt85VKEe4XrxhmTs0n5'
      const consumerSecret = 'dSWDC5M4kROfyQPpiQiZDs5Y8eT8IWTUZ9HHBP6p0T15Iy6xk1'

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: dbAccount.accessToken as string,
        accessSecret: dbAccount.accessSecret as string,
      })

      try {
        // Create tweet payload
        const tweetPayload: SendTweetV2Params = {
          text: content,
        }

        // Add media if present
        if (mediaIds && mediaIds.length > 0) {
          tweetPayload.media = {
            // @ts-expect-error tuple
            media_ids: mediaIds,
          }
        }

        const response = await client.v2.tweet(tweetPayload)

        // Save to database
        await db.insert(tweets).values({
          accountId: account.id,
          userId: user.id,
          content,
          mediaIds,
          s3Keys,
          isScheduled: false,
          isPublished: true,
        })

        return c.json({ success: true, tweetId: response.data.id })
      } catch (error) {
        console.error('Failed to post tweet:', error)
        throw new HTTPException(500, {
          message: 'Failed to post tweet to Twitter',
        })
      }
    }),

  // getScheduled: privateProcedure.get(async ({ c, ctx }) => {
  //   const { user } = ctx

  //   const scheduledTweets = await db
  //     .select({
  //       id: tweets.id,
  //       content: tweets.content,
  //       mediaIds: tweets.mediaIds,
  //       scheduledFor: tweets.scheduledFor,
  //       createdAt: tweets.createdAt,
  //       updatedAt: tweets.updatedAt,
  //       day: sql<string>`DATE(${tweets.scheduledFor})`.as('day'),
  //     })
  //     .from(tweets)
  //     .where(and(eq(tweets.userId, user.id), eq(tweets.isScheduled, true)))
  //     .orderBy(desc(sql`DATE(${tweets.scheduledFor})`), desc(tweets.scheduledFor))
  //     .limit(50)

  //   const groupedTweets = scheduledTweets.reduce(
  //     (acc, tweet) => {
  //       const day = tweet.day
  //       if (!acc[day]) {
  //         acc[day] = []
  //       }
  //       acc[day].push({
  //         id: tweet.id,
  //         content: tweet.content,
  //         mediaIds: tweet.mediaIds,
  //         scheduledFor: tweet.scheduledFor,
  //         createdAt: tweet.createdAt,
  //         updatedAt: tweet.updatedAt,
  //       })
  //       return acc
  //     },
  //     {} as Record<string, any[]>,
  //   )

  //   // Sort groups by farthest date in the future first

  //   return c.superjson({ tweets: sortedGroupedTweets })
  // }),

  // Modify the getScheduledAndPublished function to include media URLs
  getScheduledAndPublished: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const account = await getAccount({
      email: user.email,
    })

    if (!account?.id) {
      throw new HTTPException(400, {
        message: 'Please connect your Twitter account',
      })
    }

    const allTweets = await db.query.tweets.findMany({
      where: and(eq(tweets.accountId, account.id), eq(tweets.isScheduled, true)),
      orderBy: [desc(tweets.scheduledFor)],
    })

    // Fetch media URLs for each tweet
    const tweetsWithMedia = await Promise.all(
      allTweets.map(async (tweet) => {
        const mediaData = await fetchMediaFromS3(tweet.s3Keys || [])
        return { ...tweet, mediaData }
      }),
    )

    return c.superjson({ tweets: tweetsWithMedia })
  }),
})
