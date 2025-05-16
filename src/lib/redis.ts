import "dotenv/config"
import { Redis } from "@upstash/redis"

export const redis = Redis.fromEnv()
