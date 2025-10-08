import { render } from '@react-email/render'
import { Resend } from 'resend'
import { WelcomeEmail } from '@/emails/welcome-email'
import { ProSubscriptionEmail } from '@/emails/pro-subscription-email'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendWelcomeEmail = async ({
  email,
  name,
}: {
  email: string
  name: string
}) => {
  try {
    const emailHtml = await render(WelcomeEmail({ name }))

    const { data, error } = await resend.emails.send({
      from: 'Josh <josh@mail.contentport.io>',
      to: [email],
      subject: `Welcome to Contentport, ${name}! 👋`,
      html: emailHtml,
    })

    if (error) {
      console.error('[Error sending welcome email]:', error)
      return { success: false, error }
    }

    console.log('[Welcome email sent successfully]:', data)
    return { success: true, data }
  } catch (err) {
    console.error('[Error rendering/sending welcome email]:', err)
    return { success: false, error: err }
  }
}

export const sendProSubscriptionEmail = async ({
  email,
  name,
  invoicePdfUrl,
}: {
  email: string
  name: string
  invoicePdfUrl?: string
}) => {
  try {
    const emailHtml = await render(ProSubscriptionEmail({ name, invoicePdfUrl }))

    const { data, error } = await resend.emails.send({
      from: 'Josh <josh@mail.contentport.io>',
      to: [email],
      subject: `Welcome to Contentport Pro! 🎉`,
      html: emailHtml,
    })

    if (error) {
      console.error('[Error sending pro subscription email]:', error)
      return { success: false, error }
    }

    console.log('[Pro subscription email sent successfully]:', data)
    return { success: true, data }
  } catch (err) {
    console.error('[Error rendering/sending pro subscription email]:', err)
    return { success: false, error: err }
  }
}

