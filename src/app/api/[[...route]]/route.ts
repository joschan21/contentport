import appRouter from "@/server"
import { handle } from "hono/vercel"

const logger = () => {
  console.log("JSTACK RAN")
  return appRouter.handler
}

// This route catches all incoming API requests and lets your appRouter handle them.
export const GET = handle(logger())
export const POST = handle(logger())
