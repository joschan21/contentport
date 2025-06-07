import { json, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { InferSelectModel } from "drizzle-orm"

export const tweets = pgTable("tweets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text("content").default("").notNull(),
  editorState: json("editor_state").default(null),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export type Tweet = InferSelectModel<typeof tweets>
export type TweetQuery = InferSelectModel<typeof tweets>
