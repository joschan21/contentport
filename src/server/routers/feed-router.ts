import { db } from '@/db'
import { referenceTweets, user } from '@/db/schema'
import { EnrichedTweet, enrichTweet } from 'react-tweet'
import { getTweet } from 'react-tweet/api'
import { j, privateProcedure } from '../jstack'
import { z } from 'zod'
import { redis } from '@/lib/redis'
import superjson from 'superjson'
import { Redis } from '@upstash/redis'

const redis_raw = Redis.fromEnv({
  automaticDeserialization: false,
})

export const feedRouter = j.router({
  refresh: privateProcedure.post(async ({ c, ctx, input }) => {
    const { user } = ctx

    const keywords = await redis.get<string[]>(`feed-keywords:${user.email}`)

    const res = await fetch(`${process.env.TWITTER_API_SERVICE}/feed/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CONTENTPORT_IDENTITY_KEY}`,
      },
      body: JSON.stringify({ userId: user.id, keywords }),
    })

    const data = await res.json()

    console.log('[FEED RESPONSE]', JSON.stringify(data, null, 2));

    const { newIds, scanStartedAt } = z
      .object({
        newIds: z.array(z.string()),
        scanStartedAt: z.number().describe('Unix timestamp (seconds) scan started at'),
      })
      .parse(data)

    await redis.set<number>(`last-scan:${user.id}`, scanStartedAt)

    return c.json({ newIds })
  }),

  get_tweets: privateProcedure
    .input(z.object({ sortBy: z.enum(['recent', 'popular']) }))
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx

      const ids = await redis.smembers(`feed:${user.id}`)

      const enriched = await Promise.all(
        ids.map(async (id) => {
          const cached = await redis_raw.get<string>(`enriched-tweet:${id}`)
          if (cached) {
            return superjson.parse(cached) as EnrichedTweet
          }

          const tweet = await getTweet(id)

          if (tweet) {
            const enriched = enrichTweet(tweet)
            await redis_raw.set(`enriched-tweet:${id}`, superjson.stringify(enriched))
            return enriched
          }
        }),
      )

      const filtered = enriched.filter(Boolean)

      let sorted: EnrichedTweet[] = []

      if (input.sortBy === 'recent') {
        sorted = filtered.sort((a, b) => {
          const timeScore =
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          return timeScore
        })
      } else {
        sorted = filtered.sort((a, b) => {
          const favoriteScore = (b.favorite_count || 0) - (a.favorite_count || 0)
          return favoriteScore
        })
      }

      return c.json({ tweets: sorted })
    }),

  get_keywords: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const keywords = (await redis.get<string[]>(`feed-keywords:${user.email}`)) ?? []

    return c.json({ keywords })
  }),

  save_keywords: privateProcedure
    .input(
      z.object({
        keywords: z.array(z.string()),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { keywords } = input

      await redis.set(`feed-keywords:${user.email}`, keywords)
      await redis.del(`feed:${user.id}`)
      await redis.del(`last-scan:${user.id}`)

      return c.json({ success: true })
    }),
})
