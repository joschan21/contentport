import { z } from "zod"
import { j, privateProcedure } from "../jstack"
import { redis } from "@/lib/redis"
import { TwitterApi } from "twitter-api-v2"
import { HTTPException } from "hono/http-exception"
import { chatLimiter } from "@/lib/chat-limiter"
import { ConnectedAccount } from "@/components/tweet-editor/tweet-editor"

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

interface Settings {
  user: {
    profile_image_url: string
    name: string
    username: string
    id: string
    verified: boolean
    verified_type: "string"
  }
}

export const settingsRouter = j.router({
  limit: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx
    const { remaining, reset } = await chatLimiter.getRemaining(user.email)

    return c.json({ remaining, reset })
  }),
  connect: privateProcedure
    .input(
      z.object({
        username: z.string(),
      })
    )
    .post(async ({ c, ctx, input }) => {
      const { username } = input
      const { user } = ctx

      const { data: userData } = await client.v2.userByUsername(
        username.replace("@", ""),
        {
          "user.fields": [
            "profile_image_url",
            "name",
            "username",
            "id",
            "verified",
            "verified_type",
          ],
        }
      )

      if (!userData) {
        throw new HTTPException(404, {
          message: `User "${username}" not found`,
        })
      }

      await redis.json.set(`connected-account:${user.email}`, "$", {
        ...userData,
      })

      return c.json({
        success: true,
        data: {
          username: userData.username,
          name: userData.name,
          profile_image_url: userData.profile_image_url,
          verified: userData.verified,
        },
      })
    }),

  connectedAccount: privateProcedure.get(async ({ c, input, ctx }) => {
    const { user } = ctx

    const account = await redis.json.get<ConnectedAccount>(
      `connected-account:${user.email}`
    )

    return c.json({ account })
  }),
})
