import { db } from '@/db'
import { TweetQuery, tweets } from '@/db/schema'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

export const tweetRouter = j.router({
  recents: privateProcedure.get(async ({ c, ctx }) => {
    const { user } = ctx

    const recentTweets = await db.query.tweets.findMany({
      where: eq(tweets.userId, user.id),
      orderBy: desc(tweets.createdAt),
      limit: 5,
      columns: { id: true, content: true },
    })

    return c.json({ tweets: recentTweets })
  }),

  getTweet: privateProcedure
    .input(z.object({ tweetId: z.string().nullable() }))
    .get(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { tweetId } = input

      if (!tweetId) return c.superjson({ tweet: null })

      const tweet = await db.query.tweets.findFirst({
        where: and(eq(tweets.id, tweetId), eq(tweets.userId, user.id)),
      })

      return c.superjson({ tweet: tweet ?? null })
    }),

  create: privateProcedure
    .input(z.object({ id: z.string().optional().nullable() }))
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const tweetId = input.id ?? nanoid()

      const result = await db
        .insert(tweets)
        .values({
          id: tweetId,
          userId: user.id,
          content: '',
          editorState: {},
        })
        .returning()

      return c.json({ success: true, id: result[0]?.id ?? tweetId })
    }),

  save: privateProcedure
    .input(
      z.object({
        tweetId: z.string().nanoid().nullable(),
        content: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { tweetId, content } = input

      let assignedId: string | undefined = undefined
      let tweet: TweetQuery | undefined = undefined

      if (tweetId) {
        assignedId = tweetId

        const [result] = await db
          .update(tweets)
          .set({
            content,
            updatedAt: new Date(),
          })
          .where(and(eq(tweets.id, tweetId), eq(tweets.userId, user.id)))
          .returning()

        tweet = result
      } else {
        assignedId = nanoid()

        const [result] = await db
          .insert(tweets)
          .values({
            id: assignedId,
            userId: user.id,
            content,
          })
          .returning()

        tweet = result
      }

      return c.superjson({ success: true, assignedId, tweet })
    }),

  delete: privateProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { id } = input

      await db.delete(tweets).where(and(eq(tweets.id, id), eq(tweets.userId, user.id)))

      return c.json({ success: true })
    }),
})
