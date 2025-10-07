import { redis } from '@/lib/redis'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'

interface RouteParams {
  params: Promise<{
    token: string
  }>
}

export const GET = async (req: NextRequest, { params }: RouteParams) => {
  const { token } = await params

  const redirectUrl = await redis.get<string>(`redirect:${token}`)

  if (!redirectUrl) {
    return redirect('/sign-in?expired=true')
  }

  return redirect(redirectUrl)
}
