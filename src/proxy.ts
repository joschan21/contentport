import { betterFetch } from '@better-fetch/fetch'
import type { auth } from './lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { redis } from './lib/redis'

type Session = typeof auth.$Infer.Session

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const { data: session } = await betterFetch<Session>('/api/auth/get-session', {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get('cookie') || '',
    },
  })

  if (!session) {
    if (pathname.startsWith('/studio')) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    if (pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  if (session?.user) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/studio', request.url))
    }

    const account = await redis.exists(`active-account:${session.user.email}`)
    const isOnboarded = Boolean(account)

    if (pathname.startsWith('/studio') && !isOnboarded) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    if (pathname.startsWith('/onboarding') && isOnboarded) {
      return NextResponse.redirect(new URL('/studio', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/onboarding', '/studio'],
}
