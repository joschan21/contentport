import { TweetV2, TwitterApi } from "twitter-api-v2"
import { z } from "zod"
import { j, privateProcedure } from "../jstack"
import { redis } from "@/lib/redis"
import { HTTPException } from "hono/http-exception"

type Author = {
  profile_image_url: string
  username: string
  name: string
}

type Tweet = {
  author: Author
  author_id: string
  created_at: string
  edit_history_tweet_ids: string[]
  id: string
  text: string
}

export type Style = {
  tweets: Tweet[]
  prompt: string | null
}

// const client = new TwitterApi({
//   appKey: process.env.TWITTER_API_KEY as string,
//   appSecret: process.env.TWITTER_API_SECRET as string,
//   accessToken: process.env.TWITTER_ACCESS_TOKEN as string,
//   accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET as string,
// }).readOnly
const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

type UserData = Awaited<ReturnType<typeof client.v2.userByUsername>>["data"]

export const styleRouter = j.router({
  get: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx

    const style = await redis.json.get<Style>(`style:${user.email}`)

    if (!style) {
      return c.json({
        tweets: [] as Tweet[],
        prompt: null,
      })
    }

    return c.json({...style, tweets: style.tweets.reverse()})
  }),
  import: privateProcedure
    .input(
      z.object({
        link: z.string().min(1).max(200),
        prompt: z.string().optional(),
      })
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { link, prompt } = input

      // Extract tweet ID from Twitter link
      const tweetIdMatch =
        link.match(/twitter\.com\/\w+\/status\/(\d+)/i) ||
        link.match(/x\.com\/\w+\/status\/(\d+)/i)

      if (!tweetIdMatch || !tweetIdMatch[1]) {
        throw new HTTPException(400, {
          message:
            "Invalid Twitter link format. Please provide a direct link to a tweet.",
        })
      }

      const tweetId = tweetIdMatch[1]

      // Fetch the specific tweet
      const res = await client.v2.tweets(tweetId, {
        "tweet.fields": ["id", "text", "created_at", "author_id", "note_tweet"],
        "user.fields": ["username", "profile_image_url", "name"],
        expansions: ["author_id", "referenced_tweets.id"],
      })

      const [tweet] = res.data
      const includes = res.includes

      if (!tweet) {
        throw new HTTPException(404, {
          message: "Tweet not found",
        })
      }

      const author = includes?.users?.[0]

      const tweetText = tweet.note_tweet?.text ?? tweet.text

      // Clean up tweet text by removing image links
      const cleanedTweet = {
        ...tweet,
        text: tweetText.replace(/https:\/\/t\.co\/\w+/g, "").trim(),
        author: author
          ? {
              username: author.username,
              profile_image_url: author.profile_image_url,
              name: author.name,
            }
          : null,
      }

      const styleKey = `style:${user.email}`
      const currentStyle = await redis.json.get<Style>(styleKey)

      if (!currentStyle) {
        await redis.json.set(styleKey, "$", {
          tweets: [cleanedTweet],
          prompt: prompt || null,
        })
      } else {
        const currentTweets = currentStyle?.tweets || []

        const updatedTweets = [...currentTweets, cleanedTweet]

        await redis.json.set(styleKey, "$.tweets", updatedTweets)

        if (prompt) {
          await redis.json.set(styleKey, "$.prompt", prompt)
        }
      }

      const updatedStyle = await redis.json.get<Style>(styleKey)

      return c.json({
        tweets: updatedStyle?.tweets || [],
      })
    }),
  delete: privateProcedure
    .input(
      z.object({
        tweetId: z.string(),
      })
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { tweetId } = input

      const styleKey = `style:${user.email}`
      const styleExists = await redis.exists(styleKey)

      if (!styleExists) {
        throw new HTTPException(404, {
          message: "No style found for this user",
        })
      }

      const currentStyle = await redis.json.get<Style>(styleKey)
      const currentTweets = currentStyle?.tweets || []

      const updatedTweets = currentTweets.filter(
        (tweet) => tweet.id !== tweetId
      )

      await redis.json.set(styleKey, "$.tweets", updatedTweets)

      return c.json({
        tweets: updatedTweets,
      })
    }),
  save: privateProcedure
    .input(
      z.object({
        prompt: z.string().optional(),
      })
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { prompt } = input

      const styleKey = `style:${user.email}`

      if (prompt) {
        await redis.json.merge(styleKey, "$", { prompt })
      }

      return c.json({
        success: true,
      })
    }),
})

async function getUserData(username: string) {
  const { data } = await client.v2.userByUsername(username)

  if (!data) {
    throw new HTTPException(404, {
      message: `User "${username}" not found`,
    })
  }

  await redis.hset(`twitter-user-data`, { [username]: data })

  return data
}
