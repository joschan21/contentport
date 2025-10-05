import { PayloadTweet } from '@/hooks/use-tweets-v2'
import { avoidPrompt, editToolSystemPrompt, styleGuide } from '@/lib/prompt-utils'
import { redis } from '@/lib/redis'
import { XmlPrompt } from '@/lib/xml-prompt'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import {
  convertToModelMessages,
  generateId,
  streamText,
  tool,
  UIMessageStreamWriter,
} from 'ai'
import { format } from 'date-fns'
import { HTTPException } from 'hono/http-exception'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Account } from '../../settings-router'
import { MyUIMessage } from '../chat-router'
import { WebsiteContent } from '../read-website-content'
import { parseAttachments } from '../utils'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

interface Context {
  writer: UIMessageStreamWriter
  ctx: {
    plan: 'free' | 'pro'
    tweets: PayloadTweet[]
    instructions: string
    userContent: string
    messages: MyUIMessage[]
    attachments: Awaited<ReturnType<typeof parseAttachments>>
    length: 'short' | 'long' | 'thread'
    userId: string
    redisKeys: {
      thread: string
      style: string
      account: string
      websiteContent: string
    }
  }
}

const singleTweetSchema = z.object({
  index: z
    .number()
    .describe(
      `The index of the tweet to edit. When creating a thread, using a non-existing index will create a new tweet at this index.`,
    ),
  instruction: z.string().describe(
    `Capture the user's instruction EXACTLY as they wrote it - preserve every detail including:
- Exact wording and phrasing
- Original capitalization
- Punctuation and special characters
- Typos or informal language
- Numbers and formatting

DO NOT paraphrase, summarize, or modify up the instruction in any way EXCEPT if the user asks for MULTIPLE tweets. If the user asks for multiple tweets, slightly alternate the instruction for each call to not get the same result.

<examples>
  <example>
  <user_message>tweet about ai being overhyped</user_message>
  <result>tweet about ai being overhyped</result>
  </example>

  <example>
  <user_message>write 2 tweets about why nextjs 15 is AMAZING!!!</user_message>
  <result note="user asked for two tweets, this tool call is responsible for one">tweet about why nextjs 15 is AMAZING!!!</result>
  </example>

  <example>
  <user_message>write something funny</user_message>
  <result>write something funny</result>
  </example>

  <example>
  <user_message>write a thread about car engines</user_message>
  <result>write a thread about car engines</result>
  </example>
</examples>

Remember: This tool creates/edits ONE tweet or thread per call. If the user wants 2 tweets, call this tool 2 times. For each of the parallel calls, frame the instruction as being for one tweet.`,
  ),
  tweetContent: z
    .string()
    .optional()
    .describe(
      "Optional: If a user wants changes to a specific tweet, write that tweet's content here. Copy it EXACTLY 1:1 without ANY changes whatsoever - same casing, formatting, etc. If user is not talking about a specific previously generated tweet, leave undefined.",
    ),
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
    description: 'my tool',
    inputSchema: singleTweetSchema,
    execute: async ({ instruction, tweetContent, imageDescriptions, index }) => {
      const generationId = nanoid()

      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: '',
          index,
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

      // system
      prompt.open('system')
      prompt.text(editToolSystemPrompt({ name: account.name, length: ctx.length }))
      prompt.close('system')

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

      if (ctx.tweets.length > 1) {
        prompt.open('thread_draft')
        ctx.tweets.forEach((tweet) => {
          prompt.tag('tweet_draft', tweet.content, { index: index })
        })
        prompt.close('thread_draft')
      } else {
        prompt.tag('tweet_draft', ctx.tweets[0]?.content ?? '')
      }

      // current job
      prompt.tag('current_user_request', instruction, {
        note: 'it is upon you to decide whether the user is referencing their previous history when iterating or if they are asking for changes in the current tweet drafts.',
      })

      if (tweetContent) {
        prompt.tag('user_is_referencing_tweet', tweetContent)
      }

      // style
      const style = await styleGuide({ accountId: account.id, topic: instruction })
      prompt.tag('style', style)

      if (ctx.length === 'short') {
        prompt.tag(
          'expected_length',
          'Regardless of previous tweets lengths: You are expected to respond with a VERY SHORT tweet now (NEVER exceed a single sentence).',
          {
            note: 'Adjust the tweet length exactly to this requirement.',
          },
        )
      } else if (ctx.length === 'long') {
        prompt.tag(
          'expected_length',
          'Regardless of previous tweets lengths: You are expected to respond with a short tweet now (around 160 characters).',
          {
            note: 'Adjust the tweet length exactly to this requirement.',
          },
        )
      } else if (ctx.length === 'thread') {
        prompt.tag(
          'expected_length',
          `Regardless of previous tweets lengths: You are expected to respond with a thread now (multiple tweets). VERY IMPORTANT: To do this, separate each thread tweet with three hyphens (no break lines) to indicate moving on to the next tweet in the thread.

<thread_example>
  <tweet index="0">first tweet</tweet>
  ---
  <tweet index="1">second tweet</tweet>
  ---
  <tweet index="2">third tweet</tweet>
</thread_example>`,
          {
            note: 'Adjust the tweet length exactly to this requirement.',
          },
        )
      }

      const memories = await redis.lrange(`memories:${account.id}`, 0, -1)

      prompt.open('memories', {
        note: 'These are the memories you have about this user. Its on you to decide which perspective/context from these memories might or might not be relevant to write a tweet.',
        perspective:
          'When responding, adopt the perspective of the user. Use first-person ("I", "my", "we") when discussing their projects, companies, or work. Use third-person when discussing external things they are not directly involved with.',
      })
      memories.forEach((memory) => prompt.tag('memory', memory))
      prompt.close('memories')

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

      console.log('⚠️⚠️⚠️ PROMPT', JSON.stringify(prompt.toString(), null, 2))

      const model = openrouter.chat('anthropic/claude-sonnet-4', {
        reasoning: { enabled: false, effort: 'low' },
        models: ['anthropic/claude-3.7-sonnet', 'openai/o4-mini'],
      })

      const result = streamText({
        model,
        system: `${editToolSystemPrompt({ name: account.name, length: ctx.length })}
        
${avoidPrompt()}

Remember: NEVER use prohibited words. Instead of banned words, use easy, 6-th grade level alternatives.`,
        messages: convertToModelMessages(messages),
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
            index,
            status: 'streaming',
          },
        })
      }

      writer.write({
        type: 'data-tool-output',
        id: generationId,
        data: {
          text: fullText,
          index,
          status: 'complete',
        },
      })

      return fullText
    },
  })
}
