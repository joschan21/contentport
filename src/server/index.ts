import { dynamic, InferRouterInputs, InferRouterOutputs } from "jstack"
import { j } from "./jstack"

/**
 * This is your base API.
 * Here, you can handle errors, not-found responses, cors and more.
 *
 * @see https://jstack.app/docs/backend/app-router
 */
const api = j
  .router()
  .basePath("/api")
  .use(j.defaults.cors)
  .onError(j.defaults.errorHandler)

/**
 * This is the main router for your server.
 * All routers in /server/routers should be added here manually.
 */
const appRouter = j.mergeRouters(api, {
  post: dynamic(() => import("./routers/post-router")),
  voice: dynamic(() => import("./routers/voice-router")),
  document: dynamic(() => import("./routers/doc-router")),
  chat: dynamic(() => import("./routers/chat-router")),
  improvement: dynamic(() => import("./routers/improvement-router")),
  waitlist: dynamic(() => import("./routers/waitlist-router")),
})

export type AppRouter = typeof appRouter
export type InferOutput = InferRouterOutputs<AppRouter>
export type InferInput = InferRouterInputs<AppRouter>

export default appRouter
