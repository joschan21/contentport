import { db } from "@/db"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createAuthMiddleware } from "better-auth/api"
import { client } from "@/lib/client"
import { redis } from "./redis"

const database = drizzleAdapter(db, { provider: "pg" })

export const auth = betterAuth({
  user: {
    additionalFields: {
      plan: { type: "string", defaultValue: "free" },
    },
  },
  database,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const session = ctx.context.newSession

      const allowlist = [
        "neske.joscha@gmail.com",
        "joscha7676@gmail.com",
        "jcodog@cleoai.cloud",
        "hola@tomasholtz.com",
        "jorge@heyjorge.dev",
        "hello@joshtriedcoding.com",
        "8020ui@gmail.com",
        "danielcspaiva@gmail.com",
        "getoaarm1@gmail.com",
        "johnyeocx@gmail.com",
        "joscha7676@gmail.com",
        "me@nevillebrem.com",
        "myhappyagency@gmail.com",
        "ourrahmaan@gmail.com",
        "ratan.maurya@gmail.com",
        "stefanbinoj.007@gmail.com",
        "taikimingqu@gmail.com",
        "nizabizaher@gmail.com",
        "jokirillmeerkatz@outlook.de",
      ]

      if (session && allowlist.includes(session.user.email)) {
        try {
          const account = await redis.json.get<object>(
            `connected-account:${session.user.email}`
          )

          if (!account) {
            ctx.redirect("/studio?onboarding=true")
          } else {
            ctx.redirect("/studio")
          }
        } catch (error) {
          ctx.redirect("/studio?onboarding=true")
        }
      } else {
        ctx.redirect("/")
      }
    }),
  },
})
