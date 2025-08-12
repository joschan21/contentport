import { db } from "@/db"
import { Tweet, tweets } from "@/db/schema"
import { and, eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { ApiResponseError, SendTweetV2Params, TwitterApi } from "twitter-api-v2"

async function postSingleTweetToTwitter(
  client: TwitterApi,
  tweet: Tweet,
  inReplyToTwitterId?: string,
): Promise<string> {
  const tweetPayload: Partial<SendTweetV2Params> = {
    text: tweet.content,
  }

  if (tweet.media && tweet.media.length > 0) {
    tweetPayload.media = {
      // @ts-expect-error tuple type vs. string[]
      media_ids: tweet.media.map((media) => media.media_id),
    }
  }

  if (inReplyToTwitterId) {
    tweetPayload.reply = { in_reply_to_tweet_id: inReplyToTwitterId }
  }

  try {
    const res = await client.v2.tweet(tweetPayload)
    return res.data.id
  } catch (err) {
    if (err instanceof ApiResponseError) {
      throw new HTTPException(500, {
        message: err.data.detail ?? 'Failed to post tweet to Twitter',
      })
    }

    throw new HTTPException(500, {
      message: 'Failed to post tweet to Twitter',
    })
  }
}

export async function postThreadToTwitter(
  client: TwitterApi,
  baseTweet: Tweet,
  accountId: string,
): Promise<{ baseTweetId: string; allTweetIds: string[] }> {
  const baseTweetId = await postSingleTweetToTwitter(client, baseTweet)

  await db
    .update(tweets)
    .set({
      isScheduled: false,
      isPublished: true,
      updatedAt: new Date(),
      twitterId: baseTweetId,
    })
    .where(eq(tweets.id, baseTweet.id))

  const allTweetIds = [baseTweetId]
  let currentDbId = baseTweet.id
  let currentTwitterId = baseTweetId

  while (true) {
    const nextTweet = await db.query.tweets.findFirst({
      where: and(eq(tweets.isReplyTo, currentDbId), eq(tweets.accountId, accountId)),
    })

    if (!nextTweet) break

    if (!nextTweet.isPublished) {
      const replyTwitterId = await postSingleTweetToTwitter(
        client,
        nextTweet,
        currentTwitterId,
      )
      allTweetIds.push(replyTwitterId)

      await db
        .update(tweets)
        .set({
          isScheduled: false,
          isPublished: true,
          updatedAt: new Date(),
          twitterId: replyTwitterId,
        })
        .where(eq(tweets.id, nextTweet.id))

      currentTwitterId = replyTwitterId
    } else if (nextTweet.twitterId) {
      currentTwitterId = nextTweet.twitterId
      allTweetIds.push(nextTweet.twitterId)
    }

    currentDbId = nextTweet.id
  }

  return { baseTweetId, allTweetIds }
}
