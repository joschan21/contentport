import { tool, Tool } from 'ai'
import { z } from 'zod'
import { redis } from '@/lib/redis'
import { TestUIMessage } from '@/types/message'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText, CoreMessage, FilePart, TextPart, ImagePart } from 'ai'
import { ConnectedAccount } from '@/components/tweet-editor/tweet-editor'
import { nanoid } from 'nanoid'
import { diff_wordMode } from '@/lib/diff-utils'
import { DiffWithReplacement, processDiffs } from '@/lib/utils'
import { chunkDiffs } from '../../../../diff'
import { assistantPrompt, editToolSystemPrompt } from '@/lib/prompt-utils'

interface StyleAnalysis {
  overall: string
  first_third: string
  second_third: string
  third_third: string
  [key: string]: string
}

interface CreateThreeDraftsProps {
  redisKeys: {
    chat: string
    style: string
    account: string
  }
  chatId: string
  userMessage: TestUIMessage
  tweet: any
  userEmail: string
}

export const create_three_drafts = ({
  redisKeys,
  chatId,
  userMessage,
  tweet,
  userEmail,
}: CreateThreeDraftsProps) =>
  tool({
    description: 'create 3 initial tweet drafts',
    parameters: z.object({}),
    execute: async () => {
      const [account, unseenAttachments, websiteContent, draftStyle] = await Promise.all([
        redis.json.get<ConnectedAccount>(redisKeys.account),
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
        redis.json.get<StyleAnalysis>(`draft-style:${userEmail}`),
      ])

      if (Boolean(unseenAttachments.length)) {
        await redis.del(`unseen-attachments:${chatId}`)
      }

      if (websiteContent && websiteContent.length > 0) {
        await redis.del(`website-contents:${chatId}`)
      }

      const websiteContentMessage: TextPart[] = websiteContent.map((content) => ({
        type: 'text',
        text: `<attached_website_content url="${content.url}">${content.content}</attached_website_content>`,
      }))

      const createDraftMessages = (styleAnalysis: string): CoreMessage[] => [
        {
          role: 'system',
          content: `${editToolSystemPrompt}
---
Here's the writing style to match. It frequenly uses example quotes from analyzed tweets. Use these quotes as inspiration for style, avoid directly copying them 1:1.

WRITING STYLE TO MATCH:
${styleAnalysis}
---

${account ? `User's Twitter Profile: @${account.username} (${account.name})` : ''}`,
        },
        {
          role: 'user',
          content: [
            ...(Array.isArray(userMessage.content)
              ? userMessage.content
              : [{ type: 'text' as const, text: userMessage.content }]),
            ...unseenAttachments.flat(),
            ...websiteContentMessage,
          ],
        },
      ]

      const [draft1, draft2, draft3] = await Promise.all([
        generateText({
          model: anthropic('claude-4-opus-20250514'),
          messages: createDraftMessages(
            draftStyle?.first_third || draftStyle?.overall || '',
          ),
        }),
        generateText({
          model: anthropic('claude-4-opus-20250514'),
          messages: createDraftMessages(
            draftStyle?.second_third || draftStyle?.overall || '',
          ),
        }),
        generateText({
          model: anthropic('claude-4-opus-20250514'),
          messages: createDraftMessages(
            draftStyle?.third_third || draftStyle?.overall || '',
          ),
        }),
      ])

      const sanitizeTweetOutput = (text: string): string => {
        let sanitized = text.endsWith('\n') ? text.slice(0, -1) : text
        return sanitized
          .replaceAll('<current_tweet>', '')
          .replaceAll('</current_tweet>', '')
          .replaceAll('—', '-')
          .trim()
      }

      const diff = (
        currentContent: string,
        newContent: string,
      ): DiffWithReplacement[] => {
        const rawDiffs = diff_wordMode(currentContent, newContent)
        const chunkedDiffs = chunkDiffs(rawDiffs)
        return processDiffs(chunkedDiffs)
      }

      const drafts = [
        {
          id: nanoid(),
          improvedText: sanitizeTweetOutput(draft1.text),
          diffs: diff(tweet.content || '', sanitizeTweetOutput(draft1.text)),
        },
        {
          id: nanoid(),
          improvedText: sanitizeTweetOutput(draft2.text),
          diffs: diff(tweet.content || '', sanitizeTweetOutput(draft2.text)),
        },
        {
          id: nanoid(),
          improvedText: sanitizeTweetOutput(draft3.text),
          diffs: diff(tweet.content || '', sanitizeTweetOutput(draft3.text)),
        },
      ]

      return drafts
    },
  })

type TReturn = ReturnType<typeof create_three_drafts>
export type ThreeDrafts = TReturn extends Tool<infer I, infer O> ? O : never
