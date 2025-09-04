import { redis } from '@/lib/redis'
import { Redis } from '@upstash/redis'
import { HTTPException } from 'hono/http-exception'
import { EnrichedTweet, enrichTweet } from 'react-tweet'
import { getTweet } from 'react-tweet/api'
import superjson from 'superjson'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'
import { fuzzyIncludes } from '@/lib/utils'

const redis_raw = Redis.fromEnv({
  automaticDeserialization: false,
})

export const feedRouter = j.router({
  refresh: privateProcedure.post(async ({ c, ctx, input }) => {
    const { user } = ctx

    let keywords: string[] = []

    if (user.plan === 'free') {
      keywords = ['contentport']
    } else {
      keywords = (await redis.get<string[]>(`feed-keywords:${user.email}`)) ?? []
    }

    const userId = user.plan === 'free' ? 'contentport' : user.id

    const res = await fetch(`${process.env.TWITTER_API_SERVICE}/feed/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CONTENTPORT_IDENTITY_KEY}`,
      },
      body: JSON.stringify({ userId, keywords }),
    })

    const data = await res.json()

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
    .input(
      z.object({
        sortBy: z.enum(['recent', 'popular']),
        exclude: z.array(z.string()).optional(),
      }),
    )
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { exclude } = input

      let keywords: string[] = []
      if (user.plan === 'free') {
        keywords = ['contentport']
      } else {
        keywords = (await redis.get<string[]>(`feed-keywords:${user.email}`)) ?? []
      }

      let ids: string[] = []
      if (user.plan === 'free') {
        ids = await redis.smembers(`feed:contentport`)
      } else {
        ids = await redis.smembers(`feed:${user.id}`)
      }

      const tweetMap: Map<string, EnrichedTweet> = new Map()
      const replyMap: Record<string, string[]> = {}
      const mains = new Set<EnrichedTweet>()

      await Promise.all(
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

              const relevantEntities = tweet.entities.filter(
                (e) =>
                  e.type === 'mention' ||
                  e.type === 'hashtag' ||
                  (e.type === 'url' &&
                    fuzzyIncludes(e.text.toLowerCase(), keyword.toLowerCase())),
              )

              const isRelevant =
                Boolean(fuzzyIncludes(text.toLowerCase(), keyword.toLowerCase())) ||
                Boolean(relevantEntities.length)

              return isRelevant
            })
          })
        })

        data.push({
          main: mainTweet,
          replyChains: filteredChains,
        })
      }

      const excludeKeywords = exclude?.filter(Boolean) ?? []
      const includeKeywords = keywords?.filter((k) => !excludeKeywords.includes(k)) ?? []

      const shouldExcludeTweet = (tweet: EnrichedTweet): boolean => {
        if (excludeKeywords.length === 0) return false

        const text = tweet.entities.reduce((acc, curr) => {
          if (curr.type === 'text') {
            return acc + curr.text
          } else return acc
        }, '')

        const hasExcludedKeyword = excludeKeywords.some((keyword) => {
          const relevantEntities = tweet.entities.filter(
            (e) =>
              e.type === 'mention' ||
              e.type === 'hashtag' ||
              (e.type === 'url' &&
                fuzzyIncludes(e.text.toLowerCase(), keyword.toLowerCase())),
          )

          return (
            Boolean(fuzzyIncludes(text.toLowerCase(), keyword.toLowerCase())) ||
            Boolean(relevantEntities.length)
          )
        })

        if (!hasExcludedKeyword) return false

        const hasIncludedKeyword = includeKeywords.some((keyword) => {
          const relevantEntities = tweet.entities.filter((e) => {
            if (e.type === 'mention' || e.type === 'hashtag' || e.type === 'url') {
              return fuzzyIncludes(e.text.toLowerCase(), keyword.toLowerCase())
            }
          })

          return (
            Boolean(fuzzyIncludes(text.toLowerCase(), keyword.toLowerCase())) ||
            Boolean(relevantEntities.length)
          )
        })

        return hasExcludedKeyword && !hasIncludedKeyword
      }

      const filteredData = data.filter((item) => {
        const shouldExcludeMain = shouldExcludeTweet(item.main)
        if (shouldExcludeMain) return false

        const hasExcludedReplies = item.replyChains.some((chain) =>
          chain.some((tweet) => {
            return shouldExcludeTweet(tweet)
          }),
        )

        if (hasExcludedReplies) return false

        return true
      })

      let sorted: typeof filteredData = []

      if (input.sortBy === 'recent') {
        sorted = filteredData.sort((a, b) => {
          const timeScore =
            new Date(b.main?.created_at || 0).getTime() -
            new Date(a.main?.created_at || 0).getTime()
          return timeScore
        })
      } else {
        sorted = filteredData.sort((a, b) => {
          const favoriteScore =
            (b.main?.favorite_count || 0) - (a.main?.favorite_count || 0)
          return favoriteScore
        })
      }

      return c.json(sorted)
    }),

  get_keywords: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    let keywords: string[] = []

    if (user.plan === 'free') {
      keywords = ['contentport']
    } else {
      const feedKeywords = await redis.get<string[]>(`feed-keywords:${user.email}`)
      if (feedKeywords) keywords = feedKeywords
    }

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
