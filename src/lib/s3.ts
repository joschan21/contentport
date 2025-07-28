import { S3Client } from '@aws-sdk/client-s3'

const accessKeyId = process.env.AWS_GENERAL_ACCESS_KEY
const secretAccessKey = process.env.AWS_GENERAL_SECRET_KEY
const region = process.env.AWS_REGION || 'us-east-1'
const endpoint = process.env.AWS_S3_ENDPOINT
const bucketName = process.env.S3_BUCKET_NAME || 'sample-bucket'
const isLocalS3 = process.env.AWS_USE_LOCAL_BOOL ? true : false

if (!accessKeyId || !secretAccessKey)
  throw new Error('Missing AWS credentials (AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY)')
if (!endpoint) throw new Error('Missing AWS endpoint')
if (!bucketName) throw new Error('Missing S3 bucket name (S3_BUCKET_NAME)')
if (!region) throw new Error('Missing AWS region')

export const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_GENERAL_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_GENERAL_SECRET_KEY!,
  },
  endpoint,
  forcePathStyle: isLocalS3,
})

export const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET_NAME

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export const s3UrlGenerator = (fileKey: string): string => {
  if (isLocalS3) {
    return `http://localhost:4566/sample-bucket/knowledge/7nclw9kBCjj0uhjqKLRhAJUwOiY0nycA/82mP6RZJK8j4DiAQ8vQhc.pdf`
  }

  return `https://${bucketName}.s3.amazonaws.com/${fileKey}`
}

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

export class S3Wrapper {
  public func(): void {}

  get constants() {
    return {
      ALLOWED_DOCUMENT_TYPES,
      ALLOWED_IMAGE_TYPES,
      BUCKET_NAME,
      MAX_FILE_SIZE,
      FILE_TYPE_MAP,
    }
  }
}

const s3Helper = new S3Wrapper()

export { s3Helper }
