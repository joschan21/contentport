import { Ratelimit } from "@upstash/ratelimit"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
import { redis } from "../../lib/redis"
import { j, publicProcedure } from "../jstack"

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(4, "1 h"),
})

export const waitlistRouter = j.router({
  jo: publicProcedure.get(({ c }) => {
    return c.json({ name: "jo" })
  }),
  join: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .post(async ({ c, input }) => {
      const ip = c.req.header("x-forwarded-for") || "anonymous"
      const { success, limit, reset, remaining } = await ratelimit.limit(ip)

      if (!success) {
        c.header("X-RateLimit-Limit", limit.toString())
        c.header("X-RateLimit-Remaining", remaining.toString())
        c.header("X-RateLimit-Reset", reset.toString())
        throw new HTTPException(429, { message: "Too many requests" })
      }

      const { email } = input

      const exists = await redis.sismember("waitlist", email)

      if (exists) {
        throw new HTTPException(409, { message: "Email already signed up" })
      }

      await redis.sadd("waitlist", email)
      await redis.incr("waitlist:count")

      return c.json({ success: true })
    }),
  count: publicProcedure.get(async ({ c }) => {
    const count = (await redis.get<string>("waitlist:count")) || "0"
    return c.json({ count: parseInt(count) })
  }),
})
