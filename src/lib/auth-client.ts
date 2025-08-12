import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: 'https://contentport-git-feat-thread-support-joschan21s-projects.vercel.app',
  plugins: [
    inferAdditionalFields({
      user: {
        plan: { type: 'string', defaultValue: 'free' },
      },
    }),
  ],
})
