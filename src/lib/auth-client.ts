import { createAuthClient } from 'better-auth/react'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    inferAdditionalFields({
      user: {
        plan: { type: 'string', defaultValue: 'free' },
      },
    }),
  ],
})

function getBaseUrl() {
  if (typeof window !== 'undefined') return window.location.origin
  if (process.env.NODE_ENV === "production") return `https://contentport.io`
  return `http://localhost:3000`
}
