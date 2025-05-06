import { z } from "zod"
import { j, privateProcedure } from "../jstack"
import { redis } from "../../lib/redis"
import { HTTPException } from "hono/http-exception"
import { SerializedEditorState, SerializedLexicalNode } from "lexical"
import { after } from "next/server"

interface Document {
  id: string
  title: string
  content: SerializedEditorState<SerializedLexicalNode> | null
  updatedAt: Date
  [key: string]: unknown
}

interface DocumentMeta {
  id: string
  title: string
  updatedAt: Date
}

export const docRouter = j.router({
  save: privateProcedure
    .input(
      z.object({
        documentId: z.string(),
        content: z.any(),
        title: z.string(),
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { documentId, content, title } = input

      const document: Document = {
        id: documentId,
        title,
        content: content as unknown as SerializedEditorState<SerializedLexicalNode>,
        updatedAt: new Date(),
      }

      const meta: DocumentMeta = {
        id: documentId,
        title,
        updatedAt: document.updatedAt,
      }

      await Promise.all([
        redis.json.set(`context-doc:${user.email}:${documentId}`, "$", document),
        redis.hset(`context-docs:${user.email}`, { [documentId]: meta }),
      ])

      return c.superjson({
        success: true,
        documentId,
        updatedAt: document.updatedAt,
      })
    }),

  create: privateProcedure.mutation(async ({ c, ctx }) => {
    const { user } = ctx
    const documentId = crypto.randomUUID()

    const document: Document = {
      id: documentId,
      title: "",
      content: null,
      updatedAt: new Date(),
    }

    const meta: DocumentMeta = {
      id: documentId,
      title: "",
      updatedAt: document.updatedAt,
    }

    after(async () => {
      await Promise.all([
        redis.json.set(`context-doc:${user.email}:${documentId}`, "$", document),
        redis.hset(`context-docs:${user.email}`, { [documentId]: meta }),
      ])
    })

    return c.superjson({
      success: true,
      documentId,
      document,
    })
  }),

  get: privateProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { documentId } = input

      const document = await redis.json.get<Document>(
        `context-doc:${user.email}:${documentId}`
      )

      if (!document) {
        throw new HTTPException(404, { message: "document not found" })
      }

      return c.superjson({
        success: true,
        document,
      })
    }),

  list: privateProcedure.query(async ({ c, ctx }) => {
    const { user } = ctx
    const docs = await redis.hgetall(`context-docs:${user.email}`) || {}

    const documents: DocumentMeta[] = Object.values(docs)
      .map((doc) => doc as DocumentMeta)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return c.superjson(documents)
  }),

  delete: privateProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { documentId } = input

      await Promise.all([
        redis.del(`context-doc:${user.email}:${documentId}`),
        redis.hdel(`context-docs:${user.email}`, documentId),
      ])

      return c.superjson({
        success: true,
        documentId,
      })
    }),
})
