import { db } from '@/db'
import { account as accountSchema } from '@/db/schema'
import { chatLimiter } from '@/lib/chat-limiter'
import { redis } from '@/lib/redis'
import { and, desc, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

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
})
