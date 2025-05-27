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
        "akashp1712@gmail.com",
        "akshathg7@gmail.com",
        "alvarofragosoc@gmail.com",
        "dtlvan@gmail.com",
        "harsh@formbricks.com",
        "hey@omidshabab.com",
        "jarrerh@gmail.com",
        "khoaizahmmed@gmail.com",
        "khvala@macpaw.com",
        "lindorf85@gmail.com",
        "liweizhismd@gmail.com",
        "luca@studiopiccinotti.it",
        "michel.binkhorst@xs4all.nl",
        "neske.joscha@gmail.com",
        "oluwaseunmauwedo@gmail.com",
        "p.homoky@gmail.com",
        "priart@gmail.com",
        "rohitmeshram000@gmail.com",
        "tommy.roman.hater@gmail.com",
        "vurukondasaiteja13@gmail.com",
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
        "2607jojo@gmail.com",
        "pietro.dev.07@gmail.com",
        "lucapiccinotti.lp@gmail.com",
        "rathoursourabh5@gmail.com",
        "jonathan@fabworks.com",
      ]

      if (session && allowlist.includes(session.user.email)) {
        ctx.redirect("/studio")
      } else {
        ctx.redirect("/")
      }
    }),
  },
})
