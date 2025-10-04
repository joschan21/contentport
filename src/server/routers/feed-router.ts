import { Keyword } from '@/app/studio/topic-monitor/feed-settings-modal'
import { redis } from '@/lib/redis'
import { fuzzyIncludes } from '@/lib/utils'
import { HTTPException } from 'hono/http-exception'
import { EnrichedTweet } from 'react-tweet'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'
import { getTweet } from './utils/get-tweet'

export const feedRouter = j.router({
  refresh: privateProcedure.post(async ({ c, ctx, input }) => {
    const { user } = ctx

    let keywords: string[] = []

    if (user.plan === 'free') {
      keywords = ['contentport']
    } else {
      const feedKeywords = await redis.get<
        | Array<{
            text: string
            excludeNameMatches: boolean
            excludeLinkMatches: boolean
          }>
        | string[]
      >(`feed-keywords:${user.email}`)

      if (feedKeywords) {
        keywords = feedKeywords.map((keyword) => {
          if (typeof keyword === 'string') {
            return keyword
          }
          return keyword.text
        })
      }
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

      let keywords: Keyword[] = []
      if (user.plan === 'free') {
        keywords = [
          { text: 'contentport', excludeLinkMatches: false, excludeNameMatches: false },
        ]
      } else {
        const existing = await redis.get<(string | Keyword)[]>(
          `feed-keywords:${user.email}`,
        )

        existing?.forEach((keyword) => {
          if (typeof keyword === 'string') {
            // legacy compat
            keywords.push({
              text: keyword,
              excludeLinkMatches: false,
              excludeNameMatches: false,
            })
          } else {
            keywords.push(keyword)
          }
        })
      }

      console.log('keywords', keywords)

      let ids: string[] = []
      if (user.plan === 'free') {
        ids = await redis.smembers(`feed:contentport`)
      } else {
        ids = await redis.smembers(`feed:${user.id}`)
      }

      console.log('ids', ids)

      const tweetMap: Map<string, EnrichedTweet> = new Map()
      const replyMap: Record<string, string[]> = {}
      const mains = new Set<EnrichedTweet>()

      await Promise.all(
        ids.map(async (id) => {
          const tweet = await getTweet(id)

          if (tweet) {
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

          // const tweet = await getTweet(id)

          // if (tweet) {
          //   const enriched = enrichTweet(tweet)
          //   tweetMap.set(enriched.id_str, enriched)

          //   if (enriched.in_reply_to_status_id_str) {
          //     if (!replyMap[enriched.in_reply_to_status_id_str]) {
          //       replyMap[enriched.in_reply_to_status_id_str] = []
          //     }

          //     replyMap[enriched.in_reply_to_status_id_str]?.push(enriched.id_str)
          //   } else {
          //     mains.add(enriched)
          //   }

          //   await redis_raw.set(`enriched-tweet:${id}`, superjson.stringify(enriched))
          //   return enriched
          // }
        }),
      )

      const data: Array<{
        main: EnrichedTweet
        replyChains: Array<Array<EnrichedTweet>>
      }> = []

      console.log('ids length', ids.length)

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

      const excludeKeywords = keywords?.filter((k) => Boolean(exclude?.includes(k.text)))
      const includeKeywords = keywords?.filter((k) => !Boolean(exclude?.includes(k.text)))

      function shouldIncludeTweet(tweet: EnrichedTweet): boolean {
        const text = tweet.entities.reduce((acc, curr) => {
          if (curr.type === 'text') return acc + curr.text
          return acc
        }, '')

        const hasExcludedKeyword = excludeKeywords.some((keyword) => {
          const relevantEntities = tweet.entities.filter((e) => {
            if (e.type === 'mention' || e.type === 'hashtag' || e.type === 'url') {
              return fuzzyIncludes(e.text.toLowerCase(), keyword.text.toLowerCase())
            }
          })

          return (
            Boolean(fuzzyIncludes(text.toLowerCase(), keyword.text.toLowerCase())) ||
            Boolean(relevantEntities.length)
          )
        })

        const hasIncludedKeyword = includeKeywords.some((keyword) => {
          const relevantEntities = tweet.entities.filter((e) => {
            if (e.type === 'url' && keyword.excludeLinkMatches) return false

            if (e.type === 'mention' || e.type === 'hashtag' || e.type === 'url') {
              return fuzzyIncludes(e.text.toLowerCase(), keyword.text.toLowerCase())
            }
          })

          let checkedText = text

          if (keyword.excludeNameMatches === false) {
            checkedText = [tweet.user.name, tweet.user.screen_name, text].join(' ')
          }

          return (
            Boolean(
              fuzzyIncludes(checkedText.toLowerCase(), keyword.text.toLowerCase()),
            ) || Boolean(relevantEntities.length)
          )
        })

        console.log('has included keyword?', hasIncludedKeyword)

        return Boolean(hasIncludedKeyword && !hasExcludedKeyword)
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

        function shouldIncludeTweet(tweet: EnrichedTweet): boolean {
          const text = tweet.entities.reduce((acc, curr) => {
            if (curr.type === 'text') return acc + curr.text
            return acc
          }, '')

          const hasExcludedKeyword = excludeKeywords.some((keyword) => {
            const relevantEntities = tweet.entities.filter((e) => {
              if (e.type === 'mention' || e.type === 'hashtag' || e.type === 'url') {
                return fuzzyIncludes(e.text.toLowerCase(), keyword.text.toLowerCase())
              }
            })

            return (
              Boolean(fuzzyIncludes(text.toLowerCase(), keyword.text.toLowerCase())) ||
              Boolean(relevantEntities.length)
            )
          })

          const hasIncludedKeyword = includeKeywords.some((keyword) => {
            const relevantEntities = tweet.entities.filter((e) => {
              if (e.type === 'url' && keyword.excludeLinkMatches) return false

              if (e.type === 'mention' || e.type === 'hashtag' || e.type === 'url') {
                return fuzzyIncludes(e.text.toLowerCase(), keyword.text.toLowerCase())
              }
            })

            let checkedText = text

            if (keyword.excludeNameMatches === false) {
              checkedText = [tweet.user.name, tweet.user.screen_name, text].join(' ')
            }

            return (
              Boolean(
                fuzzyIncludes(checkedText.toLowerCase(), keyword.text.toLowerCase()),
              ) || Boolean(relevantEntities.length)
            )
          })

          console.log('has included keyword?', hasIncludedKeyword)

          return Boolean(hasIncludedKeyword && !hasExcludedKeyword)
        }

        const filteredChains = replyChains.filter((chain) => {
          return chain.some((tweet) => {
            return shouldIncludeTweet(tweet)
            // return keywords?.some((keyword) => {
            //   const text = tweet.entities.reduce((acc, curr) => {
            //     if (curr.type === 'text') {
            //       return acc + curr.text
            //     } else return acc
            //   }, '')

            //   const relevantEntities = tweet.entities.filter(
            //     (e) => {
            //       if (e.type === 'mention' || e.type === 'hashtag' || e.type === 'url') {
            //         return fuzzyIncludes(e.text.toLowerCase(), keyword.text.toLowerCase())
            //       }
            //     },
            //     // e.type === 'mention' ||
            //     // e.type === 'hashtag' ||
            //     // (e.type === 'url' &&
            //     //   fuzzyIncludes(e.text.toLowerCase(), keyword.text.toLowerCase())),
            //   )

            //   const isRelevant =
            //     Boolean(fuzzyIncludes(text.toLowerCase(), keyword.text.toLowerCase())) ||
            //     Boolean(relevantEntities.length)

            //   return isRelevant
            // })
          })
        })

        data.push({
          main: mainTweet,
          replyChains: filteredChains,
        })
      }

      const filteredData = data.filter((item) => {
        const shouldIncludeMain = shouldIncludeTweet(item.main)
        console.log('should include??', shouldIncludeMain)
        if (shouldIncludeMain) return true

        const hasIncludedReplies = item.replyChains.some((chain) =>
          chain.some((tweet) => {
            return shouldIncludeTweet(tweet)
          }),
        )

        if (hasIncludedReplies) return true

        return false
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

    if (user.plan === 'free') {
      return c.json({
        keywords: [
          {
            text: 'contentport',
            excludeNameMatches: false,
            excludeLinkMatches: false,
          },
        ],
      })
    }

    const feedKeywords = await redis.get<
      | Array<{
          text: string
          excludeNameMatches: boolean
          excludeLinkMatches: boolean
        }>
      | string[]
    >(`feed-keywords:${user.email}`)

    let keywords: Array<{
      text: string
      excludeNameMatches: boolean
      excludeLinkMatches: boolean
    }> = []

    if (feedKeywords) {
      keywords = feedKeywords.map((keyword) => {
        if (typeof keyword === 'string') {
          return {
            text: keyword,
            excludeNameMatches: false,
            excludeLinkMatches: false,
          }
        }
        return keyword
      })
    }

    return c.json({ keywords })
  }),

  save_keywords: privateProcedure
    .input(
      z.object({
        keywords: z.array(
          z.object({
            text: z.string(),
            excludeNameMatches: z.boolean().default(false),
            excludeLinkMatches: z.boolean().default(false),
          }),
        ),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { keywords } = input

      if (user.plan === 'free') {
        throw new HTTPException(402, {
          message: 'Please upgrade to monitor more keywords.',
        })
      }

      if (user.plan === 'pro' && keywords.length > 5) {
        throw new HTTPException(402, {
          message: 'Topic limit (5) reached.',
        })
      }

      const currentKeywords = await redis.get<Keyword[]>(`feed-keywords:${user.email}`)

      const isTextContentChange = currentKeywords?.some(
        (keyword) => keyword.text !== keywords.find((k) => k.text === keyword.text)?.text,
      )

      await redis.set<Keyword[]>(`feed-keywords:${user.email}`, keywords)

      if (isTextContentChange) {
        await redis.del(`feed:${user.id}`)
        await redis.del(`last-scan:${user.id}`)
      }

      return c.json({ keywords })
    }),

  // start_index_own_tweets: privateProcedure.post(async ({ c, ctx }) => {
  //   const { user } = ctx

  //   const account = await getAccount({ email: user.email })

  //   if (!account) {
  //     throw new HTTPException(404, {
  //       message: 'Account not found',
  //     })
  //   }

  //   const baseUrl =
  //     process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : getBaseUrl()

  //   await qstash.publishJSON({
  //     url: baseUrl + '/feed/index_own_tweets',
  //     body: {
  //       userId: user.id,
  //       accountId: account.id,
  //       username: account.username,
  //     },
  //   })

  //   return c.json({ success: true })
  // }),

  // index_own_tweets: qstashProcedure.post(async ({ c, ctx, input }) => {
  //   const { body } = ctx
  //   const { userId, accountId, username } = body

  //   const res = await fetch(process.env.TWITTER_API_SERVICE + '/knowledge/index', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Bearer ${process.env.CONTENTPORT_IDENTITY_KEY}`,
  //     },
  //     body: JSON.stringify({ accountId: accountId, handle: username }),
  //   })

  //   const namespace = realtime.namespace(userId)

  //   await namespace.index_own_tweets.update({ status: 'success' })

  //   return c.json({ status: 'success' })
  // }),
})
