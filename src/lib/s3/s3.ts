import { S3Client } from '@aws-sdk/client-s3'
import { s3UrlGenerator } from '@/lib/s3/modules/utils'

const isLocalS3 = process.env.NEXT_PUBLIC_AWS_USE_LOCAL_BOOL ? true : false
const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME

if (!bucketName) throw new Error('Missing S3 bucket name (NEXT_PUBLIC_S3_BUCKET_NAME)')

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_GENERAL_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_GENERAL_SECRET_KEY!,
  },
  endpoint: process.env.AWS_S3_ENDPOINT, // only required if you are using localstack for aws - can be undefined for prod
  forcePathStyle: isLocalS3, // only required if you are using localstack for aws - can be undefined for prod
})

const BUCKET_NAME = bucketName
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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
      urlGenerator: s3UrlGenerator,
    }
  }
}

const s3 = new S3Wrapper()

export { s3 }
