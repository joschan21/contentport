import { getBaseUrl } from '@/constants/base-url'
import { db } from '@/db'
import { getAccount } from '@/server/routers/utils/get-account'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware, magicLink, lastLoginMethod } from 'better-auth/plugins'
import { PostHog } from 'posthog-node'
import { Resend } from 'resend'
import { redis } from './redis'

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://eu.i.posthog.com',
})

const database = drizzleAdapter(db, { provider: 'pg' })

const getTrustedOrigins = () => {
  const origins = new Set<string>()
  const add = (v?: string) => v && origins.add(v)

  const toOrigin = (host?: string) =>
    host?.startsWith('http') ? host : host ? `https://${host}` : undefined
  const toWWWOrigin = (host?: string) =>
    host?.startsWith('http') ? host : host ? `https://www.${host}` : undefined

  add(process.env.BETTER_AUTH_URL)

  add(toOrigin(process.env.VERCEL_BRANCH_URL))
  add(toOrigin(process.env.VERCEL_URL))
  add(toWWWOrigin(process.env.VERCEL_BRANCH_URL))
  add(toWWWOrigin(process.env.VERCEL_URL))

  add('https://www.contentport.io') // prod
  add('https://www.staging.contentport.io') // prod
  add('http://localhost:3000') // local dev
  return Array.from(origins)
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  plugins: [
    lastLoginMethod(),
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        await redis.set(`redirect:${token}`, url, {
          ex: 60 * 5, // 5 mins, same as better-auth default
        })

        const resend = new Resend(process.env.RESEND_API_KEY)

        const baseUrl = getBaseUrl()
        const emailUrl = baseUrl + `/verify/${token}`

        try {
          const res = await resend.emails.send({
            from: 'Josh <josh@mail.contentport.io>',
            to: [email],
            subject: 'Sign into Contentport',
            text: `Click this link to sign into Contentport: ${emailUrl}`,
          })

          if (res.error) {
            console.error('[Error sending email]:', res.error)
          }
        } catch (err) {
          console.error(err)
        }
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          client.capture({
            distinctId: user.id,
            event: 'user_signed_up',
            properties: {
              email: user.email,
            },
          })

          await client.shutdown()
        },
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
    },
  },
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free' },
      stripeId: { type: 'string', defaultValue: null, required: false },
      hadTrial: { type: 'boolean', defaultValue: false, required: true },
      isAdmin: { type: 'boolean', defaultValue: false, required: false },
    },
  },
  database,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write'],
    },
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const session = ctx.context.newSession
      const user = session?.user

      let isOnboarded: boolean = false

      if (user) {
        const account = await getAccount({ email: user.email })
        if (Boolean(account)) isOnboarded = true
      }

      if (isOnboarded) {
        ctx.redirect('/studio')
      } else {
        ctx.redirect('/onboarding')
      }
    }),
  },
})
