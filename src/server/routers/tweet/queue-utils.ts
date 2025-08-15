import { db } from "@/db"
import { tweets } from "@/db/schema"
import { addDays, isAfter, setHours, startOfDay, startOfHour } from "date-fns"
import { fromZonedTime } from "date-fns-tz"
import { and, eq } from "drizzle-orm"

const SLOTS = [10, 12, 14]

export async function getNextAvailableQueueSlot({
  userId,
  accountId,
  userNow,
  timezone,
  maxDaysAhead = 90,
}: {
  userId: string
  accountId: string
  userNow: Date
  timezone: string
  maxDaysAhead?: number
}): Promise<Date | null> {
  if(process.env.VERCEL_ENV === "preview") {
    return new Date(userNow.getTime() + 60000)
  }
  
  const scheduledTweets = await db.query.tweets.findMany({
    where: and(
      eq(tweets.userId, userId),
      eq(tweets.accountId, accountId),
      eq(tweets.isScheduled, true),
      eq(tweets.isQueued, true),
    ),
    columns: { scheduledUnix: true },
  })

  function isSpotEmpty(time: Date) {
    const unix = time.getTime()
    return !Boolean(scheduledTweets.some((t) => t.scheduledUnix === unix))
  }

  for (let dayOffset = 0; dayOffset <= maxDaysAhead; dayOffset++) {
    let checkDay: Date | undefined = undefined

    if (dayOffset === 0) checkDay = startOfDay(userNow)
    else checkDay = startOfDay(addDays(userNow, dayOffset))

    for (const hour of SLOTS) {
      const localSlotTime = startOfHour(setHours(checkDay, hour))
      const slotTime = fromZonedTime(localSlotTime, timezone)

      if (isAfter(slotTime, userNow) && isSpotEmpty(slotTime)) {
        return slotTime
      }
    }
  }

  return null
}
