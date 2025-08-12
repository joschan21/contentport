import { dynamic, InferRouterInputs, InferRouterOutputs } from 'jstack'
import { j } from './jstack'
import { cors } from 'hono/cors'

/**
 * This is your base API.
 * Here you can handle errors, not-found responses, cors and more.
 *
 * @see https://jstack.app/docs/backend/app-router
 */
const api = j
  .router()
  .basePath('/api')
  .use(
    cors({
      origin: '*',
      allowHeaders: [
        'x-is-superjson',
        'Content-Type',
        'content-type',
        'authorization',
        'x-requested-with',
      ],
      exposeHeaders: ['x-is-superjson', 'Content-Type', 'content-type'],
      credentials: true,
    }),
  )

/**
 * This is the main router for your server.
 * All routers in /server/routers should be added here manually.
 */
const appRouter = j.mergeRouters(api, {
  file: dynamic(() => import('./routers/file-router')),
  tweet: dynamic(() => import('./routers/tweet/tweet-router')),
  knowledge: dynamic(() => import('./routers/knowledge-router')),
  chat: dynamic(() => import('./routers/chat/chat-router')),
  style: dynamic(() => import('./routers/style-router')),
  settings: dynamic(() => import('./routers/settings-router')),
  auth_router: dynamic(() => import('./routers/auth-router')),
  stripe: dynamic(() => import('./routers/stripe-router')),
  // processing: dynamic(() => import('./routers/processing-router')),
})

export type AppRouter = typeof appRouter
export type InferOutput = InferRouterOutputs<AppRouter>
export type InferInput = InferRouterInputs<AppRouter>

export default appRouter
