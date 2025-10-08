export interface StripeSubscriptionData {
  id: string | null
  priceId?: string | null
}

export const STRIPE_SUBSCRIPTION_DATA: StripeSubscriptionData = {
  id:
    process.env.NODE_ENV === 'production' ? 'prod_Sdai9fYhooL16t' : 'prod_SdTUFyIfmC3dGO',
  priceId:
    process.env.NODE_ENV === 'production'
      ? 'price_1RiJX1A19umTXGu8k9V4fMkn'
      : 'price_1RiCXfA19umTXGu8XAnmgBvK',
}
