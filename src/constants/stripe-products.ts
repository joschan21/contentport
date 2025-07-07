import type Stripe from 'stripe'

export const STRIPE_SUB_TEMPLATE: Stripe.ProductCreateParams = {
  name: 'Contentport Pro',
  default_price_data: {
    unit_amount: 20_00,
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
  },
  marketing_features: [
    { name: 'Unlimited created images' },
    { name: 'No watermark on images' },
    { name: 'Unlimited AI messages' },
    { name: 'Unlimited scheduled tweets' },
    { name: 'Unlimited connected accounts' },
  ],
  expand: ['default_price', 'marketing_features'],
  description: 'Schedule unlimited tweets, create unlimited images, and more.',
  statement_descriptor: 'Contentport Pro',
  images: ['https://www.contentport.io/images/square-og-image.png'],
}
