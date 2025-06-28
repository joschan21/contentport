import type Stripe from 'stripe'

export const STRIPE_SUB_TEMPLATE: Stripe.ProductCreateParams = {
  name: 'Contentport Pro',
  default_price_data: {
    unit_amount: 2000,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
  },
  marketing_features: [
    { name: 'Better AI' },
    { name: 'Unlimited Messages' },
    { name: 'Unlimited Accounts' },
    { name: 'Scheduling' },
    { name: "Josh's love" },
  ],
  expand: ['default_price', 'marketing_features'],
  description: 'The upgraded experience of ContentPort',
  statement_descriptor: 'Contentport Premium',
}
