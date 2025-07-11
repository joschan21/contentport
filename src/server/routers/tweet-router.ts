import { getBaseUrl } from '@/constants/base-url'
import { db } from '@/db'
import { account as accountSchema, tweets } from '@/db/schema'
import { qstash } from '@/lib/qstash'
import { redis } from '@/lib/redis'
import { BUCKET_NAME, s3Client } from '@/lib/s3'
import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { Receiver } from '@upstash/qstash'
import { Ratelimit } from '@upstash/ratelimit'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { SendTweetV2Params, TwitterApi, UserV2 } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure, publicProcedure } from '../jstack'
import { getAccount } from './utils/get-account'
import { waitUntil } from '@vercel/functions'
import {
  addDays,
  addHours,
  isAfter,
  isBefore,
  isSameDay,
  setDay,
  setHours,
  startOfDay,
  startOfHour,
} from 'date-fns'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY as string,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY as string,
})

const SLOTS = [10, 12, 14]

// Function to fetch media URLs from S3 keys using S3Client
async function fetchMediaFromS3(media: { s3Key: string; media_id: string }[]) {
  const mediaData = await Promise.all(
    media.map(async (m) => {
      try {
        const headResponse = await s3Client.send(
          new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: m.s3Key,
          }),
        )

        const url = `https://contentport-dev.s3.amazonaws.com/${m.s3Key}`
        const contentType = headResponse.ContentType || ''

        // Determine media type from content-type or file extension
        let type: 'image' | 'gif' | 'video' = 'image'

        if (
          contentType.startsWith('video/') ||
          m.s3Key.toLowerCase().includes('.mp4') ||
          m.s3Key.toLowerCase().includes('.mov')
        ) {
          type = 'video'
        } else if (
          contentType === 'image/gif' ||
          m.s3Key.toLowerCase().endsWith('.gif')
        ) {
          type = 'gif'
        } else if (contentType.startsWith('image/')) {
          type = 'image'
        }

        return {
          url,
          type,
          media_id: m.media_id,
          s3Key: m.s3Key,
          uploaded: true,
          uploading: false,
          file: null,
        }
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
        media: z.array(
          z.object({
            media_id: z.string(),
            s3Key: z.string(),
          }),
        ),
        // mediaIds: z.array(z.string()).default([]),
        // s3Keys: z.array(z.string()).default([]),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { content, scheduledUnix, media } = input

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

      if (user.plan !== 'pro') {
        const limiter = new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(1, '7d'),
        })

        const { success } = await limiter.limit(user.email)

        if (!success) {
          throw new HTTPException(402, {
            message:
              'Free plan scheduling limit reached. Upgrade to Pro to schedule unlimited tweets.',
          })
        }
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
          scheduledUnix: scheduledUnix * 1000,
          media,
          qstashId: messageId,
        })
        .returning()

      if (!tweet) {
        const messages = qstash.messages

        try {
          await messages.delete(messageId)
        } catch (err) {
          // fail silently
        }

        throw new HTTPException(500, { message: 'Problem with database' })
      }

      return c.json({
        success: true,
        tweetId,
        accountId: account.id,
        accountName: account.name,
      })
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
      const tweetPayload: Partial<SendTweetV2Params> = {
        text: tweet.content,
      }

      // Add media if present
      if (tweet.mediaIds && tweet.mediaIds.length > 0) {
        tweetPayload.media = {
          // @ts-expect-error tuple type vs. string[]
          media_ids: tweet.mediaIds,
        }
      }

      try {
        console.log('ℹ️ tweet payload', JSON.stringify(tweetPayload, null, 2))
        const res = await client.v2.tweet(tweetPayload)
        res.errors?.map((error) =>
          console.error('⚠️ Twitter error:', JSON.stringify(error, null, 2)),
        )

        await db
          .update(tweets)
          .set({
            isScheduled: false,
            isPublished: true,
            updatedAt: new Date(),
            twitterId: res.data.id,
          })
          .where(eq(tweets.id, tweetId))
      } catch (err) {
        console.error('🔴 Twitter error:', JSON.stringify(err, null, 2))

        throw new HTTPException(500, {
          message: 'Failed to post tweet to Twitter',
        })
      }
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
        media: z.array(
          z.object({
            media_id: z.string(),
            s3Key: z.string(),
          }),
        ),
        // mediaIds: z.array(z.string()).default([]),
        // s3Keys: z.array(z.string()).default([]),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { content, media } = input

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
        if (media && media.length > 0) {
          tweetPayload.media = {
            // @ts-expect-error tuple
            media_ids: media.map((m) => m.media_id),
          }
        }

        const res = await client.v2.tweet(tweetPayload)

        // Save to database
        await db.insert(tweets).values({
          accountId: account.id,
          userId: user.id,
          content,
          media,
          isScheduled: false,
          isPublished: true,
          twitterId: res.data.id,
        })

        return c.json({
          success: true,
          tweetId: res.data.id,
          accountId: account.id,
          accountName: account.name,
        })
      } catch (error) {
        console.error('Failed to post tweet:', error)
        throw new HTTPException(500, {
          message: 'Failed to post tweet to Twitter',
        })
      }
    }),

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
        const enrichedMedia = await fetchMediaFromS3(tweet.media || [])
        return {
          ...tweet,
          media: enrichedMedia,
        }
      }),
    )

    return c.superjson({ tweets: tweetsWithMedia })
  }),

  getPosted: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const account = await getAccount({
      email: user.email,
    })

    if (!account?.id) {
      throw new HTTPException(400, {
        message: 'Please connect your Twitter account',
      })
    }

    const postedTweets = await db.query.tweets.findMany({
      where: and(eq(tweets.accountId, account.id), eq(tweets.isPublished, true)),
      orderBy: [desc(tweets.updatedAt)],
    })

    // Fetch media URLs for each tweet
    const tweetsWithMedia = await Promise.all(
      postedTweets.map(async (tweet) => {
        const enrichedMedia = await fetchMediaFromS3(tweet.media || [])
        return {
          ...tweet,
          media: enrichedMedia,
        }
      }),
    )

    return c.superjson({ tweets: tweetsWithMedia, accountId: account.id })
  }),

  getNextQueueSlot: privateProcedure
    .input(
      z.object({
        currentTimeUnix: z.number(), // User's current time as Unix timestamp
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { currentTimeUnix } = input

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      // Get all scheduled tweets for this account
      const scheduledTweets = await db.query.tweets.findMany({
        where: and(eq(tweets.accountId, account.id), eq(tweets.isScheduled, true)),
        columns: { scheduledFor: true },
      })

      // Queue times: 8am, 12pm, 2pm
      const queueTimes = [8, 12, 14] // Hours in 24-hour format
      const userNow = new Date(currentTimeUnix * 1000)

      // Find next available slot
      for (let daysAhead = 0; daysAhead < 365; daysAhead++) {
        const checkDate = new Date(userNow)
        checkDate.setDate(userNow.getDate() + daysAhead)

        for (const hour of queueTimes) {
          // Create slot time in user's timezone
          const slotTime = new Date(checkDate)
          slotTime.setHours(hour, 0, 0, 0)

          // Skip if this slot is in the past
          if (slotTime <= userNow) continue

          // Check if this slot is already taken
          const isSlotTaken = scheduledTweets.some((tweet) => {
            if (!tweet.scheduledFor) return false
            const tweetTime = new Date(tweet.scheduledFor)
            const timeDiff = Math.abs(tweetTime.getTime() - slotTime.getTime())
            return timeDiff < 60000 // Within 1 minute = same slot
          })

          if (!isSlotTaken) {
            return c.json({
              scheduledUnix: Math.floor(slotTime.getTime() / 1000),
            })
          }
        }
      }

      throw new HTTPException(400, {
        message: 'No available queue slots found in the next year',
      })
    }),

  enqueue_tweet: privateProcedure
    .input(
      z.object({
        userNow: z.date(),
        timezone: z.string(),
        content: z.string().min(1).max(4000),
        media: z.array(
          z.object({
            media_id: z.string(),
            s3Key: z.string(),
          }),
        ),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { userNow, timezone, content, media } = input

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

      const scheduledTweets = await db.query.tweets.findMany({
        where: and(eq(tweets.accountId, account.id), eq(tweets.isScheduled, true)),
        columns: { scheduledUnix: true },
      })

      function isSpotEmpty(unix: number) {
        return !Boolean(scheduledTweets.some((t) => t.scheduledUnix === unix))
      }

      function getNextAvailableSlot({
        userNow,
        timezone,
        maxDaysAhead,
      }: {
        userNow: Date
        timezone: string
        maxDaysAhead: number
      }) {
        // hours of the day
        const userUnix = fromZonedTime(userNow, timezone).getTime()
        // const userUnix = userNow.getTime()

        for (let dayOffset = 0; dayOffset <= maxDaysAhead; dayOffset++) {
          let checkDay: Date | undefined = undefined

          if (dayOffset === 0) checkDay = startOfDay(userUnix)
          else checkDay = startOfDay(addDays(userUnix, dayOffset))

          for (const hour of SLOTS) {
            const slotUnix = startOfHour(setHours(checkDay, hour)).getTime()

            if (isAfter(slotUnix, userUnix) && isSpotEmpty(slotUnix)) {
              return slotUnix
            }
          }
        }

        return null // no slot found in next N days
      }

      const nextSlot = getNextAvailableSlot({ userNow, timezone, maxDaysAhead: 90 })

      if (!nextSlot) {
        throw new HTTPException(409, {
          message: 'Queue for the next 3 months is already full!',
        })
      }

      // const zoned = toZonedTime(nextSlot, timezone)
      // const scheduledUnix = zoned.getTime()

      const tweetId = crypto.randomUUID()

      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? 'https://sponge-relaxing-separately.ngrok-free.app'
          : getBaseUrl()

      const { messageId } = await qstash.publishJSON({
        url: baseUrl + '/api/tweet/post',
        body: { tweetId, userId: user.id, accountId: dbAccount.id, nextSlot },
        notBefore: nextSlot / 1000, // needs to be in seconds
      })

      try {
        const [tweet] = await db
          .insert(tweets)
          .values({
            id: tweetId,
            accountId: account.id,
            userId: user.id,
            content,
            isScheduled: true,
            scheduledFor: new Date(nextSlot),
            scheduledUnix: nextSlot,
            isQueued: true,
            media,
            qstashId: messageId,
          })
          .returning()
      } catch (err) {
        const messages = qstash.messages

        try {
          await messages.delete(messageId)
        } catch (err) {
          // fail silently
        }

        throw new HTTPException(500, { message: 'Problem with database' })
      }

      return c.json({
        success: true,
        tweetId,
        scheduledUnix: nextSlot,
        accountId: account.id,
        accountName: account.name,
      })
    }),

  get_queue: privateProcedure
    .input(
      z.object({
        userNow: z.date(),
        timezone: z.string(),
      }),
    )
    .query(async ({ c, input, ctx }) => {
      const { user } = ctx
      const { timezone, userNow } = input

      const today = startOfDay(userNow)

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      const _scheduledTweets = await db.query.tweets.findMany({
        where: and(eq(tweets.accountId, account.id), eq(tweets.isScheduled, true)),
        columns: {
          content: true,
          media: true,
          id: true,
          scheduledUnix: true,
          isPublished: true,
          isQueued: true,
        },
      })

      const scheduledTweets = await Promise.all(
        _scheduledTweets.map(async (tweet) => {
          const enrichedMedia = await fetchMediaFromS3(tweet.media || [])
          return {
            ...tweet,
            media: enrichedMedia,
          }
        }),
      )

      const getSlotTweet = (unix: number) => {
        const slotTweet = scheduledTweets.find((t) => t.scheduledUnix === unix)

        if (slotTweet) {
          return slotTweet
        }

        return null
      }

      const all: Array<Record<number, Array<number>>> = []

      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(today, i)

        const unixTimestamps = SLOTS.map((hour) => {
          const localDate = setHours(currentDay, hour)
          const utcDate = fromZonedTime(localDate, timezone)
          return utcDate.getTime()
        })

        all.push({ [currentDay.getTime()]: unixTimestamps })
      }

      const results: Array<
        Record<
          number,
          Array<{
            unix: number
            tweet: ReturnType<typeof getSlotTweet>
            isQueued: boolean
          }>
        >
      > = []

      all.forEach((day) => {
        const [dayUnix, timestamps] = Object.entries(day)[0]!

        const tweetsForThisDay = scheduledTweets.filter((t) =>
          isSameDay(t.scheduledUnix!, Number(dayUnix)),
        )

        const manualForThisDay = tweetsForThisDay.filter((t) => !Boolean(t.isQueued))

        const timezoneChanged = tweetsForThisDay.filter((t) => {
          return (
            !Boolean(timestamps.includes(t.scheduledUnix!)) &&
            !manualForThisDay.some((m) => m.id === t.id)
          )
        })

        results.push({
          [dayUnix]: [
            ...timestamps.map((timestamp) => ({
              unix: timestamp,
              tweet: getSlotTweet(timestamp),
              isQueued: true,
            })),
            ...manualForThisDay.map((tweet) => ({
              unix: tweet.scheduledUnix!,
              tweet,
              isQueued: false,
            })),
            ...timezoneChanged.map((tweet) => ({
              unix: tweet.scheduledUnix!,
              tweet,
              isQueued: false,
            })),
          ].sort((a, b) => a.unix - b.unix),
        })
      })

      // day (unix) -> times (unix)

      // for (let i = 0; i < 7; i++) {
      //   const currentDay = addDays(today, i)

      //   const unixTimestamps = slots.map((hour) => {
      //     const localDate = setHours(currentDay, hour)
      //     const utcDate = fromZonedTime(localDate, timezone)
      //     return utcDate.getTime()
      //   })

      //   results.push({
      //     [currentDay.getTime()]: unixTimestamps.map((unix) => ({
      //       unix,
      //       tweet: getSlotTweet(unix),
      //       isQueued: true,
      //     })),
      //   })
      // }

      return c.superjson({ results })
    }),

  getQueueSlots: privateProcedure
    .input(
      z.object({
        timezone: z.string(),
        startDate: z.string(), // ISO date string
        endDate: z.string(), // ISO date string
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { timezone, startDate, endDate } = input

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      // Get all scheduled tweets in the date range
      const scheduledTweets = await db.query.tweets.findMany({
        where: and(eq(tweets.accountId, account.id), eq(tweets.isScheduled, true)),
      })

      const tweetsWithMedia = await Promise.all(
        scheduledTweets.map(async (tweet) => {
          const enrichedMedia = await fetchMediaFromS3(tweet.media || [])
          return {
            ...tweet,
            media: enrichedMedia,
          }
        }),
      )

      // Generate all queue slots for the date range
      const slots: Array<{
        date: string
        time: string
        scheduledUnix: number
        displayTime: string
        tweet: (typeof tweetsWithMedia)[number] | undefined | null
        isQueueSlot: boolean
      }> = []

      const start = new Date(startDate)
      const end = new Date(endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        for (const hour of SLOTS) {
          // Create slot time in user's timezone
          const slotTime = new Date(d.toLocaleDateString('en-US', { timeZone: timezone }))
          slotTime.setHours(hour, 0, 0, 0)

          // Find tweet scheduled for this slot
          const tweet = tweetsWithMedia.find((t) => {
            if (!t.scheduledFor) return false
            const tweetTime = new Date(t.scheduledFor)
            const timeDiff = Math.abs(tweetTime.getTime() - slotTime.getTime())
            return timeDiff < 60000 // Within 1 minute = same slot
          })

          slots.push({
            date: d.toISOString().split('T')[0]!,
            time: `${hour.toString().padStart(2, '0')}:00`,
            scheduledUnix: Math.floor(slotTime.getTime() / 1000),
            displayTime: slotTime.toLocaleString('en-US', {
              timeZone: timezone,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            tweet: tweet || null,
            isQueueSlot: true,
          })
        }
      }

      // Add all other scheduled tweets (manual scheduling)
      tweetsWithMedia.forEach((tweet) => {
        if (!tweet.scheduledFor) return

        const tweetTime = new Date(tweet.scheduledFor)
        const tweetDate = tweetTime.toISOString().split('T')[0]

        // Check if it's already in a queue slot
        const isInQueueSlot = slots.some((slot) => {
          if (!tweet.scheduledFor) return false
          const timeDiff = Math.abs(
            new Date(tweet.scheduledFor).getTime() - slot.scheduledUnix * 1000,
          )
          return timeDiff < 60000
        })

        if (
          !isInQueueSlot &&
          tweetDate &&
          tweetDate >= startDate &&
          tweetDate <= endDate
        ) {
          slots.push({
            date: tweetDate,
            time: tweetTime.toTimeString().slice(0, 5),
            scheduledUnix: Math.floor(tweetTime.getTime() / 1000),
            displayTime: tweetTime.toLocaleString('en-US', {
              timeZone: timezone,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }),
            tweet,
            isQueueSlot: false,
          })
        }
      })

      // Sort by date and time
      slots.sort((a, b) => a.scheduledUnix - b.scheduledUnix)

      return c.json({ slots })
    }),

  getHandles: privateProcedure
    .input(
      z.object({
        query: z.string().min(1).max(15),
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { query } = input
      const { user } = ctx

      const cached = await redis.get<UserV2>(`cache:mention:${query}`)

      if (cached) {
        return c.json({ data: cached })
      }

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

      const consumerKey = 'dtcZgPjt85VKEe4XrxhmTs0n5'
      const consumerSecret = 'dSWDC5M4kROfyQPpiQiZDs5Y8eT8IWTUZ9HHBP6p0T15Iy6xk1'

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: dbAccount.accessToken as string,
        accessSecret: dbAccount.accessSecret as string,
      })

      const { data } = await client.v2.userByUsername(query.replaceAll('@', ''), {
        'user.fields': ['profile_image_url'],
      })

      if (data) {
        waitUntil(redis.set(`cache:mention:${query}`, data))
      }

      return c.json({ data })
    }),
})
