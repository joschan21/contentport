import z from 'zod/v4'
import { Realtime, InferRealtimeEvents } from '@upstash/realtime'
import { redis } from './redis'

const schema = {
  workflow: z.object({
    status: z.string(),
  }),
  chat: z.object({
    message: z.object({
      username: z.string(),
      message: z.string(),
      timestamp: z.number(),
    }),
  }),
  index_tweets: z.object({
    status: z.object({
      status: z.enum(['started', 'resolved']),
    }),
  }),
  index_memories: z.object({
    status: z.object({
      status: z.enum(['started', 'success', 'error']),
    }),
  }),
}

export const realtime = new Realtime({
  schema,
  redis,
})

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
