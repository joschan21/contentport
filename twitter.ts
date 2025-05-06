import "dotenv/config"
import { TwitterApi } from "twitter-api-v2"

const TWITTER_AUTH_TOKEN = process.env.TWITTER_BEARER_TOKEN

interface Tweet {
  text: string
  created_at: string
  public_metrics?: {
    like_count: number
  }
}

interface TwitterResponse {
  data: Tweet[]
}

interface UserResponse {
  data: {
    id: string
  }
}

async function getRecentTweets(username: string): Promise<Tweet[]> {
  try {
    const userData = await fetch(
      `https://api.twitter.com/2/users/by/username/${username}`,
      {
        headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` }
      }
    )
    const user = await userData.json() as UserResponse

    const tweetsResponse = await fetch(
      `https://api.twitter.com/2/users/${user.data.id}/tweets?max_results=10&tweet.fields=created_at,text,public_metrics&exclude=replies,retweets`,
      { headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` } }
    )
    const tweets = await tweetsResponse.json() as TwitterResponse

    return tweets.data
  } catch (err) {
    console.error(err)
    throw new Error("Failed to fetch tweets")
  }
}

const username = "witsdev"

getRecentTweets(username)
  .then((tweets) => {
    if (!tweets) return
    console.log(`\nRecent tweets from @${username}:\n`)
    tweets.forEach((tweet, i) => {
      console.log(tweet.text)
      console.log(`Likes: ${tweet.public_metrics?.like_count || 0}`)
      if (i < tweets.length - 1) {
        console.log("\n---\n")
      }
    })
  })
  .catch((error) => {
    console.error("Error:", error)
    process.exit(1)
  })
