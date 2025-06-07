import { db } from '../index'
import { eq, desc, and, or, like, inArray, sql } from 'drizzle-orm'
import { SerializedEditorState, SerializedLexicalNode } from 'lexical'
import { KnowledgeDocument, knowledgeDocument, knowledgeTags } from '../schema'

export interface CreateDocumentInput {
  title: string
  content: string
  editorState?: SerializedEditorState<SerializedLexicalNode>
  category?: 'url' | 'file' | 'manual'
  sourceUrl?: string
  sourceType?: string
  metadata?: Record<string, any>
  userId: string
}

export interface UpdateDocumentInput {
  title?: string
  content?: string
  editorState?: SerializedEditorState<SerializedLexicalNode>
  category?: 'url' | 'file' | 'manual'
  wordCount?: number
  isStarred?: boolean
}

export const updateDocument = async (
  documentId: string,
  userId: string,
  input: UpdateDocumentInput,
) => {
  const updateData = { ...input, updatedAt: new Date() }

  if (input.content) {
    updateData.wordCount = input.content
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }

  const [updated] = await db
    .update(knowledgeDocument)
    .set(updateData)
    .where(
      and(eq(knowledgeDocument.id, documentId), eq(knowledgeDocument.userId, userId)),
    )
    .returning()

  return updated || null
}

export const getDocument = async (documentId: string, userId: string) => {
  const [document] = await db
    .select()
    .from(knowledgeDocument)
    .where(
      and(eq(knowledgeDocument.id, documentId), eq(knowledgeDocument.userId, userId)),
    )
    .limit(1)

  // @ts-ignore
  return document || null
}

export const listKnowledgeDocuments = async (
  userId: string,
  options?: {
    isStarred?: boolean
    search?: string
    limit?: number
    offset?: number
  },
) => {
  const conditions = [
    eq(knowledgeDocument.userId, userId),
    or(eq(knowledgeDocument.isDeleted, false), eq(knowledgeDocument.isExample, true)),
  ]

  // if (options?.category) {
  //   conditions.push(eq(knowledgeDocument.category, options.category))
  // }

  if (options?.isStarred !== undefined) {
    conditions.push(eq(knowledgeDocument.isStarred, options.isStarred))
  }

  const query = db
    .select({
      id: knowledgeDocument.id,
      title: knowledgeDocument.title,
      type: knowledgeDocument.type,
      isStarred: knowledgeDocument.isStarred,
      sourceUrl: knowledgeDocument.sourceUrl,
      createdAt: knowledgeDocument.createdAt,
      updatedAt: knowledgeDocument.updatedAt,
      metadata: knowledgeDocument.metadata,
      s3Key: knowledgeDocument.s3Key,
      isExample: knowledgeDocument.isExample,
      isDeleted: knowledgeDocument.isDeleted,
      description: knowledgeDocument.description,
      sizeBytes: knowledgeDocument.sizeBytes,
      // content: sql<string>`SUBSTRING(${knowledgeDocument.content}, 1, 100)`,
    })
    .from(knowledgeDocument)
    .where(and(...conditions))
    .orderBy(desc(knowledgeDocument.updatedAt))
    .$dynamic()

  if (options?.limit) {
    query.limit(options.limit)
  }

  if (options?.offset) {
    query.offset(options.offset)
  }

  return await query
}

export const deleteKnowledgeDocument = async (
  documentId: string,
  userId: string,
): Promise<boolean> => {
  const result = await db
    .delete(knowledgeDocument)
    .where(
      and(eq(knowledgeDocument.id, documentId), eq(knowledgeDocument.userId, userId)),
    )

  return !!result
}
/*  */