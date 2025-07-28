const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME
const isLocalS3 = process.env.NEXT_PUBLIC_AWS_USE_LOCAL_BOOL ? true : false

export const s3UrlGenerator = (fileKey: string): string => {
  if (!bucketName) throw new Error('Missing S3 bucket name (NEXT_PUBLIC_S3_BUCKET_NAME)')

  if (isLocalS3) {
    return `http://localhost:4566/${bucketName}/${fileKey}`
  }

  return `https://${bucketName}.s3.amazonaws.com/${fileKey}`
}
