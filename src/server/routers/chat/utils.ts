import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { Attachment } from './chat-router'
import { s3 } from '@/lib/s3'
import mammoth from 'mammoth'
import { FilePart, ImagePart, TextPart } from 'ai'
import { db } from '@/db'
import { knowledgeDocument } from '@/db/schema'
import { eq } from 'drizzle-orm'

const { BUCKET_NAME, FILE_TYPE_MAP } = s3.constants

// Helper function to fetch video transcript with polling
const fetchVideoTranscript = async (
  s3Key: string,
  maxAttempts: number = 10,
  delayMs: number = 2000,
): Promise<string | null> => {
  const transcriptKey = s3Key.replace(/\.[^/.]+$/, '.json') // Replace file extension with .json

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: `transcriptions/${transcriptKey}`,
      })

      const response = await s3.client().send(command)

      if (response.Body) {
        const bodyContents = await response.Body.transformToString()
        const transcriptionData = JSON.parse(bodyContents) as any

        // Extract transcript text from the transcription JSON
        if (transcriptionData.text) {
          return transcriptionData.text
        }

        return 'Transcript content found but format not recognized'
      }
    } catch (error: any) {
      // Check if it's a NoSuchKey error (404 equivalent)
      if (error.name === 'NoSuchKey' && attempt < maxAttempts) {
        console.log(`Transcript not ready yet (attempt ${attempt}), waiting...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }

      console.error(`Error fetching transcript (attempt ${attempt}):`, error)

      // If not the last attempt, wait and try again
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        continue
      }
    }
  }

  return null // Transcript not ready or doesn't exist
}

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

      const data = await s3.client().send(command)
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
      } else if (attachment.type === 'video') {
        // Handle video transcript
        const transcript = await fetchVideoTranscript(attachment.fileKey!)

        if (transcript) {
          return {
            type: 'text' as const,
            text: `<video_transcript>${transcript}</video_transcript>`,
          } as TextPart
        } else {
          // If transcript is not ready, return a placeholder
          return {
            type: 'text' as const,
            text: `<video_transcript>Video transcript is being processed and is not yet available. Please try again in a few moments.</video_transcript>`,
          } as TextPart
        }
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
