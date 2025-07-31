import { createClient } from "jstack"
import type { AppRouter } from "@/server"

/**
 * Your type-safe API client
 * @see https://jstack.app/docs/backend/api-client
 */
export const client = createClient<AppRouter>({
  baseUrl: `${getBaseUrl()}/api`,
})

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin
  if (Bun.env.VERCEL_URL) return `https://${Bun.env.VERCEL_URL}`
  return `http://localhost:3000`
}
