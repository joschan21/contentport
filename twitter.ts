// import "dotenv/config"
// import { TwitterApi } from "twitter-api-v2"
// 
// const TWITTER_AUTH_TOKEN = process.env.TWITTER_BEARER_TOKEN
// 
// interface Tweet {
//   text: string
//   created_at: string
//   public_metrics?: {
//     like_count: number
//   }
// }
// 
// interface TwitterResponse {
//   data: Tweet[]
// }
// 
// interface UserResponse {
//   data: {
//     id: string
//   }
// }
// 
// async function getRecentTweets(username: string): Promise<Tweet[]> {
//   try {
//     const userData = await fetch(
//       `https://api.twitter.com/2/users/by/username/${username}`,
//       {
//         headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` }
//       }
//     )
//     const user = await userData.json() as UserResponse
// 
//     const tweetsResponse = await fetch(
//       `https://api.twitter.com/2/users/${user.data.id}/tweets?max_results=10&tweet.fields=created_at,text,public_metrics&exclude=replies,retweets`,
//       { headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` } }
//     )
//     const tweets = await tweetsResponse.json() as TwitterResponse
// 
//     return tweets.data
//   } catch (err) {
//     console.error(err)
//     throw new Error("Failed to fetch tweets")
//   }
// }
// 
// const username = "witsdev"
// 
// getRecentTweets(username)
//   .then((tweets) => {
//     if (!tweets) return
//     console.log(`\nRecent tweets from @${username}:\n`)
//     tweets.forEach((tweet, i) => {
//       console.log(tweet.text)
//       console.log(`Likes: ${tweet.public_metrics?.like_count || 0}`)
//       if (i < tweets.length - 1) {
//         console.log("\n---\n")
//       }
//     })
//   })
//   .catch((error) => {
//     console.error("Error:", error)
//     process.exit(1)
//   })

import "dotenv/config"

const TWITTER_AUTH_TOKEN = process.env.TWITTER_BEARER_TOKEN

interface Author {
  name: string
  username: string
  profile_image_url: string
}

interface DefaultTweet {
  author_id: string
  edit_history_tweet_ids: string[]
  author: Author
  id: string
  text: string
  created_at: string
}

async function getTweetById(tweetId: string): Promise<DefaultTweet | null> {
  const tweetUrl = `https://api.twitter.com/2/tweets/${tweetId}?expansions=author_id&tweet.fields=created_at,text,edit_history_tweet_ids,note_tweet&user.fields=name,username,profile_image_url`;
  const res = await fetch(tweetUrl, {
    headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` }
  })
  if (!res.ok) return null
  type TwitterApiResponse = {
    data: {
      id: string
      text: string
      created_at: string
      author_id: string
      edit_history_tweet_ids: string[]
      note_tweet?: { text: string }
    }
    includes: {
      users: Array<{
        id: string
        name: string
        username: string
        profile_image_url: string
      }>
    }
  }
  const data = (await res.json()) as TwitterApiResponse
  if (!data.data || !data.includes || !data.includes.users || !data.includes.users[0]) return null
  const tweet = data.data
  const user = data.includes.users[0]
  const tweetText = tweet.note_tweet?.text ?? tweet.text
  const cleanedText = tweetText.replace(/https:\/\/t\.co\/\w+/g, "").trim()
  return {
    author_id: tweet.author_id,
    edit_history_tweet_ids: tweet.edit_history_tweet_ids ?? [tweet.id],
    author: {
      profile_image_url: user.profile_image_url,
      name: user.name,
      username: user.username,
    },
    id: tweet.id,
    text: cleanedText,
    created_at: tweet.created_at,
  }
}

const tweetId = process.argv[2]

if (!tweetId) {
  console.error("Please provide a tweet id as an argument.")
  process.exit(1)
}

getTweetById(tweetId).then((tweet) => {
  if (!tweet) {
    console.error("Tweet not found or error fetching tweet.")
    process.exit(1)
  }
  console.log(JSON.stringify(tweet, null, 2))
})
