import { S3Client } from "@aws-sdk/client-s3"

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_GENERAL_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_GENERAL_SECRET_KEY!,
  },
})

export const BUCKET_NAME = 'contentport-dev'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

export const FILE_TYPE_MAP = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
    'image/jpeg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'image/svg+xml': 'image',
  } as const
