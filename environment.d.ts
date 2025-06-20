declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string
      DEEPL_API_KEY: string
      GOOGLE_GENERATIVE_AI_API_KEY: string
      ANTHROPIC_API_KEY: string
      TWITTER_BEARER_TOKEN: string
      XAI_API_KEY: string
      UPSTASH_REDIS_REST_URL: string
      UPSTASH_REDIS_REST_TOKEN: string
      TWITTER_API_KEY: string
      TWITTER_API_SECRET: string
      TWITTER_ACCESS_TOKEN: string
      TWITTER_ACCESS_TOKEN_SECRET: string
      BETTER_AUTH_SECRET: string
      DATABASE_URL: string
      GOOGLE_CLIENT_ID: string
      GOOGLE_CLIENT_SECRET: string
      RESEND_API_KEY: string
      FIRECRAWL_API_KEY: string
      AWS_GENERAL_ACCESS_KEY: string
      AWS_GENERAL_SECRET_KEY: string
      AWS_REGION: string
      STRIPE_PUBLIC_KEY: string
      STRIPE_SECRET_KEY: string
    }
  }
}
