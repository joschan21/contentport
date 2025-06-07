import { db } from '@/db'
import { listKnowledgeDocuments } from '@/db/queries/knowledge'
import { knowledgeDocument } from '@/db/schema'
import { firecrawl } from '@/lib/firecrawl'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Index } from '@upstash/vector'
import { and, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { j, privateProcedure } from '../jstack'

const index = new Index({
  url: 'https://nearby-oriole-27178-eu1-vector.upstash.io',
  token:
    'ABcFMG5lYXJieS1vcmlvbGUtMjcxNzgtZXUxYWRtaW5ZMkkwTWpreVlXTXRNV0kwTUMwME5XUTJMV0kyT0RrdE56VXpZMkl5TUdFNU56TTA=',
})

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '.', '!', '?', ';', ',', ' '],
})

export const knowledgeRouter = j.router({
  getDocument: privateProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx

      const [document] = await db
        .select()
        .from(knowledgeDocument)
        .where(
          and(eq(knowledgeDocument.userId, user.id), eq(knowledgeDocument.id, input.id)),
        )

      if (!document) {
        throw new HTTPException(404, { message: 'Document not found' })
      }

      return c.superjson({ document })
    }),
  list: privateProcedure
    .input(
      z
        .object({
          isStarred: z.boolean().optional(),
          limit: z.number().min(1).max(100).default(100).optional(),
          offset: z.number().min(0).default(0).optional(),
        })
        .optional(),
    )
    .query(async ({ c, ctx, input }) => {
      const { user } = ctx

      const documents = await listKnowledgeDocuments(user.id, {
        isStarred: input?.isStarred,
        limit: input?.limit ?? 100,
        offset: input?.offset,
      })

      return c.superjson({
        documents,
        total: documents.length,
      })
    }),

  delete: privateProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx

      try {
        await db
          .update(knowledgeDocument)
          .set({ isDeleted: true })
          .where(
            and(
              eq(knowledgeDocument.id, input.id),
              eq(knowledgeDocument.userId, user.id),
            ),
          )

        return c.json({
          success: true,
        })
      } catch (error) {
        console.error('Error deleting knowledge document:', error)

        if (error instanceof HTTPException) {
          throw error
        }

        throw new HTTPException(500, {
          message: 'Failed to delete document',
        })
      }
    }),

  importUrl: privateProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx

      if (!process.env.FIRECRAWL_API_KEY) {
        throw new HTTPException(500, {
          message: 'Firecrawl API key not configured',
        })
      }

      try {
        const result = await firecrawl.scrapeUrl(input.url, {
          formats: ['markdown'],
        })

        if (!result.success) {
          throw new HTTPException(400, {
            message: `Failed to fetch URL: ${result.error || 'Unknown error'}`,
          })
        }

        const title = result.metadata?.title || new URL(input.url).hostname
        const content = result.markdown || ''

        if (!content) {
          throw new HTTPException(400, {
            message: 'No content could be extracted from the URL',
          })
        }

        const [document] = await db
          .insert(knowledgeDocument)
          .values({
            fileName: '',
            s3Key: '',
            type: 'url',
            userId: user.id,
            description: result.metadata?.description,
            title,
            sourceUrl: input.url,
          })
          .returning()

        if (!document) {
          throw new HTTPException(500, {
            message: 'Failed to create document',
          })
        }

        return c.json({
          success: true,
          documentId: document.id,
          title: title,
          url: input.url,
        })
      } catch (error) {
        console.error('Error importing URL:', error)

        if (error instanceof HTTPException) {
          throw error
        }

        throw new HTTPException(500, {
          message: 'Failed to import URL. Please try again later.',
        })
      }
    }),
})
