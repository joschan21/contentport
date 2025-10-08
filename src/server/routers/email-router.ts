import { db } from '@/db'
import { user as userSchema } from '@/db/schema'
import { sendWelcomeEmail } from '@/lib/email'
import { redis } from '@/lib/redis'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { j, qstashProcedure } from '../jstack'

export const emailRouter = j.router({
  send_welcome_email: qstashProcedure.mutation(async ({ c, ctx }) => {
    const { body } = ctx
    const { userId } = body

    const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId))

    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    if (!user.email || !user.name) {
      throw new HTTPException(400, { message: 'Missing user email or name' })
    }

    const receivedWelcomeEmail = await redis.exists(`received-welcome-email`, userId)

    if (receivedWelcomeEmail) {
      return c.json({ success: true, message: 'Welcome email already sent' })
    }

    const result = await sendWelcomeEmail({
      email: user.email,
      name: user.name.split(' ')[0] || user.name,
    })

    if (result.success) {
      await redis.hset(`received-welcome-email`, { [userId]: true })
    }

    return c.json(result)
  }),
})
