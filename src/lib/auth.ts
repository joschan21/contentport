import { db } from '@/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { oAuthProxy } from 'better-auth/plugins'
import { PostHog } from 'posthog-node'

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://eu.i.posthog.com',
})

const database = drizzleAdapter(db, { provider: 'pg' })

const getTrustedOrigins = () => {
  const origins = new Set<string>()
  const add = (v?: string) => v && origins.add(v)
  const toOrigin = (host?: string) =>
    host?.startsWith('http') ? host : host ? `https://www.${host}` : undefined

  add(process.env.BETTER_AUTH_URL) // current deployment origin
  add(toOrigin(process.env.VERCEL_BRANCH_URL)) // preview branch URL (if any)
  add(toOrigin(process.env.VERCEL_URL)) // deployment URL
  add('https://www.contentport.io') // prod
  add('http://localhost:3000') // local dev
  return Array.from(origins)
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: getTrustedOrigins(),
  plugins: [
    oAuthProxy({
      productionURL: 'https://www.contentport.io',
      currentURL: process.env.BETTER_AUTH_URL,
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
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  database,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: 'https://www.contentport.io/api/auth/callback/google',
    },
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      scope: [
        'tweet.read',
        'tweet.write',
        'users.read',
        'offline.access',
        'block.read',
        'follows.read',
        'media.write',
      ],
    },
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
    },
  },
})
