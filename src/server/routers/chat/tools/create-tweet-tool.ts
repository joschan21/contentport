import { avoidPrompt, editToolSystemPrompt, styleGuide } from '@/lib/prompt-utils'
import { redis } from '@/lib/redis'
import { XmlPrompt } from '@/lib/xml-prompt'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { convertToModelMessages, generateId, streamText, tool } from 'ai'
import { format } from 'date-fns'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Account } from '../../settings-router'
import { MyUIMessage } from '../chat-router'
import { WebsiteContent } from '../read-website-content'
import { Context } from './shared'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const singleTweetSchema = z.object({
  imageDescriptions: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      'Optional: If a user attached image(s), explain their content in high detail to be used as context while writing the tweet.',
    ),
})

export const createTweetTool = ({ writer, ctx }: Context) => {
  return tool({
    description:
      'Used to create tweets. Can create a single tweet, a thread (tweets separated by ---), multiple separate tweets (separated by ===), or multiple threads.',
    inputSchema: singleTweetSchema,
    execute: async ({ imageDescriptions }) => {
      const generationId = nanoid()

      writer.write({
        type: 'data-tool-reasoning',
        id: generationId,
        data: {
          text: '',
          status: 'processing',
        },
      })

      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: '',
          status: 'processing',
        },
      })

      const [account, websiteContent] = await Promise.all([
        redis.json.get<Account>(ctx.redisKeys.account),
        redis.lrange<WebsiteContent>(ctx.redisKeys.websiteContent, 0, -1),
      ])

      if (!account) {
        throw new Error('Account not found')
      }

      const prompt = new XmlPrompt()

      prompt.open('prompt', { date: format(new Date(), 'EEEE, yyyy-MM-dd') })

      prompt.open('output_format', {
        note: 'Follow these formatting rules for your output based on what the user is requesting',
        default: "Default to writing 3 versions of the tweet."
      })
      prompt.text(
        `- For THREADS: Separate each tweet in the thread with three hyphens (---) on their own line. The same three hyphen (---) formatting works for writing a reply to the main tweet, because essentially it's the same as writing a thread.
- For MULTIPLE SEPARATE TWEETS: Separate each distinct tweet with three equals signs (===) on their own line.
- For a SINGLE TWEET: Just output the tweet text directly with no delimiters

Examples:
* Single tweet: "Just the tweet text"
* Thread: "First tweet---Second tweet---Third tweet"
* Multiple tweets: "Tweet 1===Tweet 2===Tweet 3"`,
      )
      prompt.close('output_format')

      prompt.open('language_rules', {
        note: 'be EXTREMELY strict with these rules. NEVER use ANY of the forbidden words. If you are tempted to use one: you are probably overcomplicating your language. We need a simple, easy to understand 4-th grade level tweet.',
      })
      prompt.text(avoidPrompt())
      prompt.close('language_rules')

      // history
      prompt.open('history')

      ctx.messages.forEach((msg) => {
        prompt.open('response_pair')
        msg.parts.forEach((part) => {
          if (part.type === 'text' && msg.role === 'user') {
            prompt.open('user_message')
            prompt.tag('user_request', part.text)

            if (Boolean(websiteContent.length)) {
              websiteContent.forEach(({ url, title, content }) => {
                if (content && title) {
                  prompt.tag('attached_website_content', content, {
                    url,
                    title,
                    note: 'This URL is for your view only. Do NOT include it in the tweet unless SPECIFICALLY ASKED TO by the user.',
                  })
                }
              })
            }

            prompt.close('user_message')
          }

          if (part.type === 'data-tool-output') {
            prompt.tag('response_tweet', part.data.text)
          }
        })
        prompt.close('response_pair')
      })

      prompt.close('history')

      const formattedTweetContent = ctx.tweets.map((t) => t.content).join('\n---\n')

      if (formattedTweetContent) {
        prompt.tag('current_editor_content', formattedTweetContent, {
          note: 'This is the current state of the editor. If the user is asking for changes, modifications, or edits, this is what they want you to work with.',
        })
      }

      // current job
      prompt.tag('user_request', ctx.rawUserMessage, {
        note: 'it is upon you to decide whether the user is referencing their previous history when iterating or if they are asking for changes in the current tweet drafts.',
      })

      // style
      const style = await styleGuide({
        accountId: account.id,
        topic: ctx.rawUserMessage,
      })

      prompt.tag('style', style)

      const memories = await redis.lrange(`memories:${account.id}`, 0, -1)

      if (memories.length) {
        prompt.open('memories', {
          note: 'These are the memories you have about this user. Its on you to decide which perspective/context from these memories might or might not be relevant to write a tweet.',
          perspective:
            'When responding, adopt the perspective of the user. Use first-person ("I", "my", "we") when discussing their projects, companies, or work. Use third-person when discussing external things they are not directly involved with.',
        })
        memories.forEach((memory) => prompt.tag('memory', memory))
        prompt.close('memories')
      }

      prompt.close('prompt')

      const messages: MyUIMessage[] = [
        {
          id: generateId(),
          role: 'user',
          parts: [
            { type: 'text', text: prompt.toString() },
            ...ctx.attachments.attachments.filter((a) => a.type === 'text'),
            ...(imageDescriptions ?? []).map((text) => ({
              type: 'text' as const,
              text: `<user_attached_image_description note="The user attached an image to this message. For conveniece, you'll see a textual description of the image. It may or may not be directly relevant to your created tweet.">${text}</user_attached_image_description>`,
            })),
          ],
        },
      ]

        const model = openrouter.chat('anthropic/claude-sonnet-4.5', {
        reasoning: { enabled: true, effort: 'low' },
        models: ['anthropic/claude-sonnet-4', 'anthropic/claude-3.7-sonnet'],
      })

      let reasoning = ''
      let isReasoningComplete = false

      const result = streamText({
        model,
        system: `${editToolSystemPrompt({ name: account.name })}
        
        ${avoidPrompt()}
        
        Remember: NEVER use prohibited words. Instead of banned words, use easy, 6-th grade level alternatives.`,
        messages: convertToModelMessages(messages),
        onChunk: ({ chunk }) => {
          if (chunk.type === 'reasoning-delta' && !isReasoningComplete) {
            reasoning += chunk.text

            writer.write({
              type: 'data-tool-reasoning',
              id: generationId,
              data: { text: reasoning, status: 'reasoning' },
            })
          }
        },
        onStepFinish: (step) => {
          const reasoningContent = step.content.find((c) => c.type === 'reasoning')

          if (reasoningContent && reasoningContent.type === 'reasoning') {
            isReasoningComplete = true

            writer.write({
              type: 'data-tool-reasoning',
              id: generationId,
              data: { text: reasoning, status: 'complete' },
            })
          }
        },
        onError(error) {
          console.log('❌❌❌ ERROR:', JSON.stringify(error, null, 2))

          throw new HTTPException(500, {
            message: error instanceof Error ? error.message : 'Something went wrong.',
          })
        },
        async onFinish(message) {
          await redis.lpush(ctx.redisKeys.thread, message.text)
        },
      })

      let fullText = ''

      for await (const textPart of result.textStream) {
        fullText += textPart
        writer.write({
          type: 'data-tool-output',
          id: generationId,
          data: {
            text: fullText,
            status: 'streaming',
          },
        })
      }

      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: fullText,
          status: 'complete',
        },
      })

      return fullText
    },
  })
}
