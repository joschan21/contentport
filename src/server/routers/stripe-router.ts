import { STRIPE_SUBSCRIPTION_DATA } from '@/constants/stripe-subscription'
import { db } from '@/db'
import { user } from '@/db/schema'
import { stripe } from '@/lib/stripe/client'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'
import { getBaseUrl } from '@/constants/base-url'

export const stripeRouter = j.router({
  checkout_session: privateProcedure
    .input(
      z.object({
        trial: z.boolean().optional(),
      }),
    )
    .query(
      async ({
        c,
        ctx: {
          user: { id, email, name, stripeId, hadTrial },
        },
        input: { trial },
      }) => {
        let customer: Stripe.Customer | undefined

        if (stripeId) {
          customer = (await stripe.customers.retrieve(stripeId)) as Stripe.Customer
        } else {
          const customerSearch = await stripe.customers.search({
            query: `email: "${email}"`,
          })
          customer = customerSearch.data[0] as Stripe.Customer | undefined
        }

        if (!customer) {
          customer = await stripe.customers.create({ name: name, email: email })

          await db
            .update(user)
            .set({
              stripeId: customer.id,
            })
            .where(eq(user.id, id))
        } else {
          await db.update(user).set({ stripeId: customer.id }).where(eq(user.id, id))
        }

        const checkout = await stripe.checkout.sessions.create({
          mode: 'subscription',
          billing_address_collection: 'auto',
          line_items: [{ price: STRIPE_SUBSCRIPTION_DATA.priceId!, quantity: 1 }],
          customer: customer.id,
          success_url: `${getBaseUrl()}/studio/settings?s=processing`,
          cancel_url: `${getBaseUrl()}/studio/settings?s=cancelled`,
          payment_method_types: ['card', 'link'],
          adaptive_pricing: {
            enabled: true,
          },
          currency: 'usd',
          allow_promotion_codes: true,
          consent_collection: {
            payment_method_reuse_agreement: {
              position: 'auto',
            },
          },
          payment_method_collection: 'if_required',
        })
        return c.json({ url: checkout.url ?? null })
      },
    ),

  /**
   * Create a Stripe Billing Portal session to allow the user to manage their subscription.
   * Ensures a Customer exists (creates one and updates user.stripeId in DB if missing).
   * @returns JSON with { url: string | null } for redirecting to Stripe Billing Portal.
   */
  billing_portal: privateProcedure.query(
    async ({
      c,
      ctx: {
        user: { id, name, email, stripeId },
      },
    }) => {
      let customer: Stripe.Customer | undefined

      if (stripeId) {
        customer = (await stripe.customers.retrieve(stripeId)) as Stripe.Customer
      } else {
        const customerSearch = await stripe.customers.search({
          query: `email: "${email}"`,
        })
        customer = customerSearch.data[0] as Stripe.Customer | undefined
      }

      if (!customer) {
        customer = await stripe.customers.create({ name: name, email: email })

        await db
          .update(user)
          .set({
            stripeId: customer.id,
          })
          .where(eq(user.id, id))
      } else {
        await db.update(user).set({ stripeId: customer.id }).where(eq(user.id, id))
      }

      const portal = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${getBaseUrl()}/studio/settings`,
      })

      return c.json({ url: portal.url })
    },
  ),

  subscription_product: privateProcedure.query(
    async ({
      c,
      ctx: {
        user: { hadTrial },
      },
    }) => {
      try {
        const product = await stripe.products.retrieve(STRIPE_SUBSCRIPTION_DATA.id!, {
          expand: ['default_price'],
        })
        if (!product || !product.active) {
          return c.json({ error: 'No subscription available' })
        }

        const offerTrial = true
        const enableTrial: boolean = offerTrial && !hadTrial

        return c.json({
          subscription: {
            name: product.name,
            description: product.description,
            features: product.marketing_features,
            price: product.default_price as Stripe.Price,
            enableTrial,
          },
        })
      } catch (error) {
        console.error('Error fetching subscription product:', error)
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        return c.json({ error: message })
      }
    },
  ),

  get_active_subscription: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx

    if (!user.stripeId) {
      return c.json({ hasActiveSubscription: false })
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeId,
      status: 'active',
    })

    const activeNonCancelledSubscriptions = subscriptions.data.filter(
      (sub) => !sub.cancel_at_period_end
    )

    return c.json({ hasActiveSubscription: activeNonCancelledSubscriptions.length > 0 })
  }),
})
