import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

export const freeChatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '1d'),
})

export const proChatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(80, '4h'),
})