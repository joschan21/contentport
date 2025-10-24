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
}

export const realtime = new Realtime({
  schema,
  redis,
})

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>
