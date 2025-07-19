import {
  json,
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { user } from './auth'
import { InferEnum, InferSelectModel } from 'drizzle-orm'
import { TweetMetadata } from '@/server/routers/knowledge-router'

export const knowledgeTypeEnum = pgEnum('knowledge_type', [
  'url',
  'txt',
  'docx',
  'pdf',
  'image',
  'manual',
])

export const knowledgeDocument = pgTable('knowledge_document', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  type: knowledgeTypeEnum('type').notNull(),
  s3Key: text('s3_key').notNull(),
  title: text('title'),
  description: text('description'),
  isDeleted: boolean("is_deleted").notNull().default(false),
  isExample: boolean('is_example').notNull().default(false),
  tags: json('tags').$type<string[]>().default([]),
  editorState: json('editor_state').default(null),
  isStarred: boolean('is_starred').notNull().default(false),
  sizeBytes: integer('size_bytes'),
  metadata: json().$type<TweetMetadata | {}>().default({}),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const knowledgeTags = pgTable('knowledge_tags', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  knowledgeId: text('knowledge_id')
    .notNull()
    .references(() => knowledgeDocument.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type KnowledgeDocument = InferSelectModel<typeof knowledgeDocument> & {
  metadata: Record<string, any>
}
export type KnowledgeTag = InferSelectModel<typeof knowledgeTags>
export type KnowledgeType = InferEnum<typeof knowledgeTypeEnum>
