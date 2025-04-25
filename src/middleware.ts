import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
//   if (process.env.NODE_ENV === "development") {
//     return NextResponse.next()
//   }

  const { pathname } = request.nextUrl

  if (pathname === "/") {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/waitlist")) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL("/", request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
}
