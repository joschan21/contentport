# contentport

Contentport is an open-source AI-powered content creation and publishing platform built on JStack (Next.js, TypeScript, Tailwind CSS, Drizzle ORM, and Bun).

## Features

- AI-assisted tweet composition with context-aware suggestions
- Real-time content editing and history management
- Integrated image and media handling
- Stripe-based subscription and payment management
- Plugin architecture for custom extensions

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS for styling
- Drizzle ORM for database interactions
- Bun for runtime and package management
- Qstash for background jobs and webhooks

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- pnpm (recommended) or npm/yarn
- PostgreSQL or Redis instance (as configured in your environment)
- Stripe account for subscription features

### Installation

```bash
# Clone the repository
git clone https://github.com/joschan21/contentport.git
cd contentport

# Install dependencies
pnpm install

# Copy environment variables template and configure
cp .env.example .env

# Run database migrations and seed data
bun prisma migrate dev --name init

# Seed Stripe products
bun run seed-stripe

# Start development server
pnpm dev
```

### Deployment

Contentport can be deployed on Vercel, Cloudflare Pages, or any Next.js-compatible platform:

```bash
pnpm build
pnpm start
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and setup instructions.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
