import { db } from '@/db'
import { tweets } from '@/db/schema'
import { eq, gt, isNull, and } from 'drizzle-orm'

export async function getScheduledTweetCount(userId: string): Promise<number> {
  const currentTime = new Date().getTime()

  const futureScheduledTweets = await db.query.tweets.findMany({
    where: and(
      eq(tweets.userId, userId),
      eq(tweets.isScheduled, true),
      eq(tweets.isError, false),
      gt(tweets.scheduledUnix, currentTime),
      isNull(tweets.isReplyTo),
    ),
    columns: { id: true },
  })

  return futureScheduledTweets.length
}
