import { UIMessageStreamWriter } from "ai"
import { type PayloadTweet } from '@/hooks/use-tweets-v2'
import { MyUIMessage } from "../chat-router"
import { parseAttachments } from "../utils"

export interface Context {
  writer: UIMessageStreamWriter
  ctx: {
    plan: 'free' | 'pro'
    tweets: PayloadTweet[]
    rawUserMessage: string
    messages: MyUIMessage[]
    attachments: Awaited<ReturnType<typeof parseAttachments>>
    userId: string
    redisKeys: {
      thread: string
      style: string
      account: string
      websiteContent: string
    }
  }
}
