import { j, privateProcedure } from '../jstack'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { z } from 'zod'
import { FILE_TYPE_MAP, s3Client } from '@/lib/s3'
import { HeadObjectCommand, HeadObjectCommandOutput } from '@aws-sdk/client-s3'
import { db } from '@/db'
import { knowledgeDocument } from '@/db/schema'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const BUCKET_NAME = 'contentport-dev'

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

// Twitter-compliant media types and size limits
const TWITTER_MEDIA_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  gif: ['image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
} as const

const TWITTER_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  gif: 15 * 1024 * 1024, // 15MB
  video: 512 * 1024 * 1024, // 512MB
} as const

export const fileRouter = j.router({
  upload: privateProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        source: z.enum(['knowledge', 'chat']).optional(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx

      let type = FILE_TYPE_MAP[input.fileType as keyof typeof FILE_TYPE_MAP]

      const isValidFileType = [
        ...ALLOWED_DOCUMENT_TYPES,
        ...ALLOWED_IMAGE_TYPES,
      ].includes(input.fileType as keyof typeof FILE_TYPE_MAP)

      if (!isValidFileType) {
        throw new HTTPException(400, {
          message:
            'Invalid file type. Please upload a document (pdf, docx, txt) or image',
        })
      }

      const fileExtension = input.fileName.split('.').pop() || ''
      const fileKey = `${input.source ?? 'chat'}/${user.id}/${nanoid()}.${fileExtension}`

      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Conditions: [
          ['content-length-range', 0, 10485760],
          ['eq', '$Content-Type', input.fileType],
        ],
        Expires: 3600,
        Fields: {
          'Content-Type': input.fileType,
        },
      })

      return c.json({
        url,
        fields,
        fileKey,
        type,
      })
    }),

  uploadTweetMedia: privateProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx

      // Determine media type and validate against Twitter requirements
      let mediaType: 'image' | 'gif' | 'video'
      let sizeLimit: number

      if (TWITTER_MEDIA_TYPES.image.includes(input.fileType as any)) {
        mediaType = 'image'
        sizeLimit = TWITTER_SIZE_LIMITS.image
      } else if (TWITTER_MEDIA_TYPES.gif.includes(input.fileType as any)) {
        mediaType = 'gif'
        sizeLimit = TWITTER_SIZE_LIMITS.gif
      } else if (TWITTER_MEDIA_TYPES.video.includes(input.fileType as any)) {
        mediaType = 'video'
        sizeLimit = TWITTER_SIZE_LIMITS.video
      } else {
        throw new HTTPException(400, {
          message:
            'Invalid media type. Twitter supports JPG, PNG, WEBP, GIF, and MP4 files.',
        })
      }

      const fileExtension = input.fileName.split('.').pop() || ''
      const fileKey = `tweet-media/${user.id}/${nanoid()}.${fileExtension}`

      const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Conditions: [
          ['content-length-range', 0, sizeLimit],
          ['eq', '$Content-Type', input.fileType],
        ],
        Expires: 3600,
        Fields: {
          'Content-Type': input.fileType,
        },
      })

      return c.json({
        url,
        fields,
        fileKey,
        mediaType,
        sizeLimit,
      })
    }),

  promoteToKnowledgeDocument: privateProcedure
    .input(
      z.object({
        fileKey: z.string(),
        fileName: z.string(),
        tags: z.array(z.string()).optional(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { fileKey, fileName, tags, title } = input

      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileKey,
      })

      let res: HeadObjectCommandOutput | undefined = undefined

      try {
        res = await s3Client.send(command)
      } catch (err) {
        throw new HTTPException(404, { message: 'File not found' })
      }

      const type = FILE_TYPE_MAP[res.ContentType as keyof typeof FILE_TYPE_MAP]

      let description: string | undefined = undefined

      if (type === 'pdf') {
        const response = await fetch(
          `https://contentport-dev.s3.amazonaws.com/${fileKey}`,
        )
        const buffer = await response.arrayBuffer()
        const { info, text } = await pdfParse(Buffer.from(buffer))

        let metadataDescription = ''
        if (info?.Title) {
          metadataDescription += info.Title
        }
        if (info?.Subject && info.Subject !== info?.Title) {
          metadataDescription += metadataDescription ? ` - ${info.Subject}` : info.Subject
        }
        if (info?.Author) {
          metadataDescription += metadataDescription
            ? ` by ${info.Author}`
            : `by ${info.Author}`
        }

        description = (metadataDescription.trim() + ' ' + text.slice(0, 100)).slice(
          0,
          100,
        )
      } else if (type === 'docx') {
        const response = await fetch(
          `https://contentport-dev.s3.amazonaws.com/${fileKey}`,
        )
        const buffer = await response.arrayBuffer()
        const { value } = await mammoth.extractRawText({
          buffer: Buffer.from(buffer),
        })

        description = value.slice(0, 100)
      } else if (type === 'txt') {
        const response = await fetch(
          `https://contentport-dev.s3.amazonaws.com/${fileKey}`,
        )
        const text = await response.text()
        description = text.slice(0, 100)
      } else if (type !== 'image') {
        description = 'No preview available'
      }

      await db.insert(knowledgeDocument).values({
        userId: user.id,
        fileName,
        s3Key: fileKey,
        type,
        tags,
        title,
        description,
        isExample: false,
        isStarred: false,
        sizeBytes: res.ContentLength,
        metadata: {},
        sourceUrl: '',
      })

      return c.json({ success: true })
    }),
})
