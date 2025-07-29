<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://www.contentport.io/">
    <img src="./public/favicon.ico" alt="Logo" width="80" height="80">
  </a>

<h3 align="center">Contentport</h3>

  <p align="center">
    The content engine for software companies
    <br />
    <a href="https://www.contentport.io/">View Demo</a>
    ·
    <a href="https://github.com/joschan21/contentport/issues">Report Bug</a>
    ·
    <a href="https://github.com/joschan21/contentport/issues">Request Feature</a>
  </p>

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-%23000000.svg?style=for-the-badge&logo=next.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-%23336791.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![Neon](https://img.shields.io/badge/Neon-%2300FF00.svg?style=for-the-badge&logo=neon&logoColor=black)
![X](https://img.shields.io/badge/X-%23000000.svg?style=for-the-badge&logo=x&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Upstash](https://img.shields.io/badge/Upstash-%236F00FF.svg?style=for-the-badge&logo=upstash&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-%23DC382D.svg?style=for-the-badge&logo=redis&logoColor=white)

</div>

## **Prerequisites**

Contentport needs [Bun](https://bun.com/) installation.

## **Setup environment**

### AI

Contentport uses the [OpenRouter](https://github.com/OpenRouterTeam/ai-sdk-provider) provider, which supports hundreds of models. Choose your preferred AI model and add your API key to the .env file:

```bash
# AI
OPENROUTER_API_KEY=<YOUR_API_KEY>
```

### AWS Setup

You have two options for S3 integration:

#### Option 1: Real AWS S3 Bucket

To use a real AWS S3 bucket, follow these steps:

- Create an S3 bucket in your AWS account.
- Set up an IAM user with access to that bucket.
- Add the following environment variables to your .env file:
  ```bash
  AWS_GENERAL_ACCESS_KEY=<YOUR_ACCESS_KEY>
  AWS_GENERAL_SECRET_KEY=<YOUR_SECRET_KEY>
  AWS_REGION=<YOUR_REGION>
  NEXT_PUBLIC_S3_BUCKET_NAME=<YOUR_BUCKET_NAME>
  NEXT_PUBLIC_AWS_USE_LOCAL_BOOL=false
  AWS_S3_ENDPOINT= # leave this empty
  ```

#### 🐳 Option 2: Local Docker S3

If you prefer not to use a real AWS account, you can emulate S3 locally using [localstack](https://www.localstack.cloud/).

In order to setup the bucket, first you need to make sure:

1. Install Required Tools
   - Ensure Docker is installed and running on your machine. LocalStack runs in a Docker container.
   - Install the LocalStack CLI to manage the LocalStack environment.
     ```bash
     brew install localstack
     ```
   - Install AWS CLI and the awslocal wrapper for simplified interaction with LocalStack.
     ```bash
     brew install awscli-local
     ```

2. Start LocalStack.

   ```bash
   localstack start
   ```

3. Verify LocalStack is running.

   ```bash
   localstack status services
   ```

   Look for s3 with status ✔ available or ✔ running.

4. Configure AWS CLI for LocalStack

   ```bash
   aws configure --profile localstack
   ```

   Use these dummy values:
   - **AWS Access Key ID**: test
   - **AWS Secret Access Key**: test
   - **Default region name**: us-east-1
   - **Default output format**: json

5. Create a Bucket

   ```bash
   awslocal s3api create-bucket --bucket sample-bucket
   ```

6. Verify Bucket Exists

   ```bash
   awslocal s3api list-buckets
   ```

7. Set Up CORS

   ```json
   {
     "CORSRules": [
       {
         "AllowedHeaders": ["*"],
         "AllowedMethods": ["GET", "PUT", "POST"],
         "AllowedOrigins": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

   Apply the CORS configuration:

   ```bash
   awslocal s3api put-bucket-cors --bucket sample-bucket --cors-configuration file://cors-config.json
   ```

   Verify the CORS settings:

   ```
   awslocal s3api get-bucket-cors --bucket sample-bucket
   ```

   You can now delete cors-config.json.

- Update Your .env.local
  ```bash
  AWS_ACCESS_KEY_ID=test
  AWS_SECRET_ACCESS_KEY=test
  AWS_REGION=us-east-1
  AWS_S3_ENDPOINT=http://localhost:4566
  NEXT_PUBLIC_S3_BUCKET_NAME=sample-bucket
  AWS_USE_LOCAL_BOOL=true
  ```

### Redis

- Visit [Upstash](https://upstash.com) and sign up for an account (or log in if you already have one)

- In the Upstash Console, navigate to the **Redis** section from the top navigation bar.

- Click **Create Database**.

- Enter a **Name** for your database (e.g., contentport-redis).

- Click **Create** to provision the database.

- Once the database is created, go to the **Details** page for your database in the Upstash Console.

- Locate the **Connect** field, copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
  ![photo_2025-07-26_06-23-44](https://github.com/user-attachments/assets/8e612114-d0f6-49f0-99ce-d321c683cc1f)

- Paste them into your `.env` file.

  ```bash
  # REDIS
  UPSTASH_REDIS_REST_URL=<YOUR_KEY>
  UPSTASH_REDIS_REST_TOKEN=<YOUR_KEY>
  ```

### Serverless messaging ( QStash )

Via your [Upstash](https://upstash.com) console, go to the **QStash** tab, create a token, and copy `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY`.

<img width="942" height="281" alt="Screenshot 2025-07-26 at 6 16 33 AM" src="https://github.com/user-attachments/assets/5c0ad048-a81c-438f-82a5-9c68db969e18" />

Then paste them into your `.env` file:

```bash
# SERVERLESS MESSAGING (QSTASH)
QSTASH_URL=<YOUR_KEY>
QSTASH_TOKEN=<YOUR_KEY>
QSTASH_CURRENT_SIGNING_KEY=<YOUR_KEY>
QSTASH_NEXT_SIGNING_KEY=<YOUR_KEY>
```

### Twitter Keys

- Sign up for a Twitter developer account at [developer.x.com](http://developer.x.com) using your Twitter account.

- Create a free project through the [Developer Portal](https://developer.x.com/en/portal/dashboard).

- Navigate to your project.
  ![photo_2025-07-26_05-23-44](https://github.com/user-attachments/assets/e663172a-5c12-46eb-8e07-747ae9370932)

- From **Settings Tab** , find **User authentication settings** and click on **Edit.**

- Scroll down and add [`http://localhost:3000/api/auth_router/callback`](http://localhost:3000/api/auth_router/callback) as **Callback URI / Redirect URL**.
  ![photo_2025-07-26_05-23-44](https://github.com/user-attachments/assets/d19e6122-8ad0-4aa9-bd0c-3f444dacd486)

- Go back and this time select **Keys and tokens.**
  ![photo_2025-07-26_05-24-00](https://github.com/user-attachments/assets/fed236e5-fed0-4f71-bb22-f96085f16acf)

- Generate and obtain your Twitter keys.
  ![photo_2025-07-26_05-23-55](https://github.com/user-attachments/assets/501bb6ae-bd1e-4b11-9516-d9ee6af5dae6)

- Then paste them into your `.env` file.

  ```bash
  # TWITTER KEYS
  TWITTER_BEARER_TOKEN=<YOUR_KEY>
  TWITTER_API_KEY=<YOUR_KEY>
  TWITTER_API_SECRET=<YOUR_KEY>
  TWITTER_ACCESS_TOKEN=<YOUR_KEY>
  TWITTER_ACCESS_TOKEN_SECRET=<YOUR_KEY>
  TWITTER_CLIENT_ID=<YOUR_KEY>
  TWITTER_CLIENT_SECRET=<YOUR_KEY>
  TWITTER_CONSUMER_KEY=<YOUR_KEY>
  TWITTER_CONSUMER_SECRET=<YOUR_KEY>
  ```

### Google Auth

- Sign into the [Google Cloud Console](https://console.cloud.google.com/), select or create a new project from the top dropdown, enter a project name, and click **Create**.

- Navigate to **APIs & Services &gt; Credentials**, click **Create Credentials &gt; OAuth client ID**, select **Web application**, enter a name, add an **Authorized redirect URI** (http://localhost:3000/api/auth/callback/google), and click **Create** to copy the **Client ID** and **Client Secret**.

Watch this [quick tutorial](https://youtu.be/TjMhPr59qn4?si=aYjl_SRFmOHopndX) if you need help.

```bash
# AUTH
BETTER_AUTH_SECRET=my-secret
GOOGLE_CLIENT_ID=<YOUR_KEY>
GOOGLE_CLIENT_SECRET=<YOUR_KEY>
```

### DB

- Sign up at [Neon](https://neon.tech), log in, and create a new project in the Neon Console by clicking **Create a project**.

- In the project dashboard, go to **Connection Details**, copy the connection string (e.g., `postgres://user:`[`password@hostname.us-east-2.aws.neon.tech`](mailto:password@hostname.us-east-2.aws.neon.tech)`/neondb?sslmode=require`), and add it to your `.env` file as:

  ```bash
  # DB
  DATABASE_URL=<YOUR-CONNECTION-STRING>
  ```

- Run `bun run db:push` to push the database migrations.

- \[Optional\] You can run `bun run db:studio` to use Drizzle Studio, or you can simply use Neon to browse through your database.

### Web Crawling

Obtain your API key from [Firecrawl](https://www.firecrawl.dev/) and paste it into your `.env`

```bash
# WEB CRAWLING (FIRECRAWL)
FIRECRAWL_API_KEY=<YOUR_KEY>
```

### Payments

- Sign up at Stripe, log in, and enable Test Mode from the Stripe Dashboard toggle, copy the Test Publishable Key (pk_test\_...) and Test Secret Key (sk_test\_...) from **Developers &gt; API Keys** and add to your `.env` file:

  ```bash
  # PAYMENTS
  STRIPE_PUBLIC_KEY=<YOUR_KEY>
  STRIPE_SECRET_KEY=<YOUR_KEY>
  ```

- To test Stripe webhooks locally, first install Stripe CLI by following the instructions at [Stripe CLI](https://docs.stripe.com/stripe-cli) for your operating system. Log in with `stripe login`, then run `stripe listen --forward-to` [`http://localhost:8080/webhook`](http://localhost:8080/webhook) to start the webhook listener, copying the displayed **Webhook Signing Secret** (`whsec_...`) to your `.env` file as `STRIPE_WEBHOOK_SECRET`.

  ```bash
  STRIPE_WEBHOOK_SECRET=<YOUR_SECRET>
  ```

### Analytics

Sign up at [PostHog](https://posthog.com), copy your **Project API Key** and **API Host** from the PostHog Dashboard under **Project Settings**, and paste them into your `.env`.

```bash
NEXT_PUBLIC_POSTHOG_KEY=<YOUR_KEY>
NEXT_PUBLIC_POSTHOG_HOST=<YOUR_HOST>
POSTHOG_API_KEY=<YOUR_API_KEY>
```
