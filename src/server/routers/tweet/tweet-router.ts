import { getBaseUrl } from '@/constants/base-url'
import { db } from '@/db'
import { account as accountSchema, InsertTweet, tweets } from '@/db/schema'
import { qstash } from '@/lib/qstash'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { addDays, isFuture, isSameDay, setHours, startOfDay, startOfHour } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure, qstashProcedure } from '../../jstack'
import { getAccount } from '../utils/get-account'
import { fetchMediaFromS3 } from './fetch-media-from-s3'
import { postThreadToTwitter } from './posting-utils'
import { getNextAvailableQueueSlot } from './queue-utils'

const consumerKey = process.env.TWITTER_CONSUMER_KEY as string
const consumerSecret = process.env.TWITTER_CONSUMER_SECRET as string

const SLOTS = [10, 12, 14]

const payloadTweetSchema = z.object({
  id: z.string(),
  index: z.number(),
  content: z.string(),
  media: z.array(
    z.object({
      media_id: z.string(),
      s3Key: z.string(),
    }),
  ),
})

export const tweetRouter = j.router({
  getThread: privateProcedure
    .input(z.object({ baseTweetId: z.string() }))
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { baseTweetId } = input

      const account = await getAccount({ email: user.email })

      if (!account) {
        throw new HTTPException(400, {
          message: 'No account found',
        })
      }

      const tweet = await db.query.tweets.findFirst({
        where: and(
          eq(tweets.id, baseTweetId),
          eq(tweets.userId, user.id),
          eq(tweets.accountId, account.id),
        ),
      })

      if (!tweet) {
        return c.superjson({ tweet: null, thread: [] })
      }

      const activeAccount = await getAccount({ email: user.email })

      if (!activeAccount) {
        throw new HTTPException(400, {
          message: 'No active account found',
        })
      }

      let currentTweet = tweet

      // Walk backwards to find the base tweet
      while (currentTweet.isReplyTo) {
        const parentTweet = await db.query.tweets.findFirst({
          where: and(
            eq(tweets.id, currentTweet.isReplyTo),
            eq(tweets.userId, user.id),
            eq(tweets.accountId, activeAccount.id),
          ),
        })
        if (!parentTweet) break
        currentTweet = parentTweet
      }

      // Now build the complete thread from the base tweet
      const thread = []
      const baseTweet = await db.query.tweets.findFirst({
        where: and(
          eq(tweets.id, baseTweetId),
          eq(tweets.userId, user.id),
          eq(tweets.accountId, activeAccount.id),
        ),
      })

      if (baseTweet) {
        thread.push(baseTweet)

        // Find all replies in order
        let currentId = baseTweetId
        while (true) {
          const nextTweet = await db.query.tweets.findFirst({
            where: and(
              eq(tweets.isReplyTo, currentId),
              eq(tweets.userId, user.id),
              eq(tweets.accountId, activeAccount.id),
            ),
          })
          if (!nextTweet) break
          thread.push(nextTweet)
          currentId = nextTweet.id
        }
      }

      // Fetch media URLs for each tweet in the thread
      const threadWithMedia = await Promise.all(
        thread.map(async (threadTweet) => {
          const enrichedMedia = await fetchMediaFromS3(threadTweet.media || [])
          return {
            ...threadTweet,
            media: enrichedMedia,
          }
        }),
      )

      return c.superjson({ thread: threadWithMedia })
    }),

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

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: account.accessToken as string,
        accessSecret: account.accessSecret as string,
      })

      const mediaUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`
      const response = await fetch(mediaUrl)

      if (!response.ok) {
        throw new HTTPException(400, { message: 'Failed to fetch media from S3' })
      }

      const buffer = await response.arrayBuffer()

      let mimeType: string

      switch (mediaType) {
        case 'image':
          mimeType = response.headers.get('content-type') || 'image/png'
          break
        case 'gif':
          mimeType = 'image/gif'
          break
        case 'video':
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

      const messages = qstash.messages

      if (tweet.qstashId) {
        await messages.delete(tweet.qstashId).catch(() => {})
      }

      await db.delete(tweets).where(and(eq(tweets.id, id), eq(tweets.userId, user.id)))

      return c.json({ success: true })
    }),

  update: privateProcedure
    .input(
      z.object({
        baseTweetId: z.string(),
        scheduledUnix: z.number(),
        thread: z.array(payloadTweetSchema).min(1),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { baseTweetId, scheduledUnix, thread } = input

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

      // Get the existing base tweet to find the thread
      const existingBaseTweet = await db.query.tweets.findFirst({
        where: and(eq(tweets.id, baseTweetId), eq(tweets.userId, user.id)),
      })

      if (!existingBaseTweet) {
        throw new HTTPException(404, { message: 'Tweet not found' })
      }

      if (existingBaseTweet.qstashId) {
        await qstash.messages.delete(existingBaseTweet.qstashId)
      }

      // delete all current

      const deleteTweet = async (id: string) => {
        const [deletedTweet] = await db
          .delete(tweets)
          .where(
            and(
              eq(tweets.userId, user.id),
              eq(tweets.accountId, account.id),
              eq(tweets.id, id),
            ),
          )
          .returning()

        if (deletedTweet) {
          const [next] = await db
            .select()
            .from(tweets)
            .where(
              and(
                eq(tweets.userId, user.id),
                eq(tweets.accountId, account.id),
                eq(tweets.isReplyTo, deletedTweet.id),
              ),
            )

          if (next) deleteTweet(next.id)
        }
      }

      await deleteTweet(baseTweetId)

      const newBaseTweetId = crypto.randomUUID()

      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? 'https://sponge-relaxing-separately.ngrok-free.app'
          : getBaseUrl()

      // new schedule job
      const { messageId } = await qstash.publishJSON({
        url: baseUrl + '/api/tweet/post',
        body: { tweetId: newBaseTweetId, userId: user.id, accountId: dbAccount.id },
        notBefore: scheduledUnix,
      })

      // new tweets
      const generatedIds = thread.map((_, i) =>
        i === 0 ? newBaseTweetId : crypto.randomUUID(),
      )

      const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
        id: generatedIds[i],
        accountId: account.id,
        userId: user.id,
        content: tweet.content,
        isScheduled: true,
        scheduledFor: new Date(scheduledUnix * 1000),
        scheduledUnix: scheduledUnix * 1000,
        isQueued: existingBaseTweet.isQueued,
        media: tweet.media,
        qstashId: messageId,
        isReplyTo: i === 0 ? undefined : generatedIds[i - 1],
      }))

      await db.insert(tweets).values(tweetsToInsert)

      return c.json({
        success: true,
        accountId: account.id,
        accountName: account.name,
      })
    }),

  schedule: privateProcedure
    .input(
      z.object({
        thread: z.array(payloadTweetSchema).min(1),
        scheduledUnix: z.number(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { thread, scheduledUnix } = input

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

      try {
        const generatedIds = thread.map((_, i) =>
          i === 0 ? tweetId : crypto.randomUUID(),
        )

        const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
          id: generatedIds[i],
          accountId: account.id,
          userId: user.id,
          content: tweet.content,
          scheduledFor: new Date(scheduledUnix * 1000),
          scheduledUnix: scheduledUnix * 1000,

          isScheduled: true,
          isQueued: false,

          media: tweet.media,
          qstashId: messageId,
          isReplyTo: i === 0 ? undefined : generatedIds[i - 1],
        }))

        await db.insert(tweets).values(tweetsToInsert)
      } catch (err) {
        console.error(err)

        const messages = qstash.messages

        await messages.delete(messageId).catch(() => {})

        throw new HTTPException(500, { message: 'Failed to schedule tweets' })
      }

      return c.json({
        success: true,
        tweetId,
        accountId: account.id,
        accountName: account.name,
      })
    }),

  post: qstashProcedure.post(async ({ c, ctx }) => {
    const { body } = ctx

    const { tweetId, userId, accountId } = body as {
      tweetId: string
      userId: string
      accountId: string
    }

    const baseTweet = await db.query.tweets.findFirst({
      where: eq(tweets.id, tweetId),
    })

    if (!baseTweet) {
      throw new HTTPException(404, { message: 'Tweet not found' })
    }

    if (baseTweet.isPublished) {
      return c.json({ success: true })
    }

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

    const client = new TwitterApi({
      appKey: consumerKey as string,
      appSecret: consumerSecret as string,
      accessToken: account.accessToken as string,
      accessSecret: account.accessSecret as string,
    })

    const { baseTweetId, allTweetIds } = await postThreadToTwitter(
      client,
      baseTweet,
      account.id,
    )

    return c.json({ success: true, baseTweetId, allTweetIds })
  }),

  postImmediateFromQueue: privateProcedure
    .input(
      z.object({
        tweetId: z.string(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { tweetId } = input

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
          message: 'Account not found',
        })
      }

      const [tweet] = await db
        .select()
        .from(tweets)
        .where(
          and(
            eq(tweets.id, tweetId),
            eq(tweets.userId, user.id),
            eq(tweets.accountId, account.id),
            eq(tweets.isScheduled, true),
            eq(tweets.isPublished, false),
          ),
        )

      if (!tweet) {
        throw new HTTPException(404, { message: 'Tweet not found' })
      }

      if (tweet.qstashId) {
        const messages = qstash.messages
        try {
          await messages.delete(tweet.qstashId)
        } catch (err) {
          throw new HTTPException(500, {
            message: 'Failed to cancel existing scheduled tweet',
          })
        }
      } else {
        throw new HTTPException(400, { message: 'Tweet is not scheduled' })
      }

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: dbAccount.accessToken as string,
        accessSecret: dbAccount.accessSecret as string,
      })

      try {
        const { baseTweetId, allTweetIds } = await postThreadToTwitter(
          client,
          tweet,
          account.id,
        )

        return c.json({
          success: true,
          tweetId: baseTweetId,
          accountId: account.id,
          accountName: account.name, // Display name of the twitter (x) user, do not use for tweet urls
          accountUsername: account.username, // Username of the twitter (x) user, use for correct tweet urls
          allTweetIds, // Include all tweet IDs in the thread for frontend use
        })
      } catch (err) {
        console.error('Failed to post tweet:', err)

        if (err instanceof HTTPException) {
          throw new HTTPException(err.status, { message: err.message })
        }

        throw new HTTPException(500, {
          message: 'Failed to post tweet to Twitter',
        })
      }
    }),

  postImmediate: privateProcedure
    .input(
      z.object({
        thread: z.array(payloadTweetSchema).min(1),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { thread } = input

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

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: dbAccount.accessToken as string,
        accessSecret: dbAccount.accessSecret as string,
      })

      try {
        const generatedIds = thread.map(() => crypto.randomUUID())

        // First create all tweets in the database with proper threading structure
        const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
          id: generatedIds[i],
          accountId: account.id,
          userId: user.id,
          content: tweet.content,
          media: tweet.media,
          isScheduled: false,
          isPublished: false, // Will be set to true when posted
          isReplyTo: i === 0 ? undefined : generatedIds[i - 1],
        }))

        await db.insert(tweets).values(tweetsToInsert)

        // Get the base tweet and post the thread
        const firstTweetId = generatedIds[0]!
        const baseTweet = await db.query.tweets.findFirst({
          where: eq(tweets.id, firstTweetId),
        })

        if (!baseTweet) {
          throw new HTTPException(500, { message: 'Failed to create base tweet' })
        }

        const { baseTweetId, allTweetIds } = await postThreadToTwitter(
          client,
          baseTweet,
          account.id,
        )

        return c.json({
          success: true,
          tweetId: baseTweetId,
          accountId: account.id,
          accountName: account.name, // Display name of the twitter (x) user, do not use for tweet urls
          accountUsername: account.username, // Username of the twitter (x) user, use for correct tweet urls
          allTweetIds, // Include all tweet IDs in the thread for frontend use
        })
      } catch (err) {
        console.error('Failed to post tweet:', err)

        if (err instanceof HTTPException) {
          throw new HTTPException(err.status, { message: err.message })
        }

        throw new HTTPException(500, {
          message: 'Failed to post tweet to Twitter',
        })
      }
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

  enqueue_tweet: privateProcedure
    .input(
      z.object({
        userNow: z.date(),
        timezone: z.string(),
        thread: z.array(payloadTweetSchema).min(1),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { userNow, timezone, thread } = input

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

      const nextSlot = await getNextAvailableQueueSlot({
        userId: user.id,
        accountId: account.id,
        userNow,
        timezone,
        maxDaysAhead: 90,
      })

      if (!nextSlot) {
        throw new HTTPException(409, {
          message: 'Queue for the next 3 months is already full!',
        })
      }

      const scheduledUnix = nextSlot.getTime()

      const baseTweetId = crypto.randomUUID()

      const baseUrl =
        process.env.NODE_ENV === 'development'
          ? 'https://sponge-relaxing-separately.ngrok-free.app'
          : getBaseUrl()

      const { messageId } = await qstash.publishJSON({
        url: baseUrl + '/api/tweet/post',
        body: {
          tweetId: baseTweetId,
          userId: user.id,
          accountId: dbAccount.id,
          scheduledUnix,
        },
        notBefore: scheduledUnix / 1000, // in seconds
      })

      try {
        const generatedIds = thread.map((_, i) =>
          i === 0 ? baseTweetId : crypto.randomUUID(),
        )

        const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
          id: generatedIds[i],
          accountId: account.id,
          userId: user.id,
          content: tweet.content,
          scheduledFor: new Date(scheduledUnix),
          scheduledUnix: scheduledUnix,

          isScheduled: true,
          isQueued: true,

          media: tweet.media,
          qstashId: messageId,
          isReplyTo: i === 0 ? undefined : generatedIds[i - 1],
        }))

        await db.insert(tweets).values(tweetsToInsert)
      } catch (err) {
        console.error(err)

        const messages = qstash.messages

        await messages.delete(messageId)

        throw new HTTPException(500, {
          message: 'Failed to enqueue tweets',
        })
      }

      return c.json({
        success: true,
        tweetId: baseTweetId,
        scheduledUnix: scheduledUnix,
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

      // Group tweets into threads
      const buildThread = (baseTweetId: string): typeof scheduledTweets => {
        const thread = []
        const baseTweet = scheduledTweets.find((t) => t.id === baseTweetId)
        if (!baseTweet) return []

        thread.push(baseTweet)

        // Find all replies in order
        let currentId = baseTweetId
        while (true) {
          const nextTweet = scheduledTweets.find((t) => t.isReplyTo === currentId)
          if (!nextTweet) break
          thread.push(nextTweet)
          currentId = nextTweet.id
        }

        return thread
      }

      const getSlotThread = (unix: number) => {
        const baseTweet = scheduledTweets.find(
          (t) => Boolean(t.isQueued) && t.scheduledUnix === unix && !t.isReplyTo,
        )

        if (baseTweet) {
          return buildThread(baseTweet.id)
        }

        return null
      }

      const all: Array<Record<number, Array<number>>> = []

      for (let i = 0; i < 7; i++) {
        const currentDay = addDays(today, i)

        const unixTimestamps = SLOTS.map((hour) => {
          const localDate = startOfHour(setHours(currentDay, hour))
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
            thread: ReturnType<typeof getSlotThread>
            isQueued: boolean
          }>
        >
      > = []

      all.forEach((day) => {
        const [dayUnix, timestamps] = Object.entries(day)[0]!

        // Get only base tweets for this day (threads start with base tweets)
        const baseTweetsForThisDay = scheduledTweets.filter(
          (t) => isSameDay(t.scheduledUnix!, Number(dayUnix)) && !Boolean(t.isReplyTo),
        )

        const manualBaseTweetsForThisDay = baseTweetsForThisDay.filter(
          (t) => !Boolean(t.isQueued),
        )

        const timezoneChangedBaseTweets = baseTweetsForThisDay.filter((t) => {
          return (
            !Boolean(timestamps.includes(t.scheduledUnix!)) &&
            !manualBaseTweetsForThisDay.some((m) => m.id === t.id)
          )
        })

        results.push({
          [dayUnix]: [
            ...timestamps.map((timestamp) => ({
              unix: timestamp,
              thread: getSlotThread(timestamp),
              isQueued: true,
            })),
            ...manualBaseTweetsForThisDay.map((tweet) => ({
              unix: tweet.scheduledUnix!,
              thread: buildThread(tweet.id),
              isQueued: false,
            })),
            ...timezoneChangedBaseTweets.map((tweet) => ({
              unix: tweet.scheduledUnix!,
              thread: buildThread(tweet.id),
              isQueued: false,
            })),
          ]
            .sort((a, b) => a.unix - b.unix)
            .filter((entry) => isFuture(entry.unix)),
        })
      })

      return c.superjson({ results })
    }),

  getNextQueueSlotV2: privateProcedure
    .input(
      z.object({
        userNow: z.date(),
        timezone: z.string(),
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { userNow, timezone } = input

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      const nextSlot = await getNextAvailableQueueSlot({
        userId: user.id,
        accountId: account.id,
        userNow,
        timezone,
        maxDaysAhead: 90,
      })

      if (!nextSlot) {
        throw new HTTPException(409, {
          message: `Queue for the next 3 months is already full!`,
        })
      }

      return c.json({
        scheduledUnix: nextSlot.getTime(),
        scheduledDate: nextSlot.toISOString(),
      })
    }),
})
