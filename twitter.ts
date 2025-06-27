let accessToken =
  'UE0tZmNkeFpRMzM1ckwtMG10LW1xOHpMUGtQZmdfNndJT2VfaGpxRWh1QnJyOjE3NTA3NjkxNDE4NTI6MTowOmF0OjE'

import { TwitterApi } from 'twitter-api-v2'
import 'dotenv/config'
import * as fs from 'fs'

const consumerKey = 'dtcZgPjt85VKEe4XrxhmTs0n5'
const consumerSecret = 'dSWDC5M4kROfyQPpiQiZDs5Y8eT8IWTUZ9HHBP6p0T15Iy6xk1'

const client = new TwitterApi({
  appKey: consumerKey,
  appSecret: consumerSecret,
  // accessToken: '1936157453579640832-MmCLnjZz1C2PgLaXxKvHp4jWdlYTui',
  // accessSecret: 'EHOr8mGbLjR6QRwR1CHcJYI69HyjNtkxzUddW6SB4IqJ7',
})

const uploadMedia = async () => {
  const mediaData = fs.readFileSync('./settings.png') // or any image path
  const mediaId = await client.v1.uploadMedia(mediaData, { mimeType: 'image/png' })

  console.log(mediaId)
}

uploadMedia()
