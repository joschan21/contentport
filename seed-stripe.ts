// Ensure script can load and read env variables
import { config } from 'dotenv'
config()

// Import and set up stripe
import { Stripe } from 'stripe'
const stripe = new Stripe(Bun.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
})

import { STRIPE_SUB_TEMPLATE } from '@/constants/stripe-products'
import { writeFileSync } from 'fs'
import path from 'path'
import {
  STRIPE_SUBSCRIPTION_DATA,
  StripeSubscriptionData,
} from '@/constants/stripe-subscription'

// Path to the TS file to update
const stripeSubFile = path.resolve(__dirname, 'src/constants/stripe-subscription.ts')
// Helper to persist TS constant file
function persistData(data: StripeSubscriptionData) {
  const content = `export interface StripeSubscriptionData {
  id: string | null;
  priceId?: string | null;
}

export const STRIPE_SUBSCRIPTION_DATA: StripeSubscriptionData = ${JSON.stringify(
    data,
    null,
    2
  )};`
  writeFileSync(stripeSubFile, content)
}
// Clone mutable copy of imported constant
const stripeSubData: StripeSubscriptionData = { ...STRIPE_SUBSCRIPTION_DATA }
const prodID = stripeSubData.id
const storedPriceId = stripeSubData.priceId ?? null

// Check if product already exists and set the id in constant if it does and isn't already set.
const checkExisting = async () => {
  let stored: boolean = false
  let onStripe: boolean = false
  let priceId: string | undefined
  let product: Stripe.Product | undefined

  // Check if the product exists on stripe
  if (prodID) {
    console.log('Product exists in stored constant')
    product = await stripe.products.retrieve(prodID, {
      expand: ['default_price', 'marketing_features'],
    })
    if (product && !product.deleted && product.active) {
      onStripe = true
    } else {
      console.log(`Stored product ${prodID} is archived or inactive, ignoring.`)
      product = undefined
    }
  } else {
    console.log("Product doesn't exist in stored constant")
    const productSearch = await stripe.products.search({
      query: `name:"${STRIPE_SUB_TEMPLATE.name}"`,
      expand: ['data.default_price', 'data.marketing_features'],
    })
    const activeResults = productSearch.data.filter((p) => p.active && !p.deleted)
    if (activeResults.length > 0) {
      onStripe = true
      product = activeResults[0]
    } else {
      console.log(`No active products found matching "${STRIPE_SUB_TEMPLATE.name}".`)
    }
  }

  if (!stored && onStripe) {
    console.log('On stripe but not stored, storing.')
    // Persist existing product and price IDs
    priceId = (product!.default_price as Stripe.Price).id
    stripeSubData.id = product!.id
    stripeSubData.priceId = priceId
    persistData(stripeSubData)
    console.log(`Updated JSON with product ID: ${product!.id}, price ID: ${priceId}`)
    stored = true
  }

  if (!stored && !onStripe) {
    console.log('Creating a new product from template and storing.')
    product = await stripe.products.create(STRIPE_SUB_TEMPLATE)
    onStripe = true

    // Set and persist new product and price IDs
    priceId = (product.default_price as Stripe.Price).id
    stripeSubData.id = product.id
    stripeSubData.priceId = priceId
    persistData(stripeSubData)
    console.log(`Updated JSON with product ID: ${product.id}, price ID: ${priceId}`)
    stored = true
  }

  // Write updated ID back to JSON if stored
  if (stored && product) {
    // Ensure both IDs are current
    stripeSubData.id = product.id
    stripeSubData.priceId = priceId || (product.default_price as Stripe.Price).id
    persistData(stripeSubData)
    console.log(
      `Final JSON update: product ID ${product.id}, price ID ${stripeSubData.priceId}`
    )
  }

  console.log({ stored, onStripe, product })
}

checkExisting()
