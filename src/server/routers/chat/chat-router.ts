import { assistantPrompt } from '@/lib/prompt-utils'
import { DiffWithReplacement } from '@/lib/utils'
import { tweet as tweetSchema } from '@/lib/validators'
import { TestUIMessage } from '@/types/message'
import { openai } from '@ai-sdk/openai'
import {
  appendResponseMessages,
  CoreMessage,
  createDataStreamResponse,
  smoothStream,
  streamText,
  UIMessage,
} from 'ai'
import { format } from 'date-fns'
import 'diff-match-patch-line-and-word'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { redis } from '../../../lib/redis'
import { j, privateProcedure } from '../../jstack'
import { create_edit_tweet } from './edit-tweet'
import { create_read_website_content } from './read-website-content'
import { parseAttachments, PromptBuilder } from './utils'
import { Ratelimit } from '@upstash/ratelimit'
import { HTTPException } from 'hono/http-exception'
import { create_three_drafts } from './create-three-drafts'

import { createOpenRouter } from '@openrouter/ai-sdk-provider'

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
  type: z.enum(['url', 'txt', 'docx', 'pdf', 'image', 'manual']),
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

// ==================== Constants ====================

const MESSAGE_ID_PREFIXES = {
  document: 'doc:',
  meta: 'meta:',
  style: 'style:',
  system: 'system-prompt',
}

function filterVisibleMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter(
    (msg) =>
      !msg.id.startsWith(MESSAGE_ID_PREFIXES.document) &&
      !msg.id.startsWith(MESSAGE_ID_PREFIXES.meta) &&
      !msg.id.startsWith(MESSAGE_ID_PREFIXES.system),
  )
}

async function incrementChatCount(userEmail: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd')
  const key = `chat:count:batch-2:${userEmail}`
  await redis.hincrby(key, today, 1)
}

const chatLimiter = new Ratelimit({ redis, limiter: Ratelimit.fixedWindow(20, '1 d') })

// ==================== Route Handlers ====================

