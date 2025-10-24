import { handle } from '@upstash/realtime'
import { realtime } from '@/lib/realtime'
import { HTTPException } from 'hono/http-exception'
import { auth } from '@/lib/auth'

export const GET = handle({
  realtime,
  middleware: async ({ request, channels }) => {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new HTTPException(403, { message: 'Log in to access this resource' })
    }

    for (const channel of channels) {
      if (!channel.startsWith(session.user.id)) {
        return new Response('Forbidden', { status: 403 })
      }
    }
  },
})
