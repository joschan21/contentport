import { db } from '@/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAuthMiddleware } from 'better-auth/api'
import { client } from '@/lib/client'
import { redis } from './redis'
import { allowlist } from '@/constants/allow-list'

const database = drizzleAdapter(db, { provider: 'pg' })

export const auth = betterAuth({
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free' },
      stripeId: { type: 'string', defaultValue: null, required: false },
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

      if (session && allowlist.includes(session.user.email)) {
        ctx.redirect('/studio')
      } else {
        ctx.redirect('/')
      }
    }),
  },
})
