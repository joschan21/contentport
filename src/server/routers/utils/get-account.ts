import { redis } from '@/lib/redis'
import { Account } from '../settings-router'
import { TwitterApi } from 'twitter-api-v2'

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN as string).readOnly

export const getAccount = async ({ email }: { email: string }) => {
  const account = await redis.json.get<Account>(`active-account:${email}`)

  let payload = account

  if (!account?.twitterId && account?.username) {
    const user = await client.v2.userByUsername(account.username)
    payload = {
      ...account,
      twitterId: user.data.id,
    }

    await redis.json.set(`active-account:${email}`, '$', payload)
  }

  return payload
}
