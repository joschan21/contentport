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
      databaseTweetId: z.string(),
      status: z.enum(['started', 'waiting', 'success', 'error']),
      twitterTweetId: z.string().optional(),
      timestamp: z.number().optional(),
    }),
  },
}

export const realtime = new Realtime({
  schema,
  redis,
  verbose: true,
})

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
