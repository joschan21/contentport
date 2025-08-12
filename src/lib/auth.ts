import { db } from '@/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { PostHog } from 'posthog-node'
import { oAuthProxy } from 'better-auth/plugins'

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://eu.i.posthog.com',
})

const database = drizzleAdapter(db, { provider: 'pg' })

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin

  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000'

  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL
  if (process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return `https://contentport.io`
}

const getTrustedOrigins = () => {
  const origins: string[] = []

  if (process.env.VERCEL_BRANCH_URL) origins.push(process.env.VERCEL_BRANCH_URL)
  if (process.env.VERCEL_URL) origins.push(process.env.VERCEL_URL)
  if (process.env.BETTER_AUTH_URL) origins.push(process.env.BETTER_AUTH_URL)

  origins.push('https://contentport.io')
  origins.push('http://localhost:3000')

  return origins
}

export const auth = betterAuth({
  trustedOrigins: getTrustedOrigins(),
  plugins: [
    oAuthProxy({
      productionURL: 'https://contentport.io',
      currentURL: `https://${process.env.VERCEL_BRANCH_URL}`,
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
      redirectURI: 'https://contentport.io/api/auth/callback/google',
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
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const session = ctx.context.newSession

      if (session) {
        ctx.redirect('/studio')
      } else {
        ctx.redirect('/')
      }
    }),
  },
})
