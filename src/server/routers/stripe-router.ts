/**
 * stripeRouter handles Stripe subscription and billing portal flows.
 *
 * - checkout_session: create/retrieve a Stripe Customer for the current user,
 *   persist the customer.id on the user record in the database, and
 *   return a Checkout Session URL for subscription purchase.
 *
 * - billing_portal: create/retrieve a Stripe Customer for the current user,
 *   persist the customer.id on the user record if needed, and
 *   return a Billing Portal session URL for managing existing subscriptions.
 */

import { STRIPE_SUBSCRIPTION_DATA } from '@/constants/stripe-subscription'
import { db } from '@/db'
import { user } from '@/db/schema'
import { stripe } from '@/lib/stripe/client'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

export const stripeRouter = j.router({
  /**
   * Initiate a Stripe Checkout Session for subscription purchase.
   * Ensures a Customer exists (creates one and updates user.stripeId in DB if missing).
   * @returns JSON with { url: string | null } for redirecting to Stripe Checkout.
   */
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
        const url = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
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
          success_url: `${url}/studio/settings?s=processing`,
          cancel_url: `${url}/studio/settings?s=cancelled`,
          payment_method_types: ['card', 'link', 'paypal'],
          adaptive_pricing: {
            enabled: true,
          },
          currency: 'usd',
          consent_collection: {
            payment_method_reuse_agreement: {
              position: 'auto',
            },
          },
          payment_method_collection: 'if_required',
          // only include trial settings if the user requests a trial and hasn't had one before
          // ...(trial &&
          //   !hadTrial && {
          //     subscription_data: {
          //       trial_period_days: 7,
          //       trial_settings: {
          //         end_behavior: {
          //           missing_payment_method: 'pause',
          //         },
          //       },
          //     },
          //   }),
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
      const url = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
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
        return_url: `${url}/studio/settings`,
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

  subscription: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx

    if (user.plan === 'pro') {
      return c.json({ status: 'active' })
    }

    return c.json({ status: 'inactive' })
  }),
})
