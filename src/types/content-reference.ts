import { KnowledgeDocument } from "@/db/schema"

interface BaseContentReference {
  id: string
  title: string
  type: KnowledgeDocument["type"]
  sourceUrl?: string | null
  metadata?: Record<string, any>
}

export interface Attachment extends BaseContentReference {
  lifecycle: "session"
  uploadStatus?: "pending" | "uploading" | "completed" | "failed"
  file?: File
}

interface KnowledgeDoc extends BaseContentReference {
  lifecycle: "persistent"
}

export type ContentReference = Attachment | KnowledgeDoc
