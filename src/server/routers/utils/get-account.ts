import { redis } from '@/lib/redis'
import { Account } from '../settings-router'

export const getAccount = async ({ email }: { email: string }) => {
  const account = await redis.json.get<Account>(`active-account:${email}`)

  return account
}
