import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields({
      user: {
        plan: { type: 'string', defaultValue: 'free' },
      },
    }),
  ],
})
