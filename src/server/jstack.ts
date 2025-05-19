import { auth } from "@/lib/auth"
import { HTTPException } from "hono/http-exception"
import { jstack } from "jstack"

interface Env {
  Bindings: {}
}

export const j = jstack.init<Env>()

const allowlist = [
  "akashp1712@gmail.com",
  "akshathg7@gmail.com",
  "alvarofragosoc@gmail.com",
  "dtlvan@gmail.com",
  "harsh@formbricks.com",
  "hey@omidshabab.com",
  "jarrerh@gmail.com",
  "khoaizahmmed@gmail.com",
  "khvala@macpaw.com",
  "lindorf85@gmail.com",
  "liweizhismd@gmail.com",
  "luca@studiopiccinotti.it",
  "michel.binkhorst@xs4all.nl",
  "neske.joscha@gmail.com",
  "oluwaseunmauwedo@gmail.com",
  "p.homoky@gmail.com",
  "priart@gmail.com",
  "rohitmeshram000@gmail.com",
  "tommy.roman.hater@gmail.com",
  "vurukondasaiteja13@gmail.com",
  "joscha7676@gmail.com",
  "jcodog@cleoai.cloud",
  "hola@tomasholtz.com",
  "jorge@heyjorge.dev",
  "hello@joshtriedcoding.com",
  "8020ui@gmail.com",
  "danielcspaiva@gmail.com",
  "getoaarm1@gmail.com",
  "johnyeocx@gmail.com",
  "joscha7676@gmail.com",
  "me@nevillebrem.com",
  "myhappyagency@gmail.com",
  "ourrahmaan@gmail.com",
  "ratan.maurya@gmail.com",
  "stefanbinoj.007@gmail.com",
  "taikimingqu@gmail.com",
  "nizabizaher@gmail.com",
  "jokirillmeerkatz@outlook.de",
  "2607jojo@gmail.com",
  "pietro.dev.07@gmail.com",
  "lucapiccinotti.lp@gmail.com",
  "rathoursourabh5@gmail.com",
]

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
