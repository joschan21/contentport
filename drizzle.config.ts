import { type Config } from "drizzle-kit"

export default {
  schema: "./src/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: Bun.env.DATABASE_URL,
  },
  out: "./migrations",
} satisfies Config
