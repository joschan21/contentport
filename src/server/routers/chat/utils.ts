import { HeadObjectCommand } from '@aws-sdk/client-s3'
import { Attachment } from './chat-router'
import { BUCKET_NAME, FILE_TYPE_MAP, s3Client } from '@/lib/s3'
import mammoth from 'mammoth'
import { FilePart, ImagePart, TextPart } from 'ai'
import { db } from '@/db'
import { knowledgeDocument } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const parseAttachments = async ({
  attachments,
}: {
  attachments?: Attachment[]
}) => {
  const validAttachments =
    attachments?.filter((a) => Boolean(a.fileKey) || Boolean(a.type === 'url')) ?? []

  const attachmentContents = await Promise.all(
    validAttachments.map(async (attachment) => {
      if (attachment.type === 'url') {
        const { id } = attachment
        const [document] = await db
          .select()
          .from(knowledgeDocument)
          .where(eq(knowledgeDocument.id, id))


        if (document && document.sourceUrl) {
          return { type: 'link' as const, link: document.sourceUrl }
        }
      }

      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: attachment.fileKey,
      })

      const data = await s3Client.send(command)
      const contentType = data.ContentType as keyof typeof FILE_TYPE_MAP

      const type = FILE_TYPE_MAP[contentType as keyof typeof FILE_TYPE_MAP]
      const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${attachment.fileKey}`

      if (type === 'image') {
        return { type: 'image' as const, image: url } as ImagePart
      } else if (type === 'docx') {
        const response = await fetch(url)
        const buffer = await response.arrayBuffer()
        const { value } = await mammoth.extractRawText({
          buffer: Buffer.from(buffer),
        })
        return {
          type: 'text' as const,
          text: `<attached_docx>${value}</attached_docx>`,
        } as TextPart
      } else {
        return { type: 'file' as const, data: url, mimeType: contentType } as FilePart
      }
    }),
  )

  const images = attachmentContents.filter(Boolean).filter((a) => a.type === 'image')
  const files = attachmentContents
    .filter(Boolean)
    .filter((a) => a.type !== 'image' && a.type !== 'link')
  const links = attachmentContents.filter(Boolean).filter((a) => a.type === 'link')

  return { images, files, links }
}

export class PromptBuilder {
  private parts: string[] = []

  add(content: string | undefined | null): this {
    if (content?.trim()) {
      this.parts.push(content.trim())
    }
    return this
  }

  build(): string {
    return this.parts.join('\n\n').trim()
  }
}
