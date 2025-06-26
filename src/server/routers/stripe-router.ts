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
import { j, privateProcedure } from '@/server/jstack'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'

export const stripeRouter = j.router({
  /**
   * Initiate a Stripe Checkout Session for subscription purchase.
   * Ensures a Customer exists (creates one and updates user.stripeId in DB if missing).
   * @returns JSON with { url: string | null } for redirecting to Stripe Checkout.
   */
  checkout_session: privateProcedure.query(
    async ({
      c,
      ctx: {
        user: { id, email, name, stripeId },
      },
    }) => {
      try {
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
      try {
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
        }

        const portal = await stripe.billingPortal.sessions.create({
          customer: customer.id,
          return_url: `${url}/studio/settings`,
        })
        return c.json({ url: portal.url ?? null })
      } catch (error: unknown) {
        console.error('Error creating billing portal session:', error)
        const message = error instanceof Error ? error.message : 'Unknown error occurred'
        return c.json({ error: message })
      }
    }
  ),
})
