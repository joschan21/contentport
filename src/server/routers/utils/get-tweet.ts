import { Redis } from '@upstash/redis'
import { EnrichedTweet, enrichTweet } from 'react-tweet'
import SuperJSON from 'superjson'
import { getTweet as getTweetFromTwitter } from 'react-tweet/api'

const redis_raw = Redis.fromEnv({
  automaticDeserialization: false,
})

export const getTweet = async (id: string): Promise<EnrichedTweet | null> => {
  const cached = await redis_raw.get<string>(`enriched-tweet:${id}`)

  if (cached) {
    const tweet = SuperJSON.parse(cached) as EnrichedTweet
    return tweet
  }

  const tweet = await getTweetFromTwitter(id)

  if (!tweet) {
    return null
  }

  const enrichedTweet = enrichTweet(tweet)
  await redis_raw.set(`enriched-tweet:${id}`, SuperJSON.stringify(enrichedTweet), {
    ex: 60 * 60 * 12, // 12 hours
  })

  return enrichedTweet
}
