import { Tweet } from "@/db/schema";
import { BUCKET_NAME, s3Client } from "@/lib/s3";
import { HeadObjectCommand } from "@aws-sdk/client-s3";

export async function fetchMediaFromS3(media: { s3Key: string; media_id: string }[]) {
  const mediaData = await Promise.all(
    media.map(async (m) => {
      try {
        const headResponse = await s3Client.send(
          new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: m.s3Key,
          }),
        )

        const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${m.s3Key}`
        const contentType = headResponse.ContentType || ''

        // Determine media type from content-type or file extension
        let type: 'image' | 'gif' | 'video' = 'image'

        if (
          contentType.startsWith('video/') ||
          m.s3Key.toLowerCase().includes('.mp4') ||
          m.s3Key.toLowerCase().includes('.mov')
        ) {
          type = 'video'
        } else if (
          contentType === 'image/gif' ||
          m.s3Key.toLowerCase().endsWith('.gif')
        ) {
          type = 'gif'
        } else if (contentType.startsWith('image/')) {
          type = 'image'
        }

        return {
          url,
          type,
          media_id: m.media_id,
          s3Key: m.s3Key,
          uploaded: true,
          uploading: false,
          file: null,
        }
      } catch (error) {
        console.error('Failed to fetch media from S3:', error)
        throw new Error('Failed to fetch media from S3')
      }
    }),
  )
  return mediaData
}

export type TweetWithMedia = Omit<Tweet, 'media'> & {
  media: Awaited<ReturnType<typeof fetchMediaFromS3>>
}
