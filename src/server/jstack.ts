import { allowlist } from '@/constants/allow-list'
import { auth } from '@/lib/auth'
import { HTTPException } from 'hono/http-exception'
import { jstack } from 'jstack'

interface Env {
  Bindings: {
    OPENAI_API_KEY: string
    DEEPL_API_KEY: string
    GOOGLE_GENERATIVE_AI_API_KEY: string
    ANTHROPIC_API_KEY: string
    TWITTER_BEARER_TOKEN: string
    XAI_API_KEY: string
    UPSTASH_REDIS_REST_URL: string
    UPSTASH_REDIS_REST_TOKEN: string
    TWITTER_API_KEY: string
    TWITTER_API_SECRET: string
    TWITTER_ACCESS_TOKEN: string
    TWITTER_ACCESS_TOKEN_SECRET: string
    BETTER_AUTH_SECRET: string
    DATABASE_URL: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    RESEND_API_KEY: string
    FIRECRAWL_API_KEY: string
    AWS_GENERAL_ACCESS_KEY: string
    AWS_GENERAL_SECRET_KEY: string
    AWS_REGION: string
    STRIPE_PUBLIC_KEY: string
    STRIPE_SECRET_KEY: string
  }
}

export const j = jstack.init<Env>()

const authMiddleware = j.middleware(async ({ c, next }) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  if (!allowlist.includes(session.user.email)) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }

  return await next({ user: session.user })
})

/**
 * Public (unauthenticated) procedures
 *
 * This is the base piece you use to build new queries and mutations on your API.
 */
export const publicProcedure = j.procedure
export const privateProcedure = publicProcedure.use(authMiddleware)
