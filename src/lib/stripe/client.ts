import { Stripe } from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion: '2025-05-28.basil',
  apiVersion: '2025-06-30.basil',
  typescript: true,
})
