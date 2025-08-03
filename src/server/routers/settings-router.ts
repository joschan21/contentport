import { db } from '@/db'
import { account as accountSchema } from '@/db/schema'
import { chatLimiter } from '@/lib/chat-limiter'
import { redis } from '@/lib/redis'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

export type Account = {
  id: string
  name: string
  username: string
  profile_image_url: string
  verified: boolean
}

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

interface Settings {
  user: {
    profile_image_url: string
    name: string
    username: string
    id: string
    verified: boolean
    verified_type: 'string'
  }
}

interface TweetWithStats {
  id: string
  text: string
  likes: number
  retweets: number
  created_at: string
}

interface StyleAnalysis {
  overall: string
  first_third: string
  second_third: string
  third_third: string
  [key: string]: string
}

export const settingsRouter = j.router({
  limit: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx
    const { remaining, reset } = await chatLimiter.getRemaining(user.email)

    return c.json({ remaining, reset })
  }),

  delete_account: privateProcedure
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
        await redis.del(`active-account:${user.email}`)
      }

      const [dbAccount] = await db
        .select()
        .from(accountSchema)
        .where(and(eq(accountSchema.userId, user.id), eq(accountSchema.id, accountId)))

      if (dbAccount) {
        await db.delete(accountSchema).where(eq(accountSchema.id, accountId))
      }

      await redis.json.del(`account:${user.email}:${accountId}`)

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
      accountIds.map(async (accountRecord) => {
        const accountData = await redis.json.get<Account>(
          `account:${user.email}:${accountRecord.id}`,
        )
        return {
          ...accountRecord,
          ...accountData,
          isActive: activeAccount?.id === accountRecord.id,
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
        console.error('Failed to refresh profile picture:', error)
        throw new HTTPException(500, {
          message: 'Failed to refresh profile picture from Twitter',
        })
      }
    }),
})
