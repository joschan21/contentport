import { db } from '@/db'
import { account as accountSchema, tweets, user as userSchema } from '@/db/schema'
import { chatLimiter } from '@/lib/chat-limiter'
import { redis } from '@/lib/redis'
import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { j, privateProcedure, qstashProcedure } from '../jstack'
import { TwitterApi } from 'twitter-api-v2'
import { vector } from '@/lib/vector'
import { stripe } from '@/lib/stripe/client'
import { qstash } from '@/lib/qstash'
import { s3Client, BUCKET_NAME } from '@/lib/s3'
import { DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getBaseUrl } from '@/constants/base-url'
import { Ratelimit } from '@upstash/ratelimit'
import { getScheduledTweetCount } from './utils/get-scheduled-tweet-count'

export type Account = {
  id: string
  name: string
  username: string
  profile_image_url: string
  verified: boolean
  twitterId?: string // new
}

export const settingsRouter = j.router({
  limit: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx
    const { remaining, reset } = await chatLimiter.getRemaining(user.email)

    return c.json({ remaining, reset })
  }),

  usage_stats: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx
    const isPro = user.plan === 'pro'

    const chatRequestsLimit = isPro ? Infinity : 5
    const connectedAccountsLimit = isPro ? 3 : 1
    const scheduledTweetsLimit = isPro ? Infinity : 3

    const [chatLimiter, accountsCount, scheduledCount] = await Promise.all([
      (async () => {
        if (isPro) {
          return {
            used: 0,
            limit: Infinity,
            remaining: Infinity,
          }
        }

        const limiter = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, '1d') })

        const { remaining } = await limiter.getRemaining(user.email)
        const used = chatRequestsLimit - remaining

        return {
          used: Math.max(0, used),
          limit: chatRequestsLimit,
          remaining,
        }
      })(),

      db
        .select({ id: accountSchema.id })
        .from(accountSchema)
        .where(
          and(eq(accountSchema.userId, user.id), eq(accountSchema.providerId, 'twitter')),
        )
        .then((accounts) => ({
          used: accounts.length,
          limit: connectedAccountsLimit,
        })),

      (async () => {
        const accounts = await db
          .select({ id: accountSchema.id })
          .from(accountSchema)
          .where(
            and(
              eq(accountSchema.userId, user.id),
              eq(accountSchema.providerId, 'twitter'),
            ),
          )

        if (accounts.length === 0) {
          return { used: 0, limit: scheduledTweetsLimit }
        }

        const count = await getScheduledTweetCount(user.id)

        return { used: count, limit: scheduledTweetsLimit }
      })(),
    ])

    return c.json({
      chatRequests: chatLimiter,
      connectedAccounts: accountsCount,
      scheduledTweets: scheduledCount,
    })
  }),

  update_name: privateProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { name } = input

      await db
        .update(userSchema)
        .set({ name, updatedAt: new Date() })
        .where(eq(userSchema.id, user.id))

      return c.json({ success: true, name })
    }),

  schedule_delete_my_account: privateProcedure.post(async ({ c, ctx }) => {
    const { user } = ctx

    const [dbUser] = await db.select().from(userSchema).where(eq(userSchema.id, user.id))

    if (!dbUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    if (dbUser.stripeId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: dbUser.stripeId,
          status: 'active',
        })

        const activeNonCancelledSubscriptions = subscriptions.data.filter(
          (sub) => !sub.cancel_at_period_end,
        )

        if (activeNonCancelledSubscriptions.length > 0) {
          throw new HTTPException(400, {
            message:
              'Please cancel your active subscription before deleting your account.',
          })
        }
      } catch (err) {
        if (err instanceof HTTPException) {
          throw err
        }
        console.error('Failed to check Stripe subscriptions:', err)
      }
    }

    const baseUrl =
      process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

    await qstash.publishJSON({
      url: baseUrl + '/api/settings/delete_my_account',
      body: {
        userId: user.id,
      },
    })

    return c.json({ success: true })
  }),

  delete_my_account: qstashProcedure.post(async ({ c, ctx }) => {
    const { body } = ctx
    const { userId } = body

    if (!userId) {
      throw new HTTPException(400, { message: 'User ID is required' })
    }

    try {
      const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId))

      if (!user) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      const userAccounts = await db
        .select()
        .from(accountSchema)
        .where(eq(accountSchema.userId, user.id))

      for (const account of userAccounts) {
        try {
          await vector.deleteNamespace(account.id).catch(() => {})
        } catch (err) {
          console.error(
            `Failed to delete vector namespace for account ${account.id}:`,
            err,
          )
        }

        try {
          await Promise.all([
            redis.json.del(`account:${user.email}:${account.id}`),
            redis.del(`memories:${account.id}`),
            redis.del(`posts:${account.id}`),
            redis.del(`status:posts:${account.id}`),
            redis.hdel(`received-welcome-email`, user.id),
            redis.hdel(`attempted_indexing_users`, user.id),
          ])
        } catch (err) {
          console.error(`Failed to delete Redis keys for account ${account.id}:`, err)
        }
      }

      try {
        await redis.json.del(`active-account:${user.email}`)
      } catch (err) {
        console.error('Failed to delete active account from Redis:', err)
      }

      const scheduledTweets = await db
        .select()
        .from(tweets)
        .where(and(eq(tweets.userId, user.id), isNotNull(tweets.qstashId)))

      for (const tweet of scheduledTweets) {
        if (tweet.qstashId) {
          // tweet is deleted later too
          await qstash.messages.delete(tweet.qstashId).catch(() => {})
        }
      }

      const s3Prefixes = [
        `knowledge/${user.id}/`,
        `chat/${user.id}/`,
        `tweet-media/${user.id}/`,
      ]

      for (const prefix of s3Prefixes) {
        try {
          const listCommand = new ListObjectsV2Command({
            Bucket: BUCKET_NAME!,
            Prefix: prefix,
          })
          const listedObjects = await s3Client.send(listCommand)

          if (listedObjects.Contents && listedObjects.Contents.length > 0) {
            await Promise.all(
              listedObjects.Contents.map(async (object) => {
                if (object.Key) {
                  try {
                    await s3Client.send(
                      new DeleteObjectCommand({
                        Bucket: BUCKET_NAME!,
                        Key: object.Key,
                      }),
                    )
                  } catch (err) {
                    console.error(`Failed to delete S3 object ${object.Key}:`, err)
                  }
                }
              }),
            )
          }
        } catch (err) {
          console.error(`Failed to list/delete S3 objects with prefix ${prefix}:`, err)
        }
      }

      try {
        const sitemaps = await redis.hgetall(`sitemaps:${user.email}`)
        if (sitemaps && Object.keys(sitemaps).length > 0) {
          for (const sitemapId of Object.keys(sitemaps)) {
            try {
              await vector.deleteNamespace(`sitemap:${sitemapId}`).catch(() => {})
              await redis.del(`sitemap:${sitemapId}`)
            } catch (err) {
              console.error(`Failed to delete sitemap ${sitemapId}:`, err)
            }
          }
          await redis.del(`sitemaps:${user.email}`)
        }
      } catch (err) {
        console.error('Failed to delete sitemaps:', err)
      }

      try {
        const chatHistoryList = await redis.get<Array<{ id: string }>>(
          `chat:history-list:${user.email}`,
        )
        if (chatHistoryList && chatHistoryList.length > 0) {
          await Promise.all([
            ...chatHistoryList.map((chat) => redis.del(`chat:history:${chat.id}`)),
            ...chatHistoryList.map((chat) => redis.del(`website-contents:${chat.id}`)),
            redis.del(`chat:history-list:${user.email}`),
          ])
        }
      } catch (err) {
        console.error('Failed to delete chat history:', err)
      }

      if (user.stripeId) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: user.stripeId,
            status: 'active',
          })

          const activeNonCancelledSubscriptions = subscriptions.data.filter(
            (sub) => !sub.cancel_at_period_end,
          )

          for (const subscription of activeNonCancelledSubscriptions) {
            try {
              await stripe.subscriptions.cancel(subscription.id)
            } catch (err) {
              console.error(
                `Failed to cancel Stripe subscription ${subscription.id}:`,
                err,
              )
            }
          }

          try {
            await stripe.customers.del(user.stripeId)
          } catch (err) {
            console.error(`Failed to delete Stripe customer ${user.stripeId}:`, err)
          }
        } catch (err) {
          console.error('Failed to handle Stripe cleanup:', err)
        }
      }

      await db.delete(userSchema).where(eq(userSchema.id, user.id))

      return c.json({ success: true, message: 'Account successfully deleted' })
    } catch (error) {
      console.error('Account deletion error:', error)
      throw new HTTPException(500, {
        message: 'Failed to delete account. Please contact support.',
      })
    }
  }),

  delete_twitter_account: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { accountId } = input

      const activeAccount = await redis.json.get<Account>(`active-account:${user.email}`)

      if (activeAccount?.id === accountId) {
        throw new HTTPException(409, {
          message: 'You cannot delete your active account.',
        })
      }

      const [dbAccount] = await db
        .select()
        .from(accountSchema)
        .where(and(eq(accountSchema.userId, user.id), eq(accountSchema.id, accountId)))

      if (dbAccount) {
        await db.delete(accountSchema).where(eq(accountSchema.id, accountId))
      }

      await redis.json.del(`account:${user.email}:${accountId}`)

      // cleanup memories
      await redis.del(`memories:${accountId}`)

      // cleanup tweets
      await redis.del(`posts:${accountId}`)
      await vector.deleteNamespace(accountId).catch(() => {})

      return c.json({ success: true })
    }),

  list_accounts: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx
    const accountIds = await db
      .select({
        id: accountSchema.id,
      })
      .from(accountSchema)
      .where(
        and(eq(accountSchema.userId, user.id), eq(accountSchema.providerId, 'twitter')),
      )
      .orderBy(desc(accountSchema.createdAt))

    const activeAccount = await redis.json.get<Account>(`active-account:${user.email}`)

    const accounts = await Promise.all(
      accountIds.map(async (account) => {
        const accountData = await redis.json.get<Account>(
          `account:${user.email}:${account.id}`,
        )

        const doPostsExists = await redis.exists(`posts:${account.id}`)
        const postIndexingStatus = await redis.get<'started' | 'success' | 'error'>(
          `status:posts:${account.id}`,
        )
        const hasAttemptedIndexing = await redis.hexists(
          `attempted_indexing_users`,
          user.id,
        )

        return {
          ...account,
          ...accountData,
          isActive: activeAccount?.id === account.id,
          postIndexingStatus:
            postIndexingStatus ||
            (doPostsExists ? 'success' : !hasAttemptedIndexing ? undefined : 'error'),
        }
      }),
    )

    return c.superjson({ accounts })
  }),

  connect: privateProcedure
    .input(
      z.object({
        accountId: z.string(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const account = await redis.get<Account>(`account:${user.email}:${input.accountId}`)

      if (!account) {
        throw new HTTPException(404, {
          message: `Account "${input.accountId}" not found`,
        })
      }

      await redis.json.set(`active-account:${user.email}`, '$', account)

      return c.json({ success: true })
    }),

  active_account: privateProcedure.get(async ({ c, input, ctx }) => {
    const { user } = ctx

    let account: Account | null = null

    account = await redis.json.get<Account>(`active-account:${user.email}`)

    return c.json({ account })
  }),

  switch_account: privateProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { accountId } = input

      const account = await redis.json.get<Account>(`account:${user.email}:${accountId}`)

      if (!account) {
        throw new HTTPException(404, { message: `Account "${accountId}" not found` })
      }

      await redis.json.set(`active-account:${user.email}`, '$', account)

      return c.json({ success: true, account })
    }),

  refresh_profile_data: privateProcedure
    .input(z.object({ accountId: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { accountId } = input

      const account = await redis.json.get<Account>(`account:${user.email}:${accountId}`)

      if (!account) {
        throw new HTTPException(404, { message: `Account "${accountId}" not found` })
      }

      const dbAccount = await db.query.account.findFirst({
        where: and(eq(accountSchema.userId, user.id), eq(accountSchema.id, accountId)),
      })

      if (!dbAccount || !dbAccount.accessToken) {
        throw new HTTPException(400, {
          message: 'Twitter account not connected or access tokens missing',
        })
      }

      try {
        const twitterClient = new TwitterApi({
          appKey: process.env.TWITTER_CONSUMER_KEY as string,
          appSecret: process.env.TWITTER_CONSUMER_SECRET as string,
          accessToken: dbAccount.accessToken as string,
          accessSecret: dbAccount.accessSecret as string,
        })

        const userProfile = await twitterClient.currentUser()

        const updatedAccount = {
          ...account,
          profile_image_url: userProfile.profile_image_url_https,
          name: userProfile.name,
          username: userProfile.screen_name,
        }

        await redis.json.set(`account:${user.email}:${accountId}`, '$', updatedAccount)

        const activeAccount = await redis.json.get<Account>(
          `active-account:${user.email}`,
        )
        if (activeAccount?.id === accountId) {
          await redis.json.set(`active-account:${user.email}`, '$', updatedAccount)
        }

        return c.json({
          success: true,
          account: updatedAccount,
          profile_image_url: userProfile.profile_image_url_https,
        })
      } catch (error) {
        console.error('Failed to refresh profile data:', error)
        throw new HTTPException(500, {
          message: 'Failed to refresh profile data from Twitter',
        })
      }
    }),
})
