import { db } from "@/db"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth"
import { createAuthMiddleware, APIError } from "better-auth/api"
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
      ]

      if (session && allowlist.includes(session.user.email)) {
        ctx.redirect("/studio")
      } else {
        ctx.redirect("/")
      }
    }),
  },
})
