import { STRIPE_SUBSCRIPTION_DATA } from '@/constants/stripe-subscription'
import { stripe } from '@/lib/stripe/client'
import { j, privateProcedure } from '@/server/jstack'
import type Stripe from 'stripe'

export const stripeRouter = j.router({
  createCheckout: privateProcedure.query(
    async ({
      c,
      ctx: {
        user: { email, name },
      },
    }) => {
      try {
        const url = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
        const customerSearch = await stripe.customers.search({
          query: `email:"${email}"`,
        })
        let customer = customerSearch.data[0] as Stripe.Customer | undefined
        if (!customer) {
          customer = await stripe.customers.create({ name: name, email: email })
        }
        const checkout = await stripe.checkout.sessions.create({
          mode: 'subscription',
          billing_address_collection: 'auto',
          line_items: [{ price: STRIPE_SUBSCRIPTION_DATA.priceId!, quantity: 1 }],
          customer: customer.id,
          success_url: `${url}/success`,
          cancel_url: `${url}/cancel`,
          payment_method_types: ['card', 'link', 'paypal'],
          adaptive_pricing: {
            enabled: true,
          },
          currency: 'usd',
          consent_collection: {
            payment_method_reuse_agreement: {
              position: 'auto',
            },
            //   terms_of_service: 'required',
          },
        })
        return c.json({ url: checkout.url ?? null })
      } catch (error: unknown) {
        console.error('Error creating checkout session:', error)
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        return c.json({ error: message })
      }
    }
  ),
})
