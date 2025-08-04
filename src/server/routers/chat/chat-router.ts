import { assistantPrompt } from '@/lib/prompt-utils'
import { DiffWithReplacement } from '@/lib/utils'
import { XmlPrompt } from '@/lib/xml-prompt'
import {
  convertToModelMessages,
  CoreMessage,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  UIMessage,
} from 'ai'
import { format } from 'date-fns'
import 'diff-match-patch-line-and-word'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import { redis } from '../../../lib/redis'
import { j, privateProcedure } from '../../jstack'
import { create_read_website_content } from './read-website-content'
import { parseAttachments } from './utils'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { getAccount } from '../utils/get-account'
import { createTweetTool } from './tools/create-tweet-tool'
import { Ratelimit } from '@upstash/ratelimit'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// ==================== Types ====================

export interface EditTweetToolResult {
  id: string
  improvedText: string
  diffs: DiffWithReplacement[]
}

// Custom message type that ensures all messages have an ID
export type ChatMessage = Omit<UIMessage, 'content'> & {
  content: string | UIMessage['parts']
  role: CoreMessage['role']
  id: string
  metadata?: MessageMetadata
  chatId?: string
}

export interface Chat {
  id: string
  messages: ChatMessage[]
}

export interface WebScrapingResult {
  url: string
  content?: string
  screenshot?: string
  error?: string
}

// ==================== Schemas ====================

const attachmentSchema = z.object({
  id: z.string(),
  title: z.string().optional().nullable(),
  fileKey: z.string().optional(), // only for chat attachments
  type: z.enum(['url', 'txt', 'docx', 'pdf', 'image', 'manual', 'video']),
  variant: z.enum(['knowledge', 'chat']),
})

export type TAttachment = z.infer<typeof attachmentSchema>

const messageMetadataSchema = z.object({
  attachments: z.array(attachmentSchema).optional(),
})

export type Attachment = z.infer<typeof attachmentSchema>
export type MessageMetadata = z.infer<typeof messageMetadataSchema>

const chatMessageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: messageMetadataSchema.optional(),
})

export type Metadata = {
  userMessage: string
  attachments: Array<TAttachment>
  editorContent: string
}

export type MyUIMessage = UIMessage<
  Metadata,
  {
    'main-response': {
      text: string
      status: 'streaming' | 'complete'
    }
    'tool-output': {
      text: string
      status: 'processing' | 'streaming' | 'complete'
    }
    writeTweet: {
      status: 'processing'
    }
  },
  {
    readWebsiteContent: {
      input: { website_url: string }
      output: {
        url: string
        title: string
        content: string
      }
    }
  }
>
// ==================== Route Handlers ====================

export const chatRouter = j.router({
  get_message_history: privateProcedure
    .input(z.object({ chatId: z.string().nullable() }))
    .get(async ({ c, input, ctx }) => {
      const { chatId } = input
      const { user } = ctx

      if (!chatId) {
        return c.superjson({ messages: [] })
      }

      const messages = await redis.get<MyUIMessage[]>(`chat:history:${chatId}`)

      if (!messages) {
        return c.superjson({ messages: [] })
      }

      // const chat = await redis.json.get<{ messages: UIMessage[] }>(
      //   `chat:${user.email}:${chatId}`,
      // )

      // const visibleMessages = chat ? filterVisibleMessages(chat.messages) : []

      return c.superjson({ messages })
    }),

  conversation: privateProcedure.post(({ c }) => {
    return c.json({ id: crypto.randomUUID() })
  }),

  chat: privateProcedure
    .input(
      z.object({
        message: z.any(),
        id: z.string(),
      }),
    )
    .post(async ({ c, ctx, input }) => {
      const { user } = ctx
      const { id, message } = input as { message: MyUIMessage; id: string }

      const limiter =
        user.plan === 'pro'
          ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(80, '4h') })
          : new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(5, '1d') })

      const [account, history, parsedAttachments, limitResult] = await Promise.all([
        getAccount({ email: user.email }),
        redis.get<MyUIMessage[]>(`chat:history:${id}`),
        parseAttachments({
          attachments: message.metadata?.attachments,
        }),
        limiter.limit(user.email),
      ])

      if (process.env.NODE_ENV === 'production') {
        const { success } = limitResult

        if (!success) {
          if (user.plan === 'pro') {
            throw new HTTPException(429, {
              message: "You've been rate-limited, please try again soon.",
            })
          } else {
            throw new HTTPException(429, {
              message: 'Free plan limit reached, please upgrade to continue.',
            })
          }
        }
      }

      if (!account) {
        throw new HTTPException(412, { message: 'No connected account' })
      }

      const { links, attachments } = parsedAttachments

      const content = new XmlPrompt()
      const userContent = message.parts.reduce(
        (acc, curr) => (curr.type === 'text' ? acc + curr.text : ''),
        '',
      )

      content.open('message', { date: format(new Date(), 'EEEE, yyyy-MM-dd') })

      content.tag('user_message', userContent)

      if (Boolean(links.length)) {
        content.open('attached_links', { note: 'please read these links.' })
        links.filter(Boolean).forEach((l) => content.tag('link', l.link))
        content.close('attached_links')
      }

      if (message.metadata?.editorContent) {
        content.tag('tweet_draft', message.metadata.editorContent)
      }

      content.close('message')

      const userMessage: MyUIMessage = {
        ...message,
        parts: [{ type: 'text', text: content.toString() }, ...attachments],
      }

      const messages = [...(history ?? []), userMessage] as MyUIMessage[]

      const stream = createUIMessageStream<MyUIMessage>({
        originalMessages: messages,
        generateId: createIdGenerator({
          prefix: 'msg',
          size: 16,
        }),
        onFinish: async ({ messages }) => {
          await redis.set(`chat:history:${id}`, messages)
        },
        onError(error) {
          console.log('❌❌❌ ERROR:', JSON.stringify(error, null, 2))

          throw new HTTPException(500, {
            message: error instanceof Error ? error.message : 'Something went wrong.',
          })
        },
        execute: async ({ writer }) => {
          // tools
          const writeTweet = createTweetTool({
            writer,
            ctx: {
              plan: user.plan as 'free' | 'pro',
              editorContent: message.metadata?.editorContent ?? '',
              instructions: userContent,
              messages,
              userContent,
              attachments: { attachments, links },
              redisKeys: {
                style: `style:${user.email}:${account.id}`,
                account: `active-account:${user.email}`,
                websiteContent: `website-contents:${id}`,
              },
            },
          })

          const readWebsiteContent = create_read_website_content({ chatId: id })

          const modelName =
            user.plan === 'pro' ? 'openai/gpt-4.1' : 'openrouter/horizon-beta'

          const result = streamText({
            model: openrouter.chat(modelName, {
              models: ['openai/gpt-4o'],
              reasoning: { enabled: false, effort: 'low' },
            }),
            system: assistantPrompt({ editorContent: message.metadata?.editorContent }),
            messages: convertToModelMessages(messages),
            tools: { writeTweet, readWebsiteContent },
            stopWhen: stepCountIs(3),
          })

          writer.merge(result.toUIMessageStream())
        },
      })

      return createUIMessageStreamResponse({ stream })
    }),
})
