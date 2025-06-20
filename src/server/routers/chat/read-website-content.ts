import { firecrawl } from '@/lib/firecrawl'
import { redis } from '@/lib/redis'
import { tool } from 'ai'
import { TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

const isTwitterUrl = (url: string): boolean => {
  return /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)
}

const extractTweetId = (url: string): string | null => {
  const match = url.match(/\/status\/(\d+)/)
  return match?.[1] ? match[1] : null
}

export const create_read_website_content  = ({chatId}: {chatId: string}) => tool({
  description: 'Scrape website content by URL',
  parameters: z.object({ website_url: z.string() }),
  execute: async ({ website_url }) => {
    const cacheKey = `website-cache:${encodeURIComponent(website_url)}`
    
    const cachedContent = await redis.get(cacheKey)
    if (cachedContent) {
      await redis.lpush(`website-contents:${chatId}`, cachedContent)
      return cachedContent as {url:string,title:string,content:string}
    }

    if (isTwitterUrl(website_url)) {
      const tweetId = extractTweetId(website_url)

      if (!tweetId) {
        throw new Error('Could not extract tweet ID from URL')
      }

      try {
        const res = await client.v2.tweets(tweetId, {
          'tweet.fields': ['id', 'text', 'created_at', 'author_id', 'note_tweet'],
          'user.fields': ['username', 'profile_image_url', 'name'],
          expansions: ['author_id', 'referenced_tweets.id'],
        })

        const [tweet] = res.data
        const includes = res.includes

        const author = includes?.users?.[0]

        const tweetContent = {
          url: website_url,
          title: `Tweet by @${author?.username}`,
          content: `**${author?.name || 'Unknown'} (@${author?.username || 'unknown'})**\n\n${tweet?.text}`,
        }

        await redis.setex(cacheKey, 86400, tweetContent)
        await redis.lpush(`website-contents:${chatId}`, tweetContent)

        return tweetContent
      } catch (error) {
        return {
          url: website_url,
          title: 'Error reading tweet',
          content: `There was an error reading this tweet.`,
        }
      }
    }

    const response = await firecrawl.scrapeUrl(website_url, {
      formats: ['markdown'],
    })

    if (response.success) {
      const websiteContent = {
        url: website_url,
        title: response.metadata?.title,
        content: response.markdown,
      }
      
      await redis.setex(cacheKey, 86400, websiteContent)
      await redis.lpush(`website-contents:${chatId}`, websiteContent)
      
      return websiteContent
    } else {
      const errorContent = {
        url: website_url,
        title: 'Error reading website',
        content: 'There was an error reading this website',
      }
      
      await redis.lpush(`website-contents:${chatId}`, errorContent)
      
      return errorContent
    }
  },
})
