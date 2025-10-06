import { redis } from '@/lib/redis'
import { Account } from '../settings-router'
import { TwitterApi } from 'twitter-api-v2'
import { db } from '@/db'
import { account as accountSchema } from '@/db/schema'
import { and, eq } from 'drizzle-orm'

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN as string).readOnly

export const getAccount = async ({
  email,
  accountId,
}: {
  email: string
  accountId?: string
}) => {
  const key = accountId ? `account:${email}:${accountId}` : `active-account:${email}`
  const account = await redis.json.get<Account>(key)

  let payload = account

  if (!account?.twitterId && account?.username) {
    const user = await client.v2.userByUsername(account.username)
    payload = {
      ...account,
      twitterId: user.data.id,
    }
    if (accountId) {
      await redis.json.set(`account:${email}:${accountId}`, '$', payload)
    } else {
      await redis.json.set(`active-account:${email}`, '$', payload)
    }
  }

  return payload
}

export const getAccounts = async ({ userId }: { userId: string }) => {
  const dbAccounts = await db
    .select({ id: accountSchema.id })
    .from(accountSchema)
    .where(and(eq(accountSchema.userId, userId), eq(accountSchema.providerId, 'twitter')))

  const accounts = await Promise.all(
    dbAccounts.map(async (account) => {
      return await getAccount({ email: userId, accountId: account.id })
    }),
  )

  return accounts.filter(Boolean)
}
