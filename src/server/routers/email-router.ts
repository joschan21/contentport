import { sendWelcomeEmail } from '@/lib/email'
import { redis } from '@/lib/redis'
import { HTTPException } from 'hono/http-exception'
import { j, privateProcedure } from '../jstack'

export const emailRouter = j.router({
  send_welcome_email: privateProcedure.mutation(async ({ c, ctx }) => {
    const { user } = ctx

    if (!user.email || !user.name) {
      throw new HTTPException(400, { message: 'Missing user email or name' })
    }

    const receivedWelcomeEmail = await redis.exists(`received-welcome-email`, user.id)

    if (receivedWelcomeEmail) {
      return c.json({ success: true, message: 'Welcome email already sent' })
    }

    const result = await sendWelcomeEmail({
      email: user.email,
      name: user.name.split(' ')[0] || user.name,
    })

    if (result.success) {
      await redis.hset(`received-welcome-email`, { [user.id]: true })
    }

    return c.json(result)
  }),
})
