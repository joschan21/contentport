import { redis } from '@/lib/redis'
import { Redis } from '@upstash/redis'
import { EnrichedTweet, enrichTweet } from 'react-tweet'
import { getTweet, Tweet } from 'react-tweet/api'
import superjson from 'superjson'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'
import { HTTPException } from 'hono/http-exception'

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null))

  for (let i = 0; i <= str1.length; i++) {
    matrix[0]![i] = i
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j]![0] = j
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1,
        matrix[j - 1]![i]! + 1,
        matrix[j - 1]![i - 1]! + indicator,
      )
    }
  }

  return matrix[str2.length]![str1.length]!
}

const fuzzyMatch = (text: string, keyword: string, tolerance: number = 3): boolean => {
  const words = text.toLowerCase().split(/\s+/)
  const keywordLower = keyword.toLowerCase()

  return words.some((word) => {
    if (word.includes(keywordLower) || keywordLower.includes(word)) {
      return true
    }

    return levenshteinDistance(word, keywordLower) <= tolerance
  })
}

const fuzzyIncludes = (text: string, keyword: string, tolerance: number = 1): boolean => {
  const textLower = text.toLowerCase()
  const keywordLower = keyword.toLowerCase()

  if (textLower.includes(keywordLower)) {
    return true
  }

  const words = textLower.split(/\s+/)

  return words.some((word) => {
    if (word.length < keywordLower.length - tolerance) {
      return false
    }

    for (let i = 0; i <= word.length - keywordLower.length + tolerance; i++) {
      for (
        let j = keywordLower.length - tolerance;
        j <= keywordLower.length + tolerance;
        j++
      ) {
        if (i + j > word.length) continue

        const substring = word.substring(i, i + j)
        if (
          substring.length >= keywordLower.length - tolerance &&
          levenshteinDistance(substring, keywordLower) <= tolerance
        ) {
          return true
        }
      }
    }

    return false
  })
}

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

      const keywords = await redis.get<string[]>(`feed-keywords:${user.email}`)
      const ids = await redis.smembers(`feed:${user.id}`)

      const tweetMap: Map<string, EnrichedTweet> = new Map()
      const replyMap: Record<string, string[]> = {}
      const mains = new Set<EnrichedTweet>()

      const allTweets = await Promise.all(
        ids.map(async (id) => {
          const cached = await redis_raw.get<string>(`enriched-tweet:${id}`)
          if (cached) {
            const tweet = superjson.parse(cached) as EnrichedTweet
            tweetMap.set(tweet.id_str, tweet)

            if (tweet.in_reply_to_status_id_str) {
              if (!replyMap[tweet.in_reply_to_status_id_str]) {
                replyMap[tweet.in_reply_to_status_id_str] = []
              }

              replyMap[tweet.in_reply_to_status_id_str]?.push(tweet.id_str)
            } else {
              mains.add(tweet)
            }

            return tweet
          }

          const tweet = await getTweet(id)

          if (tweet) {
            const enriched = enrichTweet(tweet)
            tweetMap.set(enriched.id_str, enriched)

            if (enriched.in_reply_to_status_id_str) {
              if (!replyMap[enriched.in_reply_to_status_id_str]) {
                replyMap[enriched.in_reply_to_status_id_str] = []
              }

              replyMap[enriched.in_reply_to_status_id_str]?.push(enriched.id_str)
            } else {
              mains.add(enriched)
            }

            await redis_raw.set(`enriched-tweet:${id}`, superjson.stringify(enriched))
            return enriched
          }
        }),
      )

      const data: Array<{
        main: EnrichedTweet
        replyChains: Array<Array<EnrichedTweet>>
      }> = []

      const buildReplyChain = async (
        startTweet: EnrichedTweet,
      ): Promise<EnrichedTweet[]> => {
        const chain: EnrichedTweet[] = [startTweet]
        let currentTweet = startTweet

        while (true) {
          const repliesIds = replyMap[currentTweet.id_str]
          if (!repliesIds || repliesIds.length === 0) break

          const nextReplyId = repliesIds[0]
          if (!nextReplyId) break
          const nextTweet = tweetMap.get(nextReplyId)

          if (!nextTweet) break

          chain.push(nextTweet)
          currentTweet = nextTweet
        }

        return chain
      }

      for (const mainTweet of Array.from(mains)) {
        const replyIds = replyMap[mainTweet.id_str] ?? []

        const directReplies = replyIds
          .map((replyId) => tweetMap.get(replyId))
          .filter(Boolean) as EnrichedTweet[]

        const replyChains = await Promise.all(
          directReplies.map(async (directReply) => {
            return await buildReplyChain(directReply)
          }),
        )

        const filteredChains = replyChains.filter((chain) => {
          return chain.some((tweet) => {
            return keywords?.some((keyword) => {
              const text = tweet.entities.reduce((acc, curr) => {
                if (curr.type === 'text') {
                  return acc + curr.text
                } else return acc
              }, '')

              const mentions = tweet.entities.filter(
                (e) =>
                  e.type === 'mention' &&
                  fuzzyIncludes(e.text.toLowerCase(), keyword.toLowerCase()),
              )

              const isRelevant =
                Boolean(fuzzyIncludes(text.toLowerCase(), keyword.toLowerCase())) ||
                Boolean(mentions.length)

              return isRelevant
            })
          })
        })

        data.push({
          main: mainTweet,
          replyChains: filteredChains,
        })
      }

      let sorted: typeof data = []

      if (input.sortBy === 'recent') {
        sorted = data.sort((a, b) => {
          const timeScore =
            new Date(b.main?.created_at || 0).getTime() -
            new Date(a.main?.created_at || 0).getTime()
          return timeScore
        })
      } else {
        sorted = data.sort((a, b) => {
          const favoriteScore =
            (b.main?.favorite_count || 0) - (a.main?.favorite_count || 0)
          return favoriteScore
        })
      }

      return c.json(sorted)
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

      if (user.plan === 'free' && keywords.length > 1) {
        throw new HTTPException(402, {
          message: 'Topic limit (1) reached, please upgrade to monitor more keywords.',
        })
      }

      if (user.plan === 'pro' && keywords.length > 5) {
        throw new HTTPException(402, {
          message: 'Topic limit (5) reached.',
        })
      }

      await redis.set(`feed-keywords:${user.email}`, keywords)
      await redis.del(`feed:${user.id}`)
      await redis.del(`last-scan:${user.id}`)

      return c.json({ success: true })
    }),
})
