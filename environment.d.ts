declare global {
  namespace NodeJS {
    interface ProcessEnv {
      OPENAI_API_KEY: string | null
      DEEPL_API_KEY: string | null
      GOOGLE_GENERATIVE_AI_API_KEY: string | null
      ANTHROPIC_API_KEY: string | null
      TWITTER_BEARER_TOKEN: string | null
      XAI_API_KEY: string | null
      UPSTASH_REDIS_REST_URL: string | null
      UPSTASH_REDIS_REST_TOKEN: string | null
      TWITTER_API_KEY: string | null
      TWITTER_API_SECRET: string | null
      TWITTER_ACCESS_TOKEN: string | null
      TWITTER_ACCESS_TOKEN_SECRET: string | null
      BETTER_AUTH_SECRET: string | null
      DATABASE_URL: string | null
      GOOGLE_CLIENT_ID: string | null
      GOOGLE_CLIENT_SECRET: string | null
      RESEND_API_KEY: string | null
      FIRECRAWL_API_KEY: string | null
      AWS_GENERAL_ACCESS_KEY: string | null
      AWS_GENERAL_SECRET_KEY: string | null
      AWS_REGION: string | null
      STRIPE_PUBLIC_KEY: string | null
      STRIPE_SECRET_KEY: string | null
    }
  }
}
