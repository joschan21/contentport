import { Ratelimit } from "@upstash/ratelimit"
import { redis } from "./redis"

export const chatLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, "1d"),
})
