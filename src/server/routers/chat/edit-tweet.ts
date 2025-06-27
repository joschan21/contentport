import { diff_wordMode } from '@/lib/diff-utils'
import { editToolStyleMessage, editToolSystemPrompt } from '@/lib/prompt-utils'
import { redis } from '@/lib/redis'
import { chunkDiffs, DiffWithReplacement, processDiffs } from '@/lib/utils'
import { Tweet } from '@/lib/validators'
import { TestUIMessage } from '@/types/message'
import { anthropic } from '@ai-sdk/anthropic'
import { CoreMessage, FilePart, generateText, ImagePart, TextPart, tool } from 'ai'
import { diff_match_patch } from 'diff-match-patch'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Style } from '../style-router'
import { PromptBuilder } from './utils'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { Account } from '../settings-router'

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

interface CreateEditTweetArgs {
  chatId: string
  tweet: Tweet
  redisKeys: {
    style: string
    account: string
    chat: string
  }
  userMessage: TestUIMessage
  isDraftMode?: boolean
  temperature?: number
}

export const create_edit_tweet = ({
  chatId,
  tweet,
  redisKeys,
  userMessage,
  isDraftMode = false,
  temperature,
}: CreateEditTweetArgs) =>
  tool({
    description: 'Create, edit or change a tweet',
    parameters: z.object({}),
    execute: async () => {
      const [chat, style, account, unseenAttachments, websiteContent] = await Promise.all(
        [
          redis.json.get<{ messages: TestUIMessage[] }>(redisKeys.chat),
          redis.json.get<Style>(redisKeys.style),
          redis.json.get<Account>(redisKeys.account),
          redis.lrange<(FilePart | TextPart | ImagePart)[]>(
            `unseen-attachments:${chatId}`,
            0,
            -1,
          ),
          redis.lrange<{ url: string; title: string; content: string }>(
            `website-contents:${chatId}`,
            0,
            -1,
          ),
        ],
      )

      if (Boolean(unseenAttachments.length)) {
        await redis.del(`unseen-attachments:${chatId}`)
      }

      if (websiteContent && websiteContent.length > 0) {
        await redis.del(`website-contents:${chatId}`)
      }

      const isConversationEmpty = !Boolean(chat)

      const editorStateMessage: TestUIMessage = {
        role: 'user',
        id: `meta:editor-state:${nanoid()}`,
        content: await buildEditorStateMessage(chatId, tweet, isConversationEmpty),
      }

      const websiteContentMessage: TextPart[] = websiteContent.map((content) => {
        return {
          type: 'text',
          text: `<attached_website_content url="${content.url}">${content.content}</attached_website_content>`,
        }
      })

      let messages: TestUIMessage[] = [
        ...(isConversationEmpty && style
          ? [editToolStyleMessage({ style, account })]
          : []),
        ...(chat?.messages ?? []),
        editorStateMessage,
        {
          ...userMessage,
          content: [
            ...userMessage.content,
            ...unseenAttachments.flat(),
            ...websiteContentMessage,
          ],
        },
      ]

      const chatModel = openrouter.chat('google/gemini-2.5-pro', {
        reasoning: { effort: 'low' },
        models: [
          'google/gemini-2.5-pro',
          'anthropic/claude-3.5-sonnet',
          'openai/o4-mini',
        ],
      })

      const result = await generateText({
        model: chatModel,
        // model: xai("grok-3-latest"),
        // model: anthropic('claude-4-opus-20250514'),
        system: editToolSystemPrompt,
        messages: messages as CoreMessage[],
      })

      const improvedText = sanitizeTweetOutput(result.text)
      const diffs = diff(tweet.content, improvedText)

      await Promise.all([
        redis.set(`last-suggestion:${chatId}`, improvedText),
        redis.json.set(redisKeys.chat, '$', {
          messages: append(messages, {
            role: 'assistant',
            content: improvedText,
            id: nanoid(),
          }),
        }),
      ])

      return {
        // TODO: might be bug
        id: nanoid(),
        improvedText,
        diffs,
      }
    },
  })

function append(messages: TestUIMessage[], message: TestUIMessage) {
  messages.push(message)
  return messages
}

function diff(currentContent: string, newContent: string): DiffWithReplacement[] {
  const rawDiffs = diff_wordMode(currentContent, newContent)
  const chunkedDiffs = chunkDiffs(rawDiffs)
  return processDiffs(chunkedDiffs)
}

function sanitizeTweetOutput(text: string): string {
  let sanitized = text.endsWith('\n') ? text.slice(0, -1) : text

  return sanitized
    .replaceAll('<current_tweet>', '')
    .replaceAll('</current_tweet>', '')
    .replaceAll('—', '-')
    .trim()
}

export async function buildEditorStateMessage(
  chatId: string,
  tweet: { content: string },
  isConversationEmpty: boolean,
): Promise<string> {
  const msg = new PromptBuilder()
  const lastSuggestion = await redis.get<string>(`last-suggestion:${chatId}`)

  // Add base context
  if (lastSuggestion) {
    msg.add(
      `<important_info>
  This is a system attachment to the USER request. The purpose of this attachment is to keep you informed about the USER's latest tweet editor state at all times. It might be empty or already contain text. REMEMBER: All parts of your previous suggestion that are NOT inside of the current tweet have been explicitly REJECTED by the USER. NEVER suggest or reintroduce that text again unless the USER explicitly asks for it.
  </important_info>`,
    )
  } else {
    msg.add(
      `<important_info>
  This is a system attachment to the USER request. The purpose of this attachment is to keep you informed about the USER's latest tweet editor state at all times. It might be empty or already contain text.
  </important_info>`,
    )
  }

  msg.add(`<current_tweet>${tweet.content}</current_tweet>`)

  // Add rejection analysis if applicable
  if (lastSuggestion) {
    msg.add(`<your_last_suggestion>${lastSuggestion}</your_last_suggestion>`)

    const { rejectedElements } = await analyzeRejectedText(tweet.content, lastSuggestion)

    if (rejectedElements.length > 0) {
      msg.add(
        `<rejected_elements>\n${rejectedElements.map((el) => `- "${el}"`).join('\n')}\n</rejected_elements>\n\n<important_note>\nThe user has explicitly rejected the elements listed above. DO NOT reintroduce these elements in your suggestions unless the user specifically requests them.\n</important_note>`,
      )
    }
  }

  // Add hints
  if (isConversationEmpty) {
    msg.add(
      `<system_hint>The current tweet editor is empty, the user is asking you for a first draft. Keep it SHORT, NEVER exceed 240 CHARACTERS or 6 LINES OF TEXT</system_hint>`,
    )
  }

  msg.add(
    `<reminder>NEVER announce the tweet you're creating, e.g. NEVER say ("Here's the edited tweet" etc.), just create the tweet. Also, remember to NEVER use ANY of the PROHIBITED WORDS.</reminder>`,
  )

  return msg.build()
}

async function analyzeRejectedText(currentTweet: string, lastSuggestion: string) {
  const diffEngine = new diff_match_patch()
  const diffs = diffEngine.diff_main(lastSuggestion, currentTweet)
  diffEngine.diff_cleanupSemantic(diffs)

  const rejectedDiffs = diffs.filter(([action]) => action === -1)

  let rejectedElements: string[] = []

  try {
    rejectedElements = rejectedDiffs
      .map(([_, text]) => text.trim())
      .filter((text) => text.length > 0)
  } catch (error) {
    console.error('Error processing rejected elements:', error)
  }

  return { rejectedElements, debugInfo: rejectedDiffs }
}
