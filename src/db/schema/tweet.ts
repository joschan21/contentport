import { json, pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { account, user } from './auth'
import { InferSelectModel } from 'drizzle-orm'

type Media = {
  s3Key: string // s3
  media_id: string // twitter
}

export const tweets = pgTable('tweets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  content: text('content').default('').notNull(),
  editorState: json('editor_state').default(null),
  media: json("media").$type<Media[]>().default([]),
  mediaIds: json('media_ids').$type<string[]>().default([]),
  s3Keys: json('s3_keys').$type<string[]>().default([]),
  qstashId: text('qstash_id'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => account.id, { onDelete: 'cascade' }),
  isScheduled: boolean('is_scheduled').default(false).notNull(),
  scheduledFor: timestamp('scheduled_for'),
  isPublished: boolean('is_published').default(false).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Tweet = InferSelectModel<typeof tweets>
export type TweetQuery = InferSelectModel<typeof tweets>
