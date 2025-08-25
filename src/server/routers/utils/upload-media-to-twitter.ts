import { Account } from '@/db/schema'
import { redis } from '@/lib/redis'
import { HTTPException } from 'hono/http-exception'
import { TwitterApi } from 'twitter-api-v2'

const consumerKey = process.env.TWITTER_CONSUMER_KEY as string
const consumerSecret = process.env.TWITTER_CONSUMER_SECRET as string

export const validateMediaUploadAge = async (mediaId: string): Promise<boolean> => {
  const uploadTimestamp = await redis.get<number>(`tweet-media-upload:${mediaId}`)
  
  if (!uploadTimestamp) {
    return false
  }
  
  const now = Date.now()
  const twentyFourHoursInMs = 24 * 60 * 60 * 1000
  
  return (now - uploadTimestamp) < twentyFourHoursInMs
}

export const ensureValidMedia = async ({
  account,
  mediaItems,
}: {
  account: Account
  mediaItems: { s3Key: string; media_id: string }[]
}): Promise<{ s3Key: string; media_id: string }[]> => {
  const validatedMedia: { s3Key: string; media_id: string }[] = []
  
  for (const mediaItem of mediaItems) {
    const isValid = await validateMediaUploadAge(mediaItem.media_id)
    
    if (isValid) {
      validatedMedia.push(mediaItem)
    } else {
      const mediaUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${mediaItem.s3Key}`
      const response = await fetch(mediaUrl)
      
      if (!response.ok) {
        throw new HTTPException(400, { message: `Failed to fetch media from S3: ${mediaItem.s3Key}` })
      }
      
      const contentType = response.headers.get('content-type') || ''
      let mediaType: string
      
      if (contentType.startsWith('image/gif')) {
        mediaType = 'gif'
      } else if (contentType.startsWith('image/')) {
        mediaType = 'image'
      } else if (contentType.startsWith('video/')) {
        mediaType = 'video'
      } else {
        throw new HTTPException(400, { message: `Unsupported media type: ${contentType}` })
      }
      
      const { mediaId: newMediaId } = await uploadMediaToTwitter({
        account,
        s3Key: mediaItem.s3Key,
        mediaType,
      })
      
      const nowUnix = Date.now()
      await redis.set(`tweet-media-upload:${newMediaId}`, nowUnix, {
        ex: 60 * 60 * 24,
      })
      
      validatedMedia.push({
        s3Key: mediaItem.s3Key,
        media_id: newMediaId,
      })
    }
  }
  
  return validatedMedia
}

export const uploadMediaToTwitter = async ({
  account,
  s3Key,
  mediaType,
  additionalOwners,
}: {
  account: Account
  s3Key: string
  mediaType: string
  additionalOwners?: string[]
}) => {
  const client = new TwitterApi({
    appKey: consumerKey as string,
    appSecret: consumerSecret as string,
    accessToken: account.accessToken as string,
    accessSecret: account.accessSecret as string,
  })

  const mediaUrl = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`
  const response = await fetch(mediaUrl)

  if (!response.ok) {
    throw new HTTPException(400, { message: 'Failed to fetch media from S3' })
  }

  const buffer = await response.arrayBuffer()

  let mimeType: string = ''

  switch (mediaType) {
    case 'image':
      mimeType = response.headers.get('content-type') || 'image/png'
      break
    case 'gif':
      mimeType = 'image/gif'
      break
    case 'video':
      mimeType = response.headers.get('content-type') || 'video/mp4'
      break
  }

  const mediaBuffer = Buffer.from(buffer)
  const mediaId = await client.v1.uploadMedia(mediaBuffer, {
    mimeType,
    additionalOwners,
  })

  return { mediaId }
}
