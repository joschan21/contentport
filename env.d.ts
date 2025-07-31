declare module "bun" {
  interface Env {
    OPENROUTER_API_KEY: string;

    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;

    QSTASH_URL: string;
    QSTASH_TOKEN: string;
    QSTASH_CURRENT_SIGNING_KEY: string;
    QSTASH_NEXT_SIGNING_KEY: string;

    TWITTER_BEARER_TOKEN: string;
    TWITTER_API_KEY: string;
    TWITTER_API_SECRET: string;
    TWITTER_ACCESS_TOKEN: string;
    TWITTER_ACCESS_TOKEN_SECRET: string;
    TWITTER_CLIENT_ID: string;
    TWITTER_CLIENT_SECRET: string;
    TWITTER_CONSUMER_KEY: string;
    TWITTER_CONSUMER_SECRET: string;

    BETTER_AUTH_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;

    DATABASE_URL: string;

    FIRECRAWL_API_KEY: string;

    AWS_GENERAL_ACCESS_KEY: string;
    AWS_GENERAL_SECRET_KEY: string;
    AWS_REGION: string;
    NEXT_PUBLIC_S3_BUCKET_NAME: string;

    STRIPE_PUBLIC_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;

    NEXT_PUBLIC_POSTHOG_KEY: string;
    NEXT_PUBLIC_POSTHOG_HOST: string;
    POSTHOG_API_KEY: string;
    POSTHOG_ENV_ID: string;

    DEEPL_API_KEY: string;
  }
}