export const chatRouter = j.router({
  get_chat_messages: privateProcedure
    .input(z.object({ chatId: z.string().nullable() }))
    .get(async ({ c, input, ctx }) => {
      const { chatId } = input
      const { user } = ctx

      if (!chatId) {
        return c.superjson({ messages: [] })
      }

      const chat = await redis.json.get<{ messages: UIMessage[] }>(
        `chat:${user.email}:${chatId}`,
      )

      const visibleMessages = chat ? filterVisibleMessages(chat.messages) : []

      return c.superjson({ messages: visibleMessages })
    }),

  conversation: privateProcedure.post(({ c }) => {
    return c.json({ id: crypto.randomUUID() })
  }),

  generate: privateProcedure
    .input(
      z.object({
        message: chatMessageSchema,
        tweet: tweetSchema,
      }),
    )
    .post(async ({ input, ctx }) => {
      const { user, account } = ctx

      const chatId = input.message.chatId
      const attachments = input.message.metadata?.attachments
      const { tweet } = input

      if (!account) {
        throw new HTTPException(412, { message: 'No connected account' })
      }

      if (process.env.NODE_ENV === 'production') {
        const { success } = await chatLimiter.limit(user.email)

        if (!success) {
          throw new HTTPException(429, {
            message: 'Too Many Requests - Daily chat limit reached.',
          })
        }
      }

      const existingChat = await redis.json.get<{ messages: TestUIMessage[] }>(
        `chat:${user.email}:${chatId}`,
      )

      const { files, images, links } = await parseAttachments({ attachments })

      /**
       * conversation message construction
       */
      const isConversationEmpty = !Boolean(existingChat)

      const systemMessage: TestUIMessage = {
        id: 'system-prompt',
        content: assistantPrompt({ tweet }),
        role: 'system',
      }

      const editorState = new PromptBuilder()
        .add(
          `<important_info>This is a system attachment to the user request. The purpose of this attachment is to keep you informed about the user's latest tweet editor state at all times. It might be empty or already contain text.</important_info>`,
        )
        .add(`<current_tweet>${tweet.content}</current_tweet>`)

      if (isConversationEmpty) {
        editorState.add(
          `This is the first message in your conversation. Therefore, only for the first message, create THREE drafts by calling the edit_tweet tool THREE times. The user can choose the draft they like most.`,
        )
      }

      const editorStateMessage: TestUIMessage = {
        role: 'user',
        id: `meta:editor-state:${nanoid()}`,
        content: `<system_attachment>${editorState.build()}</system_attachment>`,
      }

      const content = new PromptBuilder()

      content.add(input.message.content)

      if (Boolean(links.length)) {
        content.add('Please read the following links:')

        links.forEach(({ link }) => {
          content.add(`<link>${link}</link>`)
        })
      }

      const userMessage: TestUIMessage = {
        id: nanoid(),
        role: input.message.role,
        metadata: input.message.metadata,
        content: [
          {
            type: 'text',
            text: content.build(),
          },
          ...files,
          ...images,
        ],
      }

      let messages: TestUIMessage[] = [
        ...(isConversationEmpty ? [systemMessage] : []),
        ...(existingChat?.messages ?? []),
        editorStateMessage,
        userMessage,
      ]

      /**
       * tool message construction
       */
      const edit_tweet = create_edit_tweet({
        chatId: chatId,
        userMessage,
        tweet,
        isDraftMode: isConversationEmpty,
        redisKeys: {
          chat: `chat:tool:${user.email}:${chatId}`,
          account: `active-account:${user.email}`,
          style: `style:${user.email}:${account.id}`,
        },
      })

      /**
       * draft tool construction
       */
      const three_drafts = create_three_drafts({
        userEmail: user.email,
        redisKeys: {
          chat: `chat:tool:${user.email}:${chatId}`,
          account: `active-account:${user.email}`,
          style: `style:${user.email}:${account.id}`,
        },
        chatId,
        userMessage,
        tweet,
      })

      const read_website_content = create_read_website_content({ chatId: chatId })

      const chatModel = openrouter.chat('openai/gpt-4o', {
        reasoning: { effort: 'low' },
        models: ['anthropic/claude-3.5-sonnet', 'google/gemini-2.5-pro'],
      })

      return createDataStreamResponse({
        execute: (stream) => {
          const result = streamText({
            model: chatModel,
            system: assistantPrompt({ tweet }),
            tools: { read_website_content, edit_tweet, three_drafts },
            toolChoice: 'auto',
            maxSteps: 6,
            experimental_transform: smoothStream({ delayInMs: 20 }),
            messages: messages as CoreMessage[],
            onError: ({ error }) => {
              console.error(error)

              throw new HTTPException(500, {
                message: 'Something went wrong, please try again.',
              })
            },
            onStepFinish: ({ toolResults }) => {
              toolResults.forEach((result) => {
                if (result.toolName === 'edit_tweet') {
                  if ('result' in result && result.result) {
                    stream.writeData({ hook: 'onTweetResult', data: result.result })
                  }
                }

                if (result.toolName === 'three_drafts') {
                  if ('result' in result && result.result) {
                    stream.writeData({ hook: 'onThreeDrafts', data: result.result })
                  }
                }
              })
            },
            onFinish: async ({ response }) => {
              await redis.json.set(`chat:${user.email}:${chatId}`, '$', {
                messages: appendResponseMessages({
                  messages: messages as UIMessage[],
                  responseMessages: response.messages,
                }),
              })

              const hasCalledEditTweet = response.messages.some(
                (msg) =>
                  Array.isArray(msg.content) &&
                  msg.content.some(
                    (obj) => obj.type === 'tool-call' && obj.toolName === 'edit_tweet',
                  ),
              )

              if (!hasCalledEditTweet) {
                const pipeline = redis.pipeline()

                const attachments = [...files, images]

                if (Boolean(attachments.length)) {
                  attachments.forEach((attachment) => {
                    pipeline.lpush(`unseen-attachments:${chatId}`, attachment)
                  })
                }

                await pipeline.exec()
              }

              await incrementChatCount(user.email)
            },
          })

          result.mergeIntoDataStream(stream)
        },
      })
    }),
})
