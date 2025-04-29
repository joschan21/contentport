// import "dotenv/config"
// import { TwitterApi } from "twitter-api-v2"

// const TWITTER_AUTH_TOKEN = process.env.TWITTER_AUTH_TOKEN

// interface TwitterUser {
//   data: {
//     id: string
//   }
// }

// interface Tweet {
//   text: string
//   created_at: string
// }

// interface TwitterTweets {
//   data: Tweet[]
// }

// const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

// async function getRecentTweets(username: string) {
//   const userData = await client.v2.userByUsername(username)
//   console.log("user data", userData)

//   return

//   try {
//     // Get user ID
//     const userResponse = await fetch(
//       `https://api.twitter.com/2/users/by/username/${username}`,
//       {
//         headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` },
//       }
//     )
//     const userData = (await userResponse.json()) as TwitterUser

//     console.log("userdata", userData)

//     // Get tweets (excluding replies)
//     const tweetsResponse = await fetch(
//       `https://api.twitter.com/2/users/${userData.data.id}/tweets?max_results=30&tweet.fields=created_at,text&exclude=replies,retweets`,
//       { headers: { Authorization: `Bearer ${TWITTER_AUTH_TOKEN}` } }
//     )
//     const tweetsData = (await tweetsResponse.json()) as TwitterTweets

//     return tweetsData.data
//   } catch (err) {
//     console.error(err)
//     throw new Error()
//   }
// }

// const username = "upstash"

// getRecentTweets(username)
//   .then((tweets) => {
//     console.log(`\nRecent tweets from @${username}:\n`)
//     tweets.forEach((tweet, i) => {
//       console.log(tweet.text)

//       if (i < tweets.length - 1) {
//         console.log("\n---\n")
//       }
//     })
//   })
//   .catch((error) => {
//     console.error("Error:", error)
//     process.exit(1)
//   })
