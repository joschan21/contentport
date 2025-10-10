import { Redis } from '@upstash/redis'
import { EnrichedTweet, enrichTweet } from 'react-tweet'
import SuperJSON from 'superjson'
import { getTweet as getTweetFromTwitter } from 'react-tweet/api'

const redis_raw = Redis.fromEnv({
  automaticDeserialization: false,
})

export const getTweet = async (id: string): Promise<EnrichedTweet | null> => {
  const [isInvalid, cached] = await Promise.all([
    redis_raw.sismember(`invalid-tweet-ids`, id),
    redis_raw.get<string>(`enriched-tweet:${id}`)
  ])

  if (isInvalid) {
    return null
  }

  if (cached) {
    const tweet = SuperJSON.parse(cached) as EnrichedTweet
    return tweet
  }

  // Suppress errors from getTweetFromTwitter
  const originalConsoleError = console.error
  console.error = () => {}
  const tweet = await getTweetFromTwitter(id)
  console.error = originalConsoleError

  if (!tweet) {
    await redis_raw.sadd(`invalid-tweet-ids`, id)
    return null
  }

  const enrichedTweet = enrichTweet(tweet)
  await redis_raw.set(`enriched-tweet:${id}`, SuperJSON.stringify(enrichedTweet), {
    ex: 60 * 60 * 12, // 12 hours
  })

  return enrichedTweet
}
