import { auth } from "@/lib/auth"
import { HTTPException } from "hono/http-exception"
import { jstack } from "jstack"

interface Env {
  Bindings: {}
}

export const j = jstack.init<Env>()

const allowlist = ["neske.joscha@gmail.com", "joscha7676@gmail.com", "jcodog@cleoai.cloud", "hola@tomasholtz.com"]

const authMiddleware = j.middleware(async ({ c, ctx, next }) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" })
  }

  if (!allowlist.includes(session.user.email)) {
    throw new HTTPException(401, { message: "Unauthorized" })
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
