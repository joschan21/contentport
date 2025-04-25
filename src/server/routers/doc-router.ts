import { z } from "zod"
import { j, publicProcedure } from "../jstack"
import { redis } from "../../lib/redis"
import { HTTPException } from "hono/http-exception"
import { SerializedEditorState, SerializedLexicalNode } from "lexical"

interface Document {
  id: string
  title: string
  content: SerializedEditorState<SerializedLexicalNode> | null
  updatedAt: Date
  [key: string]: unknown
}

export const docRouter = j.router({
  save: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
        content: z.any(),
        title: z.string(),
      })
    )
    .mutation(async ({ c, input }) => {
      const { documentId, content, title } = input

      const document: Document = {
        id: documentId,
        title,
        content:
          content as unknown as SerializedEditorState<SerializedLexicalNode>,
        updatedAt: new Date(),
      }

      await redis.json.set(`context:doc:${documentId}`, "$", document)

      return c.superjson({
        success: true,
        documentId,
        updatedAt: document.updatedAt,
      })
    }),

  create: publicProcedure.mutation(async ({ c, input }) => {
    const documentId = crypto.randomUUID()

    const document: Document = {
      id: documentId,
      title: "",
      content: null,
      updatedAt: new Date(),
    }

    await redis.json.set(`context:doc:${documentId}`, "$", document)

    return c.superjson({
      success: true,
      documentId,
      document,
    })
  }),

  get: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .query(async ({ c, input }) => {
      const { documentId } = input

      const document = await redis.json.get<Document>(
        `context:doc:${documentId}`
      )

      if (!document) {
        throw new HTTPException(404, { message: "document not found" })
      }

      return c.superjson({
        success: true,
        document,
      })
    }),

  list: publicProcedure.query(async ({ c }) => {
    const keys = await redis.keys("context:doc:*")

    const documents: Document[] = []

    for (const key of keys) {
      const document = await redis.json.get<Document>(key)
      if (document) documents.push(document)
    }

    documents.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return c.superjson(documents)
  }),

  delete: publicProcedure
    .input(
      z.object({
        documentId: z.string(),
      })
    )
    .mutation(async ({ c, input }) => {
      const { documentId } = input
      await redis.del(`context:doc:${documentId}`)
      return c.superjson({
        success: true,
        documentId,
      })
    }),
})
