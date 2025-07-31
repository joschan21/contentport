const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME
const isLocalS3 = process.env.NEXT_PUBLIC_AWS_USE_LOCAL_BOOL === 'true'

/**
 * Generates an S3 URL for the given file key
 * @param fileKey - The S3 object key
 * @returns The complete URL to access the S3 object
 * @throws Error if bucket name is not configured or fileKey is invalid
 */
export const s3UrlGenerator = (fileKey: string): string => {
  if (!bucketName) throw new Error('Missing S3 bucket name (NEXT_PUBLIC_S3_BUCKET_NAME)')

  if (isLocalS3) {
    return `http://localhost:4566/${bucketName}/${fileKey}`
  }

  return `https://${bucketName}.s3.amazonaws.com/${fileKey}`
}
