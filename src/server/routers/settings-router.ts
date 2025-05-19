import { z } from "zod"
import { j, privateProcedure } from "../jstack"
import { redis } from "@/lib/redis"
import { TwitterApi, UserV2 } from "twitter-api-v2"
import { HTTPException } from "hono/http-exception"
import { chatLimiter } from "@/lib/chat-limiter"
import { ConnectedAccount } from "@/components/tweet-editor/tweet-editor"
import { Style } from "./style-router"
import { DEFAULT_TWEETS } from "@/constants/default-tweet-preset"

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

interface Settings {
  user: {
    profile_image_url: string
    name: string
    username: string
    id: string
    verified: boolean
    verified_type: "string"
  }
}

interface TweetWithStats {
  id: string
  text: string
  likes: number
  retweets: number
  created_at: string
}

export const settingsRouter = j.router({
  limit: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx
    const { remaining, reset } = await chatLimiter.getRemaining(user.email)

    return c.json({ remaining, reset })
  }),

  onboarding: privateProcedure
    .input(
      z.object({
        username: z.string(),
      })
    )
    .post(async ({ c, ctx, input }) => {
      const { username } = input
      const { user } = ctx

      let userData: UserV2 | undefined = undefined

      try {
        const { data } = await client.v2.userByUsername(
          username.replace("@", ""),
          {
            "user.fields": [
              "profile_image_url",
              "name",
              "username",
              "id",
              "verified",
              "verified_type",
            ],
          }
        )

        userData = data
      } catch (err) {
        throw new HTTPException(404, {
          message: `User "${username}" not found`,
        })
      }

      if (!userData) {
        throw new HTTPException(404, {
          message: `User "${username}" not found`,
        })
      }

      // Save connected account
      await redis.json.set(`connected-account:${user.email}`, "$", {
        ...userData,
      })

      // Fetch the user's latest 30 tweets
      const userTweets = await client.v2.userTimeline(userData.id, {
        max_results: 30,
        "tweet.fields": [
          "public_metrics",
          "created_at",
          "text",
          "author_id",
          "note_tweet",
          "edit_history_tweet_ids",
          "in_reply_to_user_id",
          "referenced_tweets",
        ],
        "user.fields": ["username", "profile_image_url", "name"],
        exclude: ["retweets", "replies"],
        expansions: ["author_id"],
      })

      const styleKey = `style:${user.email}`
      let isPreset: boolean = false
      let userTweetCount: number = 0

      if (!userTweets.data.data) {
        isPreset = true

        await redis.json.set(styleKey, "$", {
          tweets: DEFAULT_TWEETS,
          prompt: "",
        })
      } else {
        isPreset = false

        const filteredTweets = userTweets.data.data?.filter(
          (tweet) =>
            !tweet.in_reply_to_user_id &&
            !tweet.referenced_tweets?.some((ref) => ref.type === "replied_to")
        )

        const tweetsWithStats: TweetWithStats[] = filteredTweets.map(
          (tweet) => ({
            id: tweet.id,
            text: tweet.text,
            likes: tweet.public_metrics?.like_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
            created_at: tweet.created_at || "",
          })
        )

        const sortedTweets = tweetsWithStats.sort((a, b) => b.likes - a.likes)

        const topTweets = sortedTweets.slice(0, 20)

        const author = userTweets.includes.users?.[0]
        let formattedTweets = topTweets.map((tweet) => {
          const cleanedText = tweet.text
            .replace(/https:\/\/t\.co\/\w+/g, "")
            .trim()

          return {
            id: tweet.id,
            text: cleanedText,
            created_at: tweet.created_at,
            author_id: userData.id,
            edit_history_tweet_ids: [tweet.id],
            author: author
              ? {
                  username: author.username,
                  profile_image_url: author.profile_image_url,
                  name: author.name,
                }
              : null,
          }
        })

        userTweetCount = formattedTweets.length

        // Fill up to 20 tweets with DEFAULT_TWEETS if needed
        if (formattedTweets.length < 20) {
          const existingIds = new Set(formattedTweets.map((t) => t.id))
          for (const defaultTweet of DEFAULT_TWEETS) {
            if (formattedTweets.length >= 20) break
            if (!existingIds.has(defaultTweet.id)) {
              formattedTweets.push(defaultTweet)
              existingIds.add(defaultTweet.id)
            }
          }
        }

        await redis.json.set(styleKey, "$", {
          tweets: formattedTweets.reverse(),
          prompt: "",
        })
      }

      return c.json({
        success: true,
        data: {
          userTweetCount,
          isPreset,
          username: userData.username,
          name: userData.name,
          profile_image_url: userData.profile_image_url,
          verified: userData.verified,
        },
      })
    }),

  connect: privateProcedure
    .input(
      z.object({
        username: z.string(),
      })
    )
    .post(async ({ c, ctx, input }) => {
      const { username } = input
      const { user } = ctx

      const { data: userData } = await client.v2.userByUsername(
        username.replace("@", ""),
        {
          "user.fields": [
            "profile_image_url",
            "name",
            "username",
            "id",
            "verified",
            "verified_type",
          ],
        }
      )

      if (!userData) {
        throw new HTTPException(404, {
          message: `User "${username}" not found`,
        })
      }

      await redis.json.set(`connected-account:${user.email}`, "$", {
        ...userData,
      })

      return c.json({
        success: true,
        data: {
          username: userData.username,
          name: userData.name,
          profile_image_url: userData.profile_image_url,
          verified: userData.verified,
        },
      })
    }),

  connectedAccount: privateProcedure.get(async ({ c, input, ctx }) => {
    const { user } = ctx

    const account = await redis.json.get<ConnectedAccount>(
      `connected-account:${user.email}`
    )

    return c.json({ account })
  }),
})
