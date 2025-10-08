import { sendProSubscriptionEmail, sendWelcomeEmail } from '@/lib/email'
import { j, privateProcedure } from '../jstack'

export const emailRouter = j.router({
  send_welcome_email: privateProcedure.mutation(async ({ c, ctx }) => {
    const { user } = ctx

    if (!user.email || !user.name) {
      return c.json({ success: false, error: 'Missing user email or name' })
    }

    const result = await sendWelcomeEmail({
      email: user.email,
      name: user.name.split(' ')[0] || user.name,
    })

    return c.json(result)
  }),

  send_pro_email: privateProcedure.mutation(async ({ c, ctx }) => {
    const { user } = ctx

    if (!user.email || !user.name) {
      return c.json({ success: false, error: 'Missing user email or name' })
    }

    const result = await sendProSubscriptionEmail({
      email: user.email,
      name: user.name.split(' ')[0] || user.name,
    })

    return c.json(result)
  }),
})

