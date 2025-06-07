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
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: messageMetadataSchema.optional(),
})

// ==================== Constants ====================

const REDIS_KEYS = {
  chat: (email: string, chatId: string) => `chat:${email}:${chatId}`,
  toolChat: (email: string, chatId: string) => `chat:${email}:tool:${chatId}`,
  lastSuggestion: (chatId: string) => `last-suggestion:${chatId}`,
  style: (email: string) => `style:${email}`,
  connectedAccount: (email: string) => `connected-account:${email}`,
  chatCount: (email: string) => `chat:count:${email}`,
}

const MESSAGE_ID_PREFIXES = {
  document: 'doc:',
  meta: 'meta:',
  style: 'style:',
  system: 'system-prompt',
}

const MAX_TWEET_LENGTH = 240
const MAX_TWEET_LINES = 5

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
  const key = REDIS_KEYS.chatCount(userEmail)
  await redis.hincrby(key, today, 1)
}

// ==================== Route Handlers ====================

export const chatRouter = j.router({
  get_chat_messages: privateProcedure
    .input(z.object({ chatId: z.string() }))
    .get(async ({ c, input, ctx }) => {
      const { chatId } = input
      const { user } = ctx

      const chat = await redis.json.get<{ messages: UIMessage[] }>(
        `chat:${user.email}:${chatId}`,
      )

      const visibleMessages = chat ? filterVisibleMessages(chat.messages) : []

      return c.superjson({ messages: visibleMessages })
    }),

  generate: privateProcedure
    .input(
      z.object({
        chatId: z.string(),
        message: chatMessageSchema,
        tweet: tweetSchema,
      }),
    )
    .post(async ({ input, ctx }) => {
      const { user } = ctx
      const { tweet } = input
      const attachments = input.message.metadata?.attachments

      const existingChat = await redis.json.get<{ messages: TestUIMessage[] }>(
        `chat:${user.email}:${input.chatId}`,
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

      const editorStateMessage: TestUIMessage = {
        role: 'user',
        id: `meta:editor-state:${nanoid()}`,
        content: `<system_attachment>
<important_info>This is a system attachment to the user request. The purpose of this attachment is to keep you informed about the user's latest tweet editor state at all times. It might be empty or already contain text.</important_info>

<current_tweet>${tweet.content}</current_tweet>

</system_attachment>`,
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
        chatId: input.chatId,
        userMessage,
        tweet,
        redisKeys: {
          chat: `chat:tool:${user.email}:${input.chatId}`,
          account: `connected-account:${user.email}`,
          style: `style:${user.email}`,
        },
      })

      const read_website_content = create_read_website_content({ chatId: input.chatId })

      return createDataStreamResponse({
        execute: (stream) => {
          const result = streamText({
            system: assistantPrompt({ tweet }),
            tools: { read_website_content, edit_tweet },
            toolChoice: 'auto',
            maxSteps: 6,
            experimental_transform: smoothStream({ delayInMs: 20 }),
            model: openai('gpt-4o'),
            messages: messages as CoreMessage[],
            onError: (err) => {
              console.log(err)
            },
            onFinish: async ({ response }) => {
              await redis.json.set(`chat:${user.email}:${input.chatId}`, '$', {
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
                    pipeline.lpush(`unseen-attachments:${input.chatId}`, attachment)
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

  //   generate: privateProcedure
  //     .input(
  //       z.object({
  //         chatId: z.string(),
  //         message: chatMessageSchema,
  //         tweet: tweetSchema,
  //       }),
  //     )
  //     .post(async ({ c, input, ctx }) => {
  //       const { chatId, message: inputMessage, tweet } = input
  //       const { user } = ctx

  //       // Initialize message storage
  //       const message = ensureMessageHasId(inputMessage as CoreMessage)
  //       let conversationMessages: ChatMessage[] = []
  //       let toolMessages: ChatMessage[] = []
  //       let messageWithImages = message

  //       console.log('🔥🔥🔥 ARRIVING MESSAGE', message)

  //       const [existingChat, existingToolChat] = await Promise.all([
  //         redis.json.get<Chat>(REDIS_KEYS.chat(user.email, chatId)),
  //         redis.json.get<Chat>(REDIS_KEYS.toolChat(user.email, chatId)),
  //       ])

  //       toolMessages = existingToolChat?.messages ?? []
  //       const isFirstMessage = toolMessages.length === 0 && !tweet.content.trim()

  //       if (toolMessages.length === 0) {
  //         const [style, account] = await Promise.all([
  //           redis.json.get<Style>(REDIS_KEYS.style(user.email)),
  //           redis.json.get<ConnectedAccount>(REDIS_KEYS.connectedAccount(user.email)),
  //         ])

  //         if (style) {
  //           const styleMessage = editToolStyleMessage({ style, account })
  //           toolMessages = appendMessage(toolMessages, ensureMessageHasId(styleMessage))
  //         }
  //       }

  //       // Initialize conversation messages
  //       if (existingChat?.messages) {
  //         conversationMessages = appendMessage(existingChat.messages, message)
  //       } else {
  //         conversationMessages = [
  //           createSystemMessage(assistantPrompt({ tweet }), MESSAGE_ID_PREFIXES.system),
  //           message,
  //         ]
  //       }

  //       // Process knowledge documents if present
  //       //       if (message.metadata?.knowledgeDocs?.length) {
  //       //         const { textAttachments, imageAttachments } =
  //       //           await processKnowledgeDocuments(
  //       //             message.metadata.knowledgeDocs,
  //       //             user.id
  //       //           )

  //       //         // Update message with images if any
  //       //         if (imageAttachments.length > 0) {
  //       //           messageWithImages = createMessageWithImages(message, imageAttachments)

  //       //           conversationMessages[conversationMessages.length - 1] =
  //       //             messageWithImages
  //       //         }

  //       //         // Add knowledge attachments to tool messages
  //       //         if (textAttachments.build()) {
  //       //           toolMessages = appendMessage(
  //       //             toolMessages,
  //       //             createUserMessage(
  //       //               `<attachments>\n${textAttachments.build()}\n</attachments>`,
  //       //               `doc:knowledge:${nanoid()}`
  //       //             )
  //       //           )
  //       //         }

  //       //         // Add metadata message to conversation
  //       //         const knowledgeMetaContent = new PromptBuilder()
  //       //           .add(
  //       //             `<system_attachment>
  //       // <important_info>The user has attached knowledge documents to this request. This message is just for your information. You can assume the content of all following knowledge documents as present and already available to the edit_tweet tool. You do NOT need to fetch any of this content yourself because it is already available to the edit_tweet tool. The user attached the following knowledge documents:</important_info>
  //       // <attached_knowledge_docs>
  //       // ${message.metadata.knowledgeDocs.map((doc) => `- ${doc.title}`).join("\n")}
  //       // </attached_knowledge_docs>`
  //       //           )
  //       //           .add(
  //       //             imageAttachments.length > 0
  //       //               ? `<note>Some of the attached documents are images that have already been provided to the edit_tweet tool.</note>`
  //       //               : null
  //       //           )
  //       //           .add(`</system_attachment>`)
  //       //           .build()

  //       //         conversationMessages = appendMessage(
  //       //           conversationMessages,
  //       //           createUserMessage(
  //       //             knowledgeMetaContent,
  //       //             `meta:knowledge-docs:${nanoid()}`
  //       //           )
  //       //         )
  //       //       }

  //       // Add current tweet state to conversation
  //       conversationMessages = appendMessage(
  //         conversationMessages,
  //         createUserMessage(
  //           `<system_attachment>
  // <important_info>This is a system attachment to the user request. The purpose of this attachment is to keep you informed about the user's latest tweet editor state at all times. It might be empty or already contain text.</important_info>

  // <current_tweet>${tweet.content}</current_tweet>

  // </system_attachment>`,
  //           `meta:current-tweet:${nanoid()}`,
  //         ),
  //       )

  //       // Create tools
  //       const scrapedLinks = new PromptBuilder()
  //       const webScrapingTool = await createWebScrapingTool(scrapedLinks)

  //       const editTweetContext: EditTweetContext = {
  //         chatId,
  //         tweet,
  //         toolMessages,
  //         userMessage: messageWithImages,
  //         scrapedLinks,
  //         isFirstMessage,
  //       }
  //       const editTweetTool = createEditTweetTool(editTweetContext)

  //       // Persistence functions
  //       const saveConversation = async () => {
  //         await redis.json.set(REDIS_KEYS.chat(user.email, chatId), '$', {
  //           id: chatId,
  //           messages: conversationMessages,
  //         })
  //       }

  //       const saveToolConversation = async () => {
  //         await redis.json.set(REDIS_KEYS.toolChat(user.email, chatId), '$', {
  //           id: chatId,
  //           messages: editTweetContext.toolMessages,
  //         })
  //       }

  //       // Track usage
  //       after(async () => {
  //         await incrementChatCount(user.email)
  //       })

  //       // Create streaming response
  //       return createDataStreamResponse({
  //         execute: (stream) => {
  //           const result = streamText({
  //             model: openai('gpt-4o'),
  //             system: assistantPrompt({ tweet }),
  //             // messages: conversationMessages
  //             //   .filter(
  //             //     (msg) =>
  //             //       !msg.id.startsWith(MESSAGE_ID_PREFIXES.style) &&
  //             //       !msg.id.startsWith(MESSAGE_ID_PREFIXES.system)
  //             //   )
  //             //   .map(
  //             //     (msg) =>
  //             //       ({
  //             //         role: (msg as any).role,
  //             //         content: (msg as any).content,
  //             //       }) as CoreMessage
  //             //   ),
  //             tools: {
  //               edit_tweet: editTweetTool,
  //               read_urls: webScrapingTool,
  //             },
  //             toolChoice: 'auto',
  //             maxSteps: 6,
  //             onError: (error) => {
  //               console.error('Chat error:', error)
  //             },
  //             onFinish: async ({ response }) => {
  //               console.log('🍓🍓🍓 raw res messages', response.messages)

  //               // @ts-expect-error custom types
  //               conversationMessages = appendResponseMessages({
  //                 // @ts-expect-error custom types
  //                 messages: conversationMessages.map(ensureMessageHasId),
  //                 responseMessages: response.messages,
  //               })

  //               await Promise.all([saveConversation(), saveToolConversation()])
  //             },
  //           })

  //           result.mergeIntoDataStream(stream)
  //         },
  //       })
  //     }),
})
