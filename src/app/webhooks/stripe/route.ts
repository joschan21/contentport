import { db } from '@/db'
import { user } from '@/db/schema'
import { stripe } from '@/lib/stripe/client'
import type Stripe from 'stripe'
import { and, eq } from 'drizzle-orm'
import { STRIPE_SUBSCRIPTION_DATA } from '@/constants/stripe-subscription'

/**
 * Validates a Stripe webhook request by verifying its signature and constructing the Stripe event.
 * @param {{ body: any; signature: string }} params - Raw request body and Stripe signature header.
 * @returns {{ event: Stripe.Event | null }} The verified Stripe event, or null if verification failed or secret missing.
 */
const validateWebhook = async ({ body, signature }: { body: any; signature: string }) => {
  const { STRIPE_WEBHOOK_SECRET } = process.env

  if (!STRIPE_WEBHOOK_SECRET) return { event: null }

  const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)

  return { event }
}

/**
 * Handles incoming Stripe webhook POST requests and routes events to the appropriate logic.
 * Supports customer.deleted and customer.updated events.
 * @param {Request} req - The incoming Next.js Request object.
 * @returns {Promise<Response>} HTTP response indicating success or error of event handling.
 */
export const POST = async (req: Request) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response("Error: Missing 'stripe-signature' header", { status: 400 })
  }

  const { event } = await validateWebhook({
    body: req.body,
    signature,
  })

  if (!event) {
    return new Response('Unauthorized: Webhook signature verification failed', {
      status: 403,
    })
  }

  const { data, type } = event

  switch (type) {
    /**
     * Handle customer.deleted: clear local stripeId for the user when the customer is deleted in Stripe.
     */
    case 'customer.deleted': {
      // Clear stripeId when customer is deleted
      const deletedCustomer = data.object as Stripe.Customer
      try {
        await db
          .update(user)
          .set({ stripeId: null })
          .where(eq(user.stripeId, deletedCustomer.id))
        return new Response('Customer stripeId cleared', { status: 200 })
      } catch (err) {
        console.error('Error handling customer.deleted webhook:', err)
        return new Response('Internal Server Error: could not clear stripeId', {
          status: 500,
        })
      }
    }
    /**
     * Handle customer.updated: update local user name when the Stripe customer name changes.
     */
    case 'customer.updated': {
      // Update local user name when customer name changes
      const updatedCustomer = data.object as Stripe.Customer
      const newName = updatedCustomer.name
      if (!newName) {
        return new Response('Missing name in customer.updated webhook', { status: 400 })
      }
      try {
        // Find user and update name if changed
        const userToUpdateQuery = await db
          .select()
          .from(user)
          .where(eq(user.stripeId, updatedCustomer.id))
        const userToUpdate = userToUpdateQuery[0]
        if (!userToUpdate) {
          return new Response('User not found', { status: 404 })
        }
        if (userToUpdate.name !== newName) {
          await db
            .update(user)
            .set({ name: newName })
            .where(eq(user.stripeId, updatedCustomer.id))
          return new Response('User name updated', { status: 200 })
        }
        return new Response('Nothing to update for user', { status: 200 })
      } catch (err) {
        console.error('Error handling customer.updated webhook:', err)
        return new Response('Internal Server Error: could not update user', {
          status: 500,
        })
      }
    }
    case 'customer.subscription.created': {
      const subscription = data.object as Stripe.Subscription
      const { status, items, customer } = subscription

      // Ensure there's a valid customer ID
      if (!customer) {
        return new Response('Missing customer ID on subscription', { status: 400 })
      }

      // Only handle active or trialing subscriptions
      if (!['active', 'trialing'].includes(status)) {
        return new Response(`Subscription status "${status}" not relevant`, {
          status: 200,
        })
      }

      // Grab the first line item (we only support one plan per user)
      const firstItem = items?.data?.[0]
      if (!firstItem) {
        return new Response('Subscription contains no items', { status: 400 })
      }

      // Check that the price ID matches our Pro tier
      if (firstItem.price.id !== STRIPE_SUBSCRIPTION_DATA.priceId) {
        return new Response(`Unrecognized price ID "${firstItem.price.id}"`, {
          status: 200,
        })
      }

      try {
        // Promote the user to the "pro" plan
        await db
          .update(user)
          .set({ plan: 'pro' })
          .where(eq(user.stripeId, String(customer)))

        return new Response('User upgraded to pro plan', { status: 200 })
      } catch (err) {
        console.error('Error handling customer.subscription.created:', err)
        return new Response('Internal Server Error: could not upgrade plan', {
          status: 500,
        })
      }
    }
    case 'customer.subscription.deleted':
      const customerSubscriptionDeleted = data.object
      break
    case 'customer.subscription.paused':
      const customerSubscriptionPaused = data.object
      break
    case 'customer.subscription.resumed':
      const customerSubscriptionResumed = data.object
      break
    case 'customer.subscription.updated':
      const customerSubscriptionUpdated = data.object
      break
    case 'invoice.paid':
      const invoicePaid = data.object
      const customerId = invoicePaid.customer
      const firstItem = invoicePaid.lines?.data?.[0]
      if (!firstItem) {
        return new Response('Invoice has no line items', { status: 400 })
      }
      // Only handle our Pro plan price
      if (firstItem.pricing?.price_details?.price !== STRIPE_SUBSCRIPTION_DATA.priceId) {
        return new Response(
          `Unrecognized price ID "${firstItem.pricing?.price_details?.price}"`,
          {
            status: 200,
          }
        )
      }
      try {
        // Only upgrade if the user is still on "free"
        const { rowCount } = await db
          .update(user)
          .set({ plan: 'pro' })
          .where(and(eq(user.stripeId, String(customerId)), eq(user.plan, 'free')))

        if (rowCount === 0) {
          // No upgrade needed (either user not found or already on pro)
          return new Response('No upgrade needed', { status: 200 })
        }

        return new Response('User upgraded to pro plan', { status: 200 })
      } catch (err) {
        console.error('Error handling invoice.paid webhook:', err)
        return new Response('Internal Server Error: could not upgrade plan', {
          status: 500,
        })
      }
    default:
      return new Response('Unhandled event type', { status: 400 })
  }
}

/**
 * Rejects any GET requests to the webhook endpoint as method not allowed.
 * @returns {Response} 405 Method Not Allowed response.
 */
export const GET = () => {
  return new Response('Method not allowed', { status: 405 })
}
