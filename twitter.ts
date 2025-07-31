import { TwitterApi } from 'twitter-api-v2'
import 'dotenv/config'
import * as fs from 'fs'

const consumerKey = Bun.env.TWITTER_CONSUMER_KEY as string
const consumerSecret = Bun.env.TWITTER_CONSUMER_SECRET as string

const client = new TwitterApi({
  appKey: consumerKey,
  appSecret: consumerSecret,
})

const uploadMedia = async () => {
  const mediaData = fs.readFileSync('./settings.png') // or any image path
  const mediaId = await client.v1.uploadMedia(mediaData, { mimeType: 'image/png' })

  console.log(mediaId)
}

uploadMedia()
