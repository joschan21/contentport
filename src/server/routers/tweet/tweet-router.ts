import { getBaseUrl } from '@/constants/base-url'
import { db } from '@/db'
import {
  account as accountSchema,
  InsertTweet,
  tweetPropertyEnum,
  tweets,
  user as userSchema,
} from '@/db/schema'
import { qstash } from '@/lib/qstash'
import { redis } from '@/lib/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { waitUntil } from '@vercel/functions'
import { addDays, isFuture, isSameDay, setHours, startOfDay, startOfHour } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { and, desc, eq, isNotNull, isNull, lte, or, gt, gte } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { ApiResponseError, SendTweetV2Params, TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { ZodError } from 'zod/v4'
import { j, privateProcedure, qstashProcedure } from '../../jstack'
import { getAccount } from '../utils/get-account'
import { ensureValidMedia } from '../utils/upload-media-to-twitter'
import { fetchMediaFromS3 } from './fetch-media-from-s3'

import {
  getNextAvailableQueueSlot,
  applyNaturalPostingTime,
  getAccountQueueSettings,
} from './queue-utils'
import { vector } from '@/lib/vector'
import { getScheduledTweetCount } from '../utils/get-scheduled-tweet-count'
import { realtime } from '@/lib/realtime'

const consumerKey = process.env.TWITTER_CONSUMER_KEY as string
const consumerSecret = process.env.TWITTER_CONSUMER_SECRET as string

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

const postWithQStashSchema = z.object({
  tweetId: z.string(),
  userId: z.string(),
  accountId: z.string(),
  replyToTwitterId: z.string().optional(),
  quoteToTwitterId: z.string().optional(),
  scheduledUnixInSeconds: z.number().optional(),
  useNaturalTime: z.boolean().optional(),
  useAutoDelay: z.boolean().optional(),
  threadIndex: z.number().optional(),
  delay: z.number().optional(),
  channelName: z.string().optional(),
})

type PostWithQStashArgs = z.infer<typeof postWithQStashSchema>

const postWithQStash = async (args: PostWithQStashArgs) => {
  const {
    accountId,
    tweetId,
    userId,
    replyToTwitterId,
    scheduledUnixInSeconds,
    quoteToTwitterId,
    useNaturalTime,
    useAutoDelay,
    threadIndex,
    delay,
    channelName,
  } = args

  const baseUrl =
    process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

  const payload: PostWithQStashArgs = {
    tweetId,
    userId,
    accountId,
    replyToTwitterId,
    quoteToTwitterId,
    scheduledUnixInSeconds,
    useNaturalTime,
    useAutoDelay,
    threadIndex,
    delay,
    channelName,
  }

  // if natural time enabled, we call qstash 5 mins before the scheduled time
  // in that call, we calculate the natural time and do the same call again
  const CALL_BEFORE_SECONDS = useNaturalTime ? 5 * 60 : 0

  if (useNaturalTime && scheduledUnixInSeconds) {
    const { messageId } = await qstash.publishJSON({
      url: baseUrl + '/api/tweet/apply_natural_posting_time',
      body: payload,
      notBefore: scheduledUnixInSeconds - CALL_BEFORE_SECONDS,
      retries: 2,
      failureCallback: baseUrl + '/api/tweet/post_with_qstash_error',
    })

    return { messageId }
  }

  const { messageId } = await qstash.publishJSON({
    url: baseUrl + '/api/tweet/post_with_qstash',
    body: payload,
    notBefore: scheduledUnixInSeconds,
    retries: 2,
    failureCallback: baseUrl + '/api/tweet/post_with_qstash_error',
    delay,
  })

  return { messageId }
}

export const tweetRouter = j.router({
  get_scheduled_count: privateProcedure.get(async ({ c, ctx, input }) => {
    const { user } = ctx
    const account = await getAccount({ email: user.email })
    if (!account) {
      throw new HTTPException(400, {
        message: 'No account found',
      })
    }
    const scheduledTweetsCount = await getScheduledTweetCount(user.id)

    return c.json({ count: scheduledTweetsCount })
  }),

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

      let currentTweet = tweet

      // Walk backwards to find the base tweet
      while (currentTweet.isReplyTo) {
        const parentTweet = await db.query.tweets.findFirst({
          where: and(
            eq(tweets.id, currentTweet.isReplyTo),
            eq(tweets.userId, user.id),
            eq(tweets.accountId, account.id),
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
          eq(tweets.accountId, account.id),
        ),
      })

      if (baseTweet) {
        thread.push(baseTweet)

        let currentId = baseTweetId
        while (true) {
          const nextTweet = await db.query.tweets.findFirst({
            where: and(
              eq(tweets.isReplyTo, currentId),
              eq(tweets.userId, user.id),
              eq(tweets.accountId, account.id),
            ),
          })
          if (!nextTweet) break
          thread.push(nextTweet)
          currentId = nextTweet.id
        }
      }

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

      const tweetsToDelete = [tweet]
      const qstashIdsToDelete = tweet.qstashId ? [tweet.qstashId] : []

      let currentId = id
      while (true) {
        const reply = await db.query.tweets.findFirst({
          where: and(eq(tweets.isReplyTo, currentId), eq(tweets.userId, user.id)),
        })
        if (!reply) break
        tweetsToDelete.push(reply)
        if (reply.qstashId) {
          qstashIdsToDelete.push(reply.qstashId)
        }
        currentId = reply.id
      }

      await Promise.all(
        qstashIdsToDelete.map((qstashId) => messages.delete(qstashId).catch(() => {})),
      )

      for (const tweetToDelete of tweetsToDelete) {
        await db
          .delete(tweets)
          .where(and(eq(tweets.id, tweetToDelete.id), eq(tweets.userId, user.id)))
      }

      return c.json({ success: true })
    }),

  update: privateProcedure
    .input(
      z.object({
        baseTweetId: z.string(),
        scheduledUnix: z.number(),
        thread: z.array(payloadTweetSchema).min(1),
        useNaturalTime: z.boolean().optional(),
        useAutoDelay: z.boolean().optional(),
        timezone: z.string().optional(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const {
        baseTweetId,
        scheduledUnix,
        thread,
        useNaturalTime,
        useAutoDelay,
        timezone,
      } = input

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

      const existingBaseTweet = await db.query.tweets.findFirst({
        where: and(eq(tweets.id, baseTweetId), eq(tweets.userId, user.id)),
      })

      if (!existingBaseTweet) {
        throw new HTTPException(404, { message: 'Tweet not found' })
      }

      if (existingBaseTweet.qstashId) {
        await qstash.messages.delete(existingBaseTweet.qstashId)
      }

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

          if (next) await deleteTweet(next.id)
        }
      }

      await deleteTweet(baseTweetId)

      const newBaseTweetId = crypto.randomUUID()

      const { messageId } = await postWithQStash({
        accountId: dbAccount.id,
        tweetId: newBaseTweetId,
        userId: user.id,
        scheduledUnixInSeconds: scheduledUnix / 1000,
        useNaturalTime,
        useAutoDelay,
        threadIndex: 0,
      })

      const generatedIds = thread.map((_, i) =>
        i === 0 ? newBaseTweetId : crypto.randomUUID(),
      )

      let isQueued = false
      if (timezone) {
        const queueSettings = await getAccountQueueSettings(account.id)
        const scheduledDate = new Date(scheduledUnix)
        const scheduledDayOfWeek = scheduledDate.getDay()
        const slotsForDay = queueSettings[scheduledDayOfWeek.toString()] || []

        isQueued = slotsForDay.some((slotMinutes: number) => {
          const slotDate = new Date(scheduledDate)
          slotDate.setHours(Math.floor(slotMinutes / 60), slotMinutes % 60, 0, 0)
          return slotDate.getTime() === scheduledUnix
        })
      }

      const isNaturalTimeEnabled = Boolean(
        useNaturalTime ?? account.useNaturalTimeByDefault,
      )

      const isAutoDelayEnabled = Boolean(useAutoDelay ?? account.useAutoDelayByDefault)

      const properties: (typeof tweetPropertyEnum.enumValues)[number][] = []
      if (isNaturalTimeEnabled) properties.push('natural')
      if (isAutoDelayEnabled) properties.push('auto-delay')

      const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
        id: generatedIds[i],
        accountId: account.id,
        userId: user.id,
        content: tweet.content,

        isScheduled: true,
        scheduledUnix: scheduledUnix,
        isQueued,
        properties,

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
        useNaturalTime: z.boolean().optional(),
        useAutoDelay: z.boolean().optional(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { thread, scheduledUnix, useNaturalTime, useAutoDelay } = input

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
        const currentScheduledCount = await getScheduledTweetCount(user.id)
        if (currentScheduledCount >= 3) {
          throw new HTTPException(402, {
            message:
              'Free plan scheduling limit reached. You can only have 3 scheduled posts at a time. Upgrade to Pro to schedule unlimited tweets.',
          })
        }
      }

      const tweetId = crypto.randomUUID()

      const isNaturalTimeEnabled = Boolean(
        useNaturalTime ?? account.useNaturalTimeByDefault,
      )

      const isAutoDelayEnabled = Boolean(useAutoDelay ?? account.useAutoDelayByDefault)

      const { messageId } = await postWithQStash({
        tweetId,
        userId: user.id,
        accountId: dbAccount.id,
        scheduledUnixInSeconds: scheduledUnix / 1000,
        useNaturalTime: isNaturalTimeEnabled,
        useAutoDelay: isAutoDelayEnabled,
      })

      try {
        const generatedIds = thread.map((_, i) =>
          i === 0 ? tweetId : crypto.randomUUID(),
        )

        const properties: (typeof tweetPropertyEnum.enumValues)[number][] = []
        if (isNaturalTimeEnabled) properties.push('natural')
        if (isAutoDelayEnabled) properties.push('auto-delay')

        const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
          id: generatedIds[i],
          accountId: account.id,
          userId: user.id,
          content: tweet.content,
          scheduledUnix: scheduledUnix,

          isScheduled: true,
          isQueued: false,
          properties,

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

  post_status: privateProcedure
    .input(
      z.object({
        messageId: z.string(),
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { messageId } = input

      const status = await db.query.tweets.findFirst({
        where: and(eq(tweets.qstashId, messageId)),
        columns: {
          isPublished: true,
          isScheduled: true,
          isError: true,
          twitterId: true,
          errorMessage: true,
        },
      })

      if (!status) {
        throw new HTTPException(404, { message: 'not found' })
      }

      return c.json(status)
    }),

  post_with_qstash_error: qstashProcedure.post(async ({ c, ctx, input }) => {
    const { body } = ctx
    const sourceBody = body.sourceBody

    const decodedBody = Buffer.from(sourceBody, 'base64').toString('utf-8')

    const parsedBody = JSON.parse(decodedBody)

    const { tweetId, userId, accountId } = postWithQStashSchema.parse(parsedBody)

    await db
      .update(tweets)
      .set({ isError: true, isProcessing: false })
      .where(
        and(
          eq(tweets.id, tweetId),
          eq(tweets.userId, userId),
          eq(tweets.accountId, accountId),
        ),
      )

    return c.json({ success: true })
  }),

  apply_natural_posting_time: qstashProcedure.post(async ({ c, ctx }) => {
    const { body } = ctx
    const { tweetId, userId, accountId } = postWithQStashSchema.parse(body)

    const tweet = await db.query.tweets.findFirst({
      where: and(
        eq(tweets.id, tweetId),
        eq(tweets.userId, userId),
        eq(tweets.accountId, accountId),
      ),
    })

    if (!tweet) {
      throw new HTTPException(404, { message: 'Tweet not found' })
    }

    if (!tweet.scheduledUnix) {
      throw new HTTPException(400, { message: 'Tweet scheduled unix not found' })
    }

    const naturalScheduledUnix = applyNaturalPostingTime(tweet.scheduledUnix)
    const naturalScheduledUnixInSeconds = naturalScheduledUnix / 1000

    const url =
      process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

    const { messageId } = await qstash.publishJSON({
      url: url + '/api/tweet/post_with_qstash',
      body,
      notBefore: naturalScheduledUnixInSeconds,
      retries: 2,
      failureCallback: url + '/api/tweet/post_with_qstash_error',
    })

    await db.update(tweets).set({ qstashId: messageId }).where(eq(tweets.id, tweetId))

    return c.json({ success: true, naturalScheduledUnixInSeconds })
  }),

  post_with_qstash: qstashProcedure.post(async ({ c, ctx }) => {
    const { body } = ctx
    const messageId = c.req.header('upstash-message-id')

    const {
      tweetId,
      userId,
      accountId,
      replyToTwitterId,
      quoteToTwitterId,
      useAutoDelay,
      channelName,
    } = postWithQStashSchema.parse(body)

    try {
      if (channelName) {
        await realtime.channel(channelName).tweet.status.emit({
          id: tweetId,
          status: 'started',
        })
      }

      const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId))

      if (!user) {
        console.error('User not found', { userId })
        throw new HTTPException(404, { message: 'User not found' })
      }

      const [tweet] = await db
        .select()
        .from(tweets)
        .where(
          and(
            eq(tweets.id, tweetId),
            eq(tweets.userId, userId),
            eq(tweets.accountId, accountId),
          ),
        )

      if (!tweet) {
        console.error('Tweet not found', { tweetId, userId, accountId })
        throw new HTTPException(404, { message: 'Tweet not found' })
      }

      if (tweet.isPublished) {
        console.error('Tweet already published', { tweetId, userId, accountId })
        throw new HTTPException(409, {
          message: `Tweet with id '${tweetId}' is already published, aborting`,
        })
      }

      const dbAccount = await db.query.account.findFirst({
        where: and(eq(accountSchema.userId, userId), eq(accountSchema.id, accountId)),
      })

      const account = await getAccount({
        email: user.email,
      })

      if (!account || !dbAccount || !dbAccount.accessToken) {
        console.error('Account not found', { tweetId, userId, accountId })
        throw new HTTPException(400, {
          message: 'Twitter account not connected or access token missing',
        })
      }

      await db
        .update(tweets)
        .set({ isProcessing: true, updatedAt: new Date() })
        .where(
          and(
            eq(tweets.id, tweetId),
            eq(tweets.userId, userId),
            eq(tweets.accountId, accountId),
          ),
        )

      const client = new TwitterApi({
        appKey: consumerKey as string,
        appSecret: consumerSecret as string,
        accessToken: dbAccount.accessToken as string,
        accessSecret: dbAccount.accessSecret as string,
      })

      const payload: Partial<SendTweetV2Params> = {
        text: tweet.content,
      }

      if (tweet.media && tweet.media.length > 0) {
        const validatedMedia = await ensureValidMedia({
          account: dbAccount,
          mediaItems: tweet.media.slice(0, 4),
        })

        const validMediaIds = validatedMedia
          .map((media) => media.media_id)
          .filter(Boolean)

        if (validMediaIds.length > 0) {
          // @ts-expect-error max-4 length tuple
          payload.media = { media_ids: validMediaIds }
        }

        await db
          .update(tweets)
          .set({ media: validatedMedia, updatedAt: new Date() })
          .where(
            and(
              eq(tweets.id, tweetId),
              eq(tweets.userId, userId),
              eq(tweets.accountId, accountId),
            ),
          )
      }

      if (replyToTwitterId) {
        payload.reply = {
          in_reply_to_tweet_id: replyToTwitterId,
        }
      }

      if (quoteToTwitterId) {
        payload.quote_tweet_id = quoteToTwitterId
      }

      const res = await client.v2.tweet(payload)

      if (res.errors && res.errors.length > 0) {
        const first = res.errors[0]!

        throw new HTTPException(500, { message: first.detail })
      }

      const [updatedTweet] = await db
        .update(tweets)
        .set({
          twitterId: res.data.id,
          isQueued: false,
          isPublished: true,
          isProcessing: false,
          isScheduled: false,
          isError: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tweets.id, tweetId),
            eq(tweets.userId, userId),
            eq(tweets.accountId, accountId),
          ),
        )
        .returning()

      if (!tweet.isReplyTo && updatedTweet && updatedTweet.twitterId) {
        await redis.sadd(`posts:${accountId}`, updatedTweet.twitterId)
        await vector.namespace(accountId).upsert({
          id: updatedTweet.twitterId,
          data: updatedTweet.content,
          metadata: {
            replyIds: [],
            isReply: Boolean(replyToTwitterId),
            isQuote: Boolean(quoteToTwitterId),
          },
        })
      }

      const next = await db.query.tweets.findFirst({
        where: and(
          eq(tweets.isReplyTo, tweet.id),
          eq(tweets.accountId, accountId),
          eq(tweets.userId, userId),
          eq(tweets.isPublished, false),
        ),
      })

      if (channelName) {
        await Promise.all([
          realtime.channel(channelName).tweet.status.emit({
            id: tweetId,
            status: 'success',
            tweetId: res.data.id,
          }),
          next
            ? realtime.channel(channelName).tweet.status.emit({
                id: next.id,
                status: useAutoDelay ? 'waiting' : 'started',
                timestamp: useAutoDelay ? Date.now() : undefined,
              })
            : Promise.resolve(),
        ])
      }

      if (next) {
        await postWithQStash({
          tweetId: next.id,
          accountId: next.accountId,
          userId: next.userId,
          replyToTwitterId: res.data.id,
          useAutoDelay,
          delay: useAutoDelay && next.isReplyTo ? 60 : 0,
          channelName,
        })
      }

      return c.json({ success: true, tweetId: res.data.id, next })
    } catch (err) {
      console.error('[POST_WITH_QSTASH_ERROR]: ', JSON.stringify(err, null, 2))

      await redis.set(
        `error:debug:${messageId}-${new Date().getTime().toString()}`,
        JSON.stringify({ error: err }),
      )

      const updateWithErrorMessage = async (errorMessage: string) => {
        await db
          .update(tweets)
          .set({ isError: true, isProcessing: false, errorMessage })
          .where(
            and(
              eq(tweets.id, tweetId),
              eq(tweets.userId, userId),
              eq(tweets.accountId, accountId),
            ),
          )
      }

      let message = 'Internal server error'
      let statusCode: ContentfulStatusCode = 500

      if (err instanceof HTTPException) {
        message = err.message
        statusCode = err.status
        if (err.status.toString().startsWith('4')) {
          await updateWithErrorMessage(message)
        }
      } else if (err instanceof ApiResponseError) {
        message = err.data?.detail ?? err.message ?? 'Unknown Twitter API error'
        statusCode = err.code as ContentfulStatusCode
        if (err.code.toString().startsWith('4')) {
          await updateWithErrorMessage(message)
        }
      } else if (err instanceof ZodError) {
        message = 'Invalid request data'
        statusCode = 400
        await updateWithErrorMessage(message)
      } else if (err instanceof Error) {
        message = err.message || 'Internal server error'
        await updateWithErrorMessage(message)
      } else {
        message = 'An unexpected error occurred'
        await updateWithErrorMessage(message)
      }

      if (channelName) {
        await realtime.channel(channelName).tweet.status.emit({
          id: tweetId,
          status: 'error',
        })
      }

      throw new HTTPException(statusCode, { message, cause: err })
    }
  }),

  postImmediateFromQueue: privateProcedure
    .input(
      z.object({
        baseTweetId: z.string(),
        useAutoDelay: z.boolean().optional(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { baseTweetId, useAutoDelay } = input

      const channelName = user.id + '-' + baseTweetId
      const channel = realtime.channel(channelName)

      try {
        await channel.tweet.status.emit({
          id: baseTweetId,
          status: 'pending',
        })

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

        const [baseTweet] = await db
          .select()
          .from(tweets)
          .where(
            and(
              eq(tweets.id, baseTweetId),
              eq(tweets.userId, user.id),
              eq(tweets.accountId, account.id),
              eq(tweets.isScheduled, true),
              eq(tweets.isPublished, false),
            ),
          )

        if (!baseTweet) {
          throw new HTTPException(404, { message: 'Tweet not found' })
        }

        let hasExpiredMedia = false

        if (baseTweet.media && baseTweet.media.length > 0) {
          for (const { media_id } of baseTweet.media) {
            const expiryUnix = await redis.get(`tweet-media-upload:${media_id}`)

            if (!expiryUnix || Number(expiryUnix) < Date.now()) {
              hasExpiredMedia = true
              break
            }
          }
        }

        const isAutoDelayEnabled = Boolean(useAutoDelay ?? account.useAutoDelayByDefault)

        if (baseTweet.qstashId) {
          await qstash.messages.delete(baseTweet.qstashId).catch(() => {})
        }

        const { messageId } = await postWithQStash({
          accountId: account.id,
          tweetId: baseTweet.id,
          userId: user.id,
          useAutoDelay: isAutoDelayEnabled,
          channelName,
        })

        await db
          .update(tweets)
          .set({ qstashId: messageId })
          .where(eq(tweets.id, baseTweet.id))

        return c.json({
          success: true,
          messageId,
          hasExpiredMedia,
          accountId: account.id,
          accountName: account.name,
          accountUsername: account.username,
        })
      } catch (err) {
        console.error('Failed to post tweet:', err)
        await channel.tweet.status.emit({
          id: baseTweetId,
          status: 'error',
        })

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
        replyToTwitterId: z.string().optional(),
        quoteToTwitterId: z.string().optional(),
        useAutoDelay: z.boolean().optional(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { thread, replyToTwitterId, quoteToTwitterId, useAutoDelay } = input

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

      const isAutoDelayEnabled = Boolean(useAutoDelay ?? account.useAutoDelayByDefault)

      const generatedIds = thread.map(() => crypto.randomUUID())

      const properties: (typeof tweetPropertyEnum.enumValues)[number][] = []
      if (isAutoDelayEnabled) properties.push('auto-delay')

      const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
        id: generatedIds[i],
        accountId: account.id,
        userId: user.id,
        content: tweet.content,
        media: tweet.media,
        isScheduled: false,
        isPublished: false,
        isReplyTo: i === 0 ? undefined : generatedIds[i - 1],
        properties,
      }))

      await db.insert(tweets).values(tweetsToInsert)

      const firstTweetId = generatedIds[0]!
      const baseTweet = await db.query.tweets.findFirst({
        where: eq(tweets.id, firstTweetId),
      })

      if (!baseTweet) {
        throw new HTTPException(500, { message: 'Failed to create base tweet' })
      }

      const { messageId } = await postWithQStash({
        accountId: account.id,
        tweetId: baseTweet.id,
        userId: user.id,
        replyToTwitterId,
        quoteToTwitterId,
        useAutoDelay: isAutoDelayEnabled,
      })

      await db
        .update(tweets)
        .set({ qstashId: messageId })
        .where(eq(tweets.id, baseTweet.id))

      return c.json({
        success: true,
        messageId,
        accountId: account.id,
        accountName: account.name,
        accountUsername: account.username,
      })
    }),

  enqueue_tweet: privateProcedure
    .input(
      z.object({
        userNow: z.date(),
        timezone: z.string(),
        thread: z.array(payloadTweetSchema).min(1),
        useNaturalTime: z.boolean().optional(),
        useAutoDelay: z.boolean().optional(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { userNow, timezone, thread, useNaturalTime, useAutoDelay } = input

      const account = await getAccount({
        email: user.email,
      })

      if (!account?.id) {
        throw new HTTPException(400, {
          message: 'Please connect your Twitter account',
        })
      }

      const isNaturalTimeEnabled = Boolean(
        useNaturalTime ?? account.useNaturalTimeByDefault,
      )

      const isAutoDelayEnabled = Boolean(useAutoDelay ?? account.useAutoDelayByDefault)

      if (user.plan !== 'pro') {
        const currentScheduledCount = await getScheduledTweetCount(user.id)
        if (currentScheduledCount >= 3) {
          throw new HTTPException(402, {
            message:
              'Free plan scheduling limit reached. You can only have 3 scheduled posts at a time. Upgrade to Pro to schedule unlimited tweets.',
          })
        }
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
        isAdmin: Boolean(user.isAdmin),
      })

      if (!nextSlot) {
        throw new HTTPException(409, {
          message: 'Queue for the next 3 months is already full!',
        })
      }

      const scheduledUnix = nextSlot.getTime()
      const baseTweetId = crypto.randomUUID()

      const { messageId } = await postWithQStash({
        accountId: dbAccount.id,
        tweetId: baseTweetId,
        userId: user.id,
        scheduledUnixInSeconds: scheduledUnix / 1000,
        useNaturalTime: isNaturalTimeEnabled,
        useAutoDelay: isAutoDelayEnabled,
      })

      try {
        const generatedIds = thread.map((_, i) =>
          i === 0 ? baseTweetId : crypto.randomUUID(),
        )

        const properties: (typeof tweetPropertyEnum.enumValues)[number][] = []

        if (isNaturalTimeEnabled) properties.push('natural')
        if (isAutoDelayEnabled) properties.push('auto-delay')

        const tweetsToInsert: InsertTweet[] = thread.map((tweet, i) => ({
          id: generatedIds[i],
          accountId: account.id,
          userId: user.id,
          content: tweet.content,
          scheduledUnix: scheduledUnix,

          isScheduled: true,
          isQueued: true,
          properties,

          media: tweet.media,
          qstashId: messageId,
          isReplyTo: i === 0 ? undefined : generatedIds[i - 1],
        }))

        await db.insert(tweets).values(tweetsToInsert)
      } catch (err) {
        console.error(err)

        await qstash.messages.delete(messageId).catch(() => {})

        throw err
      }

      return c.json({
        success: true,
        tweetId: baseTweetId,
        scheduledUnix,
        accountId: account.id,
        accountName: account.name,
      })
    }),

  get_posted: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const account = await getAccount({
      email: user.email,
    })

    if (!account?.id) {
      throw new HTTPException(400, {
        message: 'Please connect your Twitter account',
      })
    }

    const _postedTweets = await db.query.tweets.findMany({
      where: and(
        eq(tweets.accountId, account.id),
        lte(tweets.scheduledUnix, new Date().getTime()),
        or(
          eq(tweets.isPublished, true),
          eq(tweets.isProcessing, true),
          eq(tweets.isError, true),
          isNotNull(tweets.isReplyTo),
        ),
      ),
      orderBy: [desc(tweets.updatedAt)],
    })

    const postedTweets = await Promise.all(
      _postedTweets.map(async (tweet) => {
        const enrichedMedia = await fetchMediaFromS3(tweet.media || [])
        return {
          ...tweet,
          media: enrichedMedia,
        }
      }),
    )

    const buildThread = (baseTweetId: string): typeof postedTweets => {
      const thread = []
      const baseTweet = postedTweets.find((t) => t.id === baseTweetId)
      if (!baseTweet) return []

      thread.push(baseTweet)

      // Find all replies in order
      let currentId = baseTweetId
      while (true) {
        const nextTweet = postedTweets.find((t) => t.isReplyTo === currentId)
        if (!nextTweet) break
        thread.push(nextTweet)
        currentId = nextTweet.id
      }

      return thread
    }

    const baseTweets = postedTweets.filter((tweet) => !tweet.isReplyTo)

    const groupedByDate: Record<string, typeof baseTweets> = {}

    baseTweets.forEach((baseTweet) => {
      const publishDate = baseTweet.scheduledUnix ?? baseTweet.updatedAt.getTime()
      const dateKey = startOfDay(new Date(publishDate)).getTime().toString()

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(baseTweet)
    })

    // Build results structure similar to get_queue
    const results: Array<
      Record<
        number,
        Array<{
          unix: number
          thread: ReturnType<typeof buildThread>
          isQueued: boolean
        }>
      >
    > = []

    Object.entries(groupedByDate).forEach(([dateKey, tweets]) => {
      const threadsForDay = tweets.map((baseTweet) => ({
        unix: baseTweet.scheduledUnix ?? baseTweet.updatedAt.getTime(),
        thread: buildThread(baseTweet.id),
        isQueued: false,
      }))

      // Sort by published time (most recent first)
      threadsForDay.sort((a, b) => b.unix - a.unix)

      results.push({
        [Number(dateKey)]: threadsForDay,
      })
    })

    // Sort results by date (most recent first)
    results.sort((a, b) => {
      const dateA = Number(Object.keys(a)[0])
      const dateB = Number(Object.keys(b)[0])
      return dateB - dateA
    })

    return c.superjson({ results })
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
        where: and(
          eq(tweets.accountId, account.id),
          // eq(tweets.isScheduled, true),
          // eq(tweets.isError, false),
          lte(tweets.scheduledUnix, addDays(today, 90).getTime()),
          gte(tweets.scheduledUnix, today.getTime()),
        ),
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
          (t) =>
            Boolean(t.isQueued || t.isProcessing || t.isPublished) &&
            t.scheduledUnix === unix &&
            !t.isReplyTo,
        )

        if (baseTweet) {
          return buildThread(baseTweet.id)
        }

        return null
      }

      const queueSettings = await getAccountQueueSettings(account.id)

      const furthestScheduledTweet = scheduledTweets.reduce((max, tweet) => {
        if (!tweet.scheduledUnix) return max
        return tweet.scheduledUnix > max ? tweet.scheduledUnix : max
      }, 0)

      const daysToShow =
        furthestScheduledTweet > 0
          ? Math.min(
              90,
              Math.max(
                8,
                Math.ceil(
                  (furthestScheduledTweet - today.getTime()) / (1000 * 60 * 60 * 24),
                ) + 14,
              ),
            )
          : 8

      const all: Array<Record<number, Array<number>>> = []

      for (let i = 0; i < daysToShow; i++) {
        const currentDay = addDays(today, i)
        const dayOfWeek = currentDay.getDay()
        const slotsForDay = queueSettings[dayOfWeek.toString()] || []

        const unixTimestamps = slotsForDay.map((minutesFromMidnight: number) => {
          const hours = Math.floor(minutesFromMidnight / 60)
          const minutes = minutesFromMidnight % 60
          const localDate = fromZonedTime(
            new Date(
              currentDay.getFullYear(),
              currentDay.getMonth(),
              currentDay.getDate(),
              hours,
              minutes,
            ),
            timezone,
          )
          return localDate.getTime()
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

        const baseTweetsForThisDay = scheduledTweets.filter((t) => {
          if (!t.scheduledUnix || Boolean(t.isReplyTo)) return false

          const tweetDateInTimezone = new Date(
            new Date(t.scheduledUnix).toLocaleString('en-US', { timeZone: timezone }),
          )
          const dayDateInTimezone = new Date(
            new Date(Number(dayUnix)).toLocaleString('en-US', { timeZone: timezone }),
          )

          return isSameDay(tweetDateInTimezone, dayDateInTimezone)
        })

        const manualBaseTweetsForThisDay = baseTweetsForThisDay.filter(
          (t) => !Boolean(t.isQueued || t.isProcessing || t.isPublished),
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
          ].sort((a, b) => a.unix - b.unix),
          // .filter((entry) => isFuture(entry.unix)),
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
        isAdmin: Boolean(user.isAdmin),
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

  getOpenGraph: privateProcedure
    .input(
      z.object({
        url: z
          .string()
          .transform((url) => {
            if (!/^https?:\/\//i.test(url)) {
              return `https://${url}`
            }

            return url.replace(/^http:/i, 'https:')
          })
          .pipe(z.string()),
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { url } = input

      const cacheKey = `og:${url}`
      const cached = await redis.get<{
        image: string | null
        title: string | null
        description: string | null
        siteName: string | null
      }>(cacheKey)

      if (cached) {
        return c.json(cached)
      }

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; ContentportBot/1.0; +https://contentport.io)',
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        })

        if (!response.ok) {
          return c.json({ image: null, title: null, description: null, siteName: null })
        }

        const html = await response.text()

        const decodeHtmlEntities = (str: string): string => {
          return str
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
        }

        const getMetaContent = (property: string): string | null => {
          const propertyMatch =
            html.match(
              new RegExp(
                `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
                'i',
              ),
            ) ||
            html.match(
              new RegExp(
                `<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`,
                'i',
              ),
            )

          const nameMatch =
            html.match(
              new RegExp(
                `<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`,
                'i',
              ),
            ) ||
            html.match(
              new RegExp(
                `<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`,
                'i',
              ),
            )

          const rawContent = propertyMatch?.[1] || nameMatch?.[1] || null
          return rawContent ? decodeHtmlEntities(rawContent) : null
        }

        let ogImage =
          getMetaContent('og:image') ||
          getMetaContent('og:image:url') ||
          getMetaContent('og:image:secure_url') ||
          getMetaContent('twitter:image') ||
          getMetaContent('twitter:image:src')

        if (ogImage && !ogImage.startsWith('http')) {
          const baseUrl = new URL(url)
          if (ogImage.startsWith('//')) {
            ogImage = `${baseUrl.protocol}${ogImage}`
          } else if (ogImage.startsWith('/')) {
            ogImage = `${baseUrl.origin}${ogImage}`
          } else {
            ogImage = `${baseUrl.origin}/${ogImage}`
          }
        }

        const ogTitle =
          getMetaContent('og:title') ||
          getMetaContent('twitter:title') ||
          html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()

        const ogDescription =
          getMetaContent('og:description') ||
          getMetaContent('twitter:description') ||
          getMetaContent('description')

        const ogSiteName =
          getMetaContent('og:site_name') || new URL(url).hostname.replace('www.', '')

        const result = {
          image: ogImage,
          title: ogTitle,
          description: ogDescription,
          siteName: ogSiteName,
        }

        waitUntil(redis.set(cacheKey, result, { ex: 3600 }))

        return c.json(result)
      } catch (error) {
        return c.json({ image: null, title: null, description: null, siteName: null })
      }
    }),
})
