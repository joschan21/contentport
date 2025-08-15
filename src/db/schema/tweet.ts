import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import {
  bigint,
  boolean,
  integer,
  json,
  pgTable,
  text,
  timestamp
} from 'drizzle-orm/pg-core'
import { z } from 'zod'
import { account, user } from './auth'

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
  media: json('media').$type<Media[]>().default([]),
  mediaIds: json('media_ids').$type<string[]>().default([]),
  s3Keys: json('s3_keys').$type<string[]>().default([]),
  qstashId: text('qstash_id'),
  twitterId: text('twitter_id'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => account.id, { onDelete: 'cascade' }),
  isReplyTo: text('is_reply_to'),

  isQueued: boolean('is_queued').default(false),
  isScheduled: boolean('is_scheduled').default(false).notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  isError: boolean('is_error').default(false).notNull(),
  errorMessage: text('error_message'),
  isProcessing: boolean('is_processing').default(false).notNull(),

  // unix timestamp in milliseconds
  scheduledUnix: bigint('scheduled_unix', { mode: 'number' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export type Tweet = InferSelectModel<typeof tweets>
export type InsertTweet = InferInsertModel<typeof tweets>
export type TweetQuery = InferSelectModel<typeof tweets>

export const referenceTweets = pgTable('reference_tweets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  topic: text('topic'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  engagedAt: timestamp('engaged_at'),
  likes: integer('likes').default(0),
  retweets: integer('retweets').default(0),
  replies: integer('replies').default(0),
  views: integer('views').default(0),
  impressions: integer('impressions').default(0),
  author: json('author').$type<{
    name: string
    username: string
    profilePicture: string
    isVerified: boolean
    followers: number
  }>(),
})

export const referenceTweetInsertSchema = z.object({
  id: z.string(),
  topic: z.string().optional(),
  createdAt: z.string().datetime().or(z.date()).optional(),
  likes: z.number().int().min(0).default(0),
  retweets: z.number().int().min(0).default(0),
  replies: z.number().int().min(0).default(0),
  views: z.number().int().min(0).default(0),
  impressions: z.number().int().min(0).default(0),
  author: z
    .object({
      name: z.string(),
      username: z.string(),
      profilePicture: z.string().url(),
      isVerified: z.boolean(),
      followers: z.number().int().min(0),
    })
    .optional(),
})

export type ReferenceTweetInsert = z.infer<typeof referenceTweetInsertSchema>
