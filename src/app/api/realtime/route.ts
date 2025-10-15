import { handle } from '@upstash/realtime'
import { realtime } from '@/lib/realtime'
import { auth } from '@/lib/auth'
import { HTTPException } from 'hono/http-exception'

export const GET = handle({
  realtime,
  async middleware({ request, channels }) {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
      throw new HTTPException(403, { message: 'Log in to access this resource' })
    }

    if (
      !channels.every(
        (channel) => channel === 'default' || channel.startsWith(session.user.id),
      )
    ) {
      throw new HTTPException(403, {
        message: 'You are not authorized to access this resource',
      })
    }
  },
})
