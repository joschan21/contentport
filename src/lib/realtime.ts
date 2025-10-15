import z from 'zod/v4'
import { Realtime, InferRealtimeEvents } from '@upstash/realtime'
import { redis } from './redis'

const schema = {
  tweet: z.object({
    status: z.object({
      id: z.string(),
      status: z.enum(['pending', 'started', 'waiting', 'success', 'error']),
      timestamp: z.number().optional(),
      tweetId: z.string().optional(),
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
