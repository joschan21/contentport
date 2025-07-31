import { S3Event, S3Handler } from 'aws-lambda'
import { S3 } from 'aws-sdk'
import OpenAI from 'openai'
import { createReadStream } from 'fs'
import { writeFileSync, unlinkSync } from 'fs'
import { basename, extname } from 'path'

const VIDEO_EXTENSIONS = ['.mp4', '.mov']
const s3 = new S3()
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const handler: S3Handler = async (event: S3Event) => {
  console.log('Received S3 event:', JSON.stringify(event, null, 2))

  for (const record of event.Records) {
    const bucketName = record.s3.bucket.name
    const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

    if (!isVideoFile(objectKey)) {
      console.log(`Skipping non-video file: ${objectKey}`)
      continue
    }

    console.log(`Processing video: s3://${bucketName}/${objectKey}`)

    try {
      await transcribeVideo(bucketName, objectKey)
    } catch (error) {
      console.error(`Error processing video ${objectKey}:`, error)
      throw error
    }
  }
}

function isVideoFile(filename: string): boolean {
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  return VIDEO_EXTENSIONS.includes(extension)
}

async function transcribeVideo(bucketName: string, objectKey: string): Promise<void> {
  console.log(`Starting transcription for: ${objectKey}`)
  
  const tempFilePath = `/tmp/${basename(objectKey)}`
  const transcriptionKey = `transcriptions/${objectKey.replace(extname(objectKey), '.json')}`

  try {
    console.log(`Downloading video from S3: ${objectKey}`)
    const videoData = await s3.getObject({
      Bucket: bucketName,
      Key: objectKey,
    }).promise()

    if (!videoData.Body) {
      throw new Error('No video data received from S3')
    }

    writeFileSync(tempFilePath, videoData.Body as Buffer)
    console.log(`Video downloaded to: ${tempFilePath}`)

    console.log('Sending to OpenAI Whisper for transcription...')
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tempFilePath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment'],
    })

    console.log('Transcription completed successfully')

    const result = {
      originalFile: objectKey,
      bucket: bucketName,
      transcribedAt: new Date().toISOString(),
      duration: transcription.duration,
      language: transcription.language,
      text: transcription.text,
      words: transcription.words || [],
      segments: transcription.segments || [],
    }

    console.log(`Storing transcription result to S3: ${transcriptionKey}`)
    await s3.putObject({
      Bucket: bucketName,
      Key: transcriptionKey,
      Body: JSON.stringify(result, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'original-video': objectKey,
        'transcribed-at': new Date().toISOString(),
      },
    }).promise()

    console.log(`Transcription stored successfully: s3://${bucketName}/${transcriptionKey}`)

  } finally {
    try {
      unlinkSync(tempFilePath)
      console.log(`Cleaned up temp file: ${tempFilePath}`)
    } catch (cleanupError) {
      console.warn(`Failed to cleanup temp file: ${cleanupError}`)
    }
  }
}
