import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL:
    process.env.NODE_ENV === 'production'
      ? process.env.BETTER_AUTH_URL
        ? process.env.BETTER_AUTH_URL
        : `https://${process.env.VERCEL_BRANCH_URL}`
      : 'http://localhost:3000',
  plugins: [
    inferAdditionalFields({
      user: {
        plan: { type: 'string', defaultValue: 'free' },
      },
    }),
  ],
})
