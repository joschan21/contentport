import { db } from '@/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { PostHog } from 'posthog-node'

const client = new PostHog(Bun.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://eu.i.posthog.com',
})

const database = drizzleAdapter(db, { provider: 'pg' })

export const auth = betterAuth({
  trustedOrigins: [
    'http://localhost:3000',
    'https://contentport.io',
    'https://www.contentport.io',
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
  database,
  socialProviders: {
    google: {
      clientId: Bun.env.GOOGLE_CLIENT_ID as string,
      clientSecret: Bun.env.GOOGLE_CLIENT_SECRET as string,
    },
    twitter: {
      clientId: Bun.env.TWITTER_CLIENT_ID as string,
      clientSecret: Bun.env.TWITTER_CLIENT_SECRET as string,
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
