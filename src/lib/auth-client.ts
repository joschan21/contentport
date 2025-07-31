import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL:
    Bun.env.NODE_ENV === 'production'
      ? 'https://www.contentport.io'
      : 'http://localhost:3000',
  plugins: [
    inferAdditionalFields({
      user: {
        plan: { type: 'string', defaultValue: 'free' },
      },
    }),
  ],
  
})
