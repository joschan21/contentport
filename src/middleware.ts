import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./lib/auth"
import { redis } from "./lib/redis"

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const { pathname } = req.nextUrl

  if (pathname.includes("/studio")) {
    const session = await auth.api.getSession({ headers: req.headers })
    const allowlist = await redis.smembers("allowlist")

    if (session && allowlist.includes(session.user.email)) {
      return NextResponse.next()
    } else {
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|public/|images|favicon.ico|robots.txt|sitemap.xml|manifest.json).*)",
  ],
}
