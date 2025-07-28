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

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  endpoint,
  forcePathStyle: isLocalS3,
})

const BUCKET_NAME = bucketName

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const urlGenerator = (fileKey: string): string => {
  if (isLocalS3) {
    return `http://localhost:4566/sample-bucket/knowledge/7nclw9kBCjj0uhjqKLRhAJUwOiY0nycA/82mP6RZJK8j4DiAQ8vQhc.pdf`
  }

  return `https://${bucketName}.s3.amazonaws.com/${fileKey}`
}

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

const FILE_TYPE_MAP = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
} as const

/**
 * A wrapper class for AWS S3 client configuration and related utilities/constants.
 * Useful for accessing the configured S3 client and commonly used values like
 * allowed file types, bucket name, and utilities such as URL generation.
 */
class S3Wrapper {
  /**
   * Returns the initialized AWS S3 client.
   *
   * @returns {S3Client} The configured S3 client instance.
   */
  public client(): S3Client {
    return s3Client
  }

  /**
   * Provides constants related to S3 operations.
   *
   * @returns {{
   *   ALLOWED_DOCUMENT_TYPES: readonly string[],
   *   ALLOWED_IMAGE_TYPES: readonly string[],
   *   BUCKET_NAME: string,
   *   MAX_FILE_SIZE: number,
   *   FILE_TYPE_MAP: Readonly<Record<string, string>>
   * }} An object containing file type constraints, bucket name, size limits, etc.
   */
  get constants() {
    return {
      ALLOWED_DOCUMENT_TYPES,
      ALLOWED_IMAGE_TYPES,
      BUCKET_NAME,
      MAX_FILE_SIZE,
      FILE_TYPE_MAP,
    }
  }

  /**
   * Provides utility functions related to S3.
   *
   * @returns {{
   *   urlGenerator: (fileKey: string) => string
   * }} An object containing utility functions for working with S3.
   */
  get utils() {
    return {
      urlGenerator,
    }
  }
}

const s3 = new S3Wrapper()

export { s3 }
