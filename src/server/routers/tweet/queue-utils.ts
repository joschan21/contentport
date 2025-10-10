import { db } from '@/db'
import { account as accountSchema, tweets } from '@/db/schema'
import { addDays, getDay, isAfter, setHours, setMinutes, startOfDay, startOfHour } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { and, eq } from 'drizzle-orm'

const DEFAULT_SLOTS = [600, 720, 840]

const getDefaultQueueSettings = (): Record<string, number[]> => {
  return {
    '1': DEFAULT_SLOTS,
    '2': DEFAULT_SLOTS,
    '3': DEFAULT_SLOTS,
    '4': DEFAULT_SLOTS,
    '5': DEFAULT_SLOTS,
  }
}

export function applyNaturalPostingTime(scheduledUnix: number): number {
  const fourMinutesInMs = 4 * 60 * 1000
  const randomOffset = Math.floor(Math.random() * (fourMinutesInMs * 2 + 1)) - fourMinutesInMs
  return scheduledUnix + randomOffset
}

export async function getNextAvailableQueueSlot({
  userId,
  accountId,
  userNow,
  timezone,
  maxDaysAhead = 90,
  isAdmin = false,
}: {
  userId: string
  accountId: string
  userNow: Date
  timezone: string
  maxDaysAhead?: number
  isAdmin?: boolean
}): Promise<Date | null> {
  if (process.env.VERCEL_ENV === 'preview' || isAdmin) {
    return new Date(userNow.getTime() + 60000)
  }

  const dbAccount = await db.query.account.findFirst({
    where: eq(accountSchema.id, accountId),
    columns: { queueSettings: true },
  })

  const queueSettings = dbAccount?.queueSettings || getDefaultQueueSettings()

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

    const dayOfWeek = getDay(checkDay)
    const slotsForDay = queueSettings[dayOfWeek.toString()] || []

    for (const minutesFromMidnight of slotsForDay) {
      const hours = Math.floor(minutesFromMidnight / 60)
      const minutes = minutesFromMidnight % 60

      const localSlotTime = setMinutes(setHours(checkDay, hours), minutes)
      const slotTime = fromZonedTime(localSlotTime, timezone)

      if (isAfter(slotTime, userNow) && isSpotEmpty(slotTime)) {
        return slotTime
      }
    }
  }

  return null
}

export async function getQueueSlotsForAccount(accountId: string): Promise<Record<string, number[]>> {
  const dbAccount = await db.query.account.findFirst({
    where: eq(accountSchema.id, accountId),
    columns: { queueSettings: true },
  })

  return dbAccount?.queueSettings || getDefaultQueueSettings()
}
