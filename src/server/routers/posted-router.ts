import { db } from '@/db'
import { tweets } from '@/db/schema'
import { and, eq, gte, sql } from 'drizzle-orm'
import { endOfYear, formatISO, startOfYear } from 'date-fns'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

export type ActivityData = {
  date: string
  count: number
  level: number
}

export const postedRouter = j.router({
  getPublishingActivity: privateProcedure
    .input(
      z.object({
        year: z.number().min(2020).max(2030).optional(),
        accountId: z.string().optional(),
      }).optional()
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx
      const year = input?.year ?? new Date().getFullYear()
      const accountId = input?.accountId

      const startDate = startOfYear(new Date(year, 0, 1))
      const endDate = endOfYear(new Date(year, 0, 1))

      const dailyTweets = await db
        .select({
          date: sql<string>`DATE(${tweets.createdAt})`.as('date'),
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(tweets)
        .where(
          and(
            eq(tweets.userId, user.id),
            eq(tweets.isPublished, true),
            gte(tweets.createdAt, startDate),
            sql`${tweets.createdAt} <= ${endDate}`,
            accountId ? eq(tweets.accountId, accountId) : undefined
          )
        )
        .groupBy(sql`DATE(${tweets.createdAt})`)
        .orderBy(sql`DATE(${tweets.createdAt})`)

      const tweetCountMap = new Map<string, number>()
      dailyTweets.forEach(({ date, count }) => {
        tweetCountMap.set(date, count)
      })

      const maxCount = Math.max(...dailyTweets.map(t => t.count), 1)
      const maxLevel = 4

      const currentDate = new Date(startDate)
      const activity: ActivityData[] = []

      while (currentDate <= endDate) {
        const dateStr = formatISO(currentDate, { representation: 'date' })
        const count = tweetCountMap.get(dateStr) || 0
        const level = count === 0 ? 0 : Math.min(Math.ceil((count / maxCount) * maxLevel), maxLevel)

        activity.push({
          date: dateStr,
          count,
          level,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      const totalCount = dailyTweets.reduce((sum, { count }) => sum + count, 0)

      return c.superjson({
        activity,
        totalCount,
        year,
        maxCount,
        maxLevel,
      })
    }),

  getPublishingStats: privateProcedure
    .input(
      z.object({
        accountId: z.string().optional(),
      }).optional()
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx
      const accountId = input?.accountId

      const totalPublished = await db
        .select({ count: sql<number>`COUNT(*)`.as('count') })
        .from(tweets)
        .where(
          and(
            eq(tweets.userId, user.id),
            eq(tweets.isPublished, true),
            accountId ? eq(tweets.accountId, accountId) : undefined
          )
        )

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthPublished = await db
        .select({ count: sql<number>`COUNT(*)`.as('count') })
        .from(tweets)
        .where(
          and(
            eq(tweets.userId, user.id),
            eq(tweets.isPublished, true),
            gte(tweets.createdAt, startOfMonth),
            accountId ? eq(tweets.accountId, accountId) : undefined
          )
        )

      const scheduledCount = await db
        .select({ count: sql<number>`COUNT(*)`.as('count') })
        .from(tweets)
        .where(
          and(
            eq(tweets.userId, user.id),
            eq(tweets.isScheduled, true),
            eq(tweets.isPublished, false),
            eq(tweets.isError, false),
            accountId ? eq(tweets.accountId, accountId) : undefined
          )
        )

      return c.superjson({
        totalPublished: totalPublished[0]?.count || 0,
        thisMonthPublished: thisMonthPublished[0]?.count || 0,
        scheduledCount: scheduledCount[0]?.count || 0,
      })
    }),

  getRecentPublished: privateProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        accountId: z.string().optional(),
      }).optional()
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx
      const limit = input?.limit ?? 10
      const accountId = input?.accountId

      const recentTweets = await db
        .select({
          id: tweets.id,
          content: tweets.content,
          createdAt: tweets.createdAt,
          twitterId: tweets.twitterId,
          accountId: tweets.accountId,
        })
        .from(tweets)
        .where(
          and(
            eq(tweets.userId, user.id),
            eq(tweets.isPublished, true),
            accountId ? eq(tweets.accountId, accountId) : undefined
          )
        )
        .orderBy(sql`${tweets.createdAt} DESC`)
        .limit(limit)

      return c.superjson({
        tweets: recentTweets,
      })
    }),
})
