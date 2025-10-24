import z from 'zod/v4'
import { Realtime, InferRealtimeEvents } from '@upstash/realtime'
import { redis } from './redis'

const schema = {
  index_tweets: {
    status: z.enum(['started', 'resolved']),
  },
  index_memories: {
    status: z.enum(['started', 'success', 'error']),
  },
  tweet: {
    status: z.object({
      status: z.enum(['started', 'waiting', 'success', 'error']),
      tweetId: z.string(),
      timestamp: z.number().optional(),
    }),
  },
}

export const realtime = new Realtime({
  schema,
  redis,
})

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
