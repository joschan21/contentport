import { diff_wordMode } from '@/lib/diff-utils'
import { editToolStyleMessage, editToolSystemPrompt } from '@/lib/prompt-utils'
import { redis } from '@/lib/redis'
import { chunkDiffs, DiffWithReplacement, processDiffs } from '@/lib/utils'
import { TestUIMessage } from '@/types/message'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { FilePart, generateText, ImagePart, TextPart, tool, Tool } from 'ai'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { Style } from '../style-router'
import { buildEditorStateMessage } from './edit-tweet'
import { Account } from '../settings-router'

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

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

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
      const [style, account, unseenAttachments, websiteContent, draftStyle] =
        await Promise.all([
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

      const editorStateMessage: TestUIMessage = {
        role: 'user',
        id: `meta:editor-state:${nanoid()}`,
        content: await buildEditorStateMessage(chatId, tweet, true),
      }

      let firstDraftMessages: TestUIMessage[] = [
        ...(style
          ? [
              editToolStyleMessage({
                style,
                account,
                examples: draftStyle?.first_third || draftStyle?.overall || '',
              }),
            ]
          : []),
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
      let secondDraftMessages: TestUIMessage[] = [
        ...(style
          ? [
              editToolStyleMessage({
                style,
                account,
                examples: draftStyle?.second_third || draftStyle?.overall || '',
              }),
            ]
          : []),
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
      let thirdDraftMessages: TestUIMessage[] = [
        ...(style
          ? [
              editToolStyleMessage({
                style,
                account,
                examples: draftStyle?.third_third || draftStyle?.overall || '',
              }),
            ]
          : []),
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
        models: ['anthropic/claude-3.5-sonnet', 'google/gemini-2.5-pro'],
      })

      const [draft1, draft2, draft3] = await Promise.all([
        generateText({
          model: chatModel,
          temperature: 0.25,
          system: editToolSystemPrompt,
          // @ts-ignore
          messages: firstDraftMessages,
        }),
        generateText({
          model: chatModel,
          temperature: 0.25,
          system: editToolSystemPrompt,
          // @ts-ignore
          messages: secondDraftMessages,
        }),
        generateText({
          model: chatModel,
          temperature: 0.25,
          system: editToolSystemPrompt,
          // @ts-ignore
          messages: thirdDraftMessages,
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
