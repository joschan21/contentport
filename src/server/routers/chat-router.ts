import { CustomLinkNode } from "@/lib/nodes"
import { LinkNode } from "@lexical/link"
import { z } from "zod"
import { redis } from "../../lib/redis"
import { j, privateProcedure } from "../jstack"

import {
  assistantPrompt,
  editToolPrompt,
  editToolStyleMessage,
  editToolSystemPrompt,
} from "@/lib/prompt-utils"
import {
  diff_lineMode,
  diff_wordMode,
  DiffWithReplacement,
  processDiffs,
} from "@/lib/utils"
import { tweet } from "@/lib/validators"
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { CodeHighlightNode, CodeNode } from "@lexical/code"
import { AutoLinkNode } from "@lexical/link"
import { ListItemNode, ListNode } from "@lexical/list"
import {} from "@lexical/plain-text"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table"
import { createDataStreamResponse, generateText, streamText, tool } from "ai"
import { Diff, diff_match_patch } from "diff-match-patch"
import "diff-match-patch-line-and-word"
import {
  $getRoot,
  createEditor,
  LineBreakNode,
  SerializedEditorState,
  SerializedLexicalNode,
  TextNode,
} from "lexical"
import { after } from "next/server"
import { Style } from "./style-router"
import { google } from "@ai-sdk/google"
import { chunkDiffs } from "../../../diff"

export type EditTweetToolResult = {
  id: string
  improvedText: string
  diffs: DiffWithReplacement[]
}

export interface Document {
  id: string
  title: string
  content: SerializedEditorState<SerializedLexicalNode>
  updatedAt: Date
}

const message = z.object({
  role: z.enum(["assistant", "user", "system"]),
  content: z.string(),
})

export type Message = z.infer<typeof message>

const chat = z.object({
  id: z.string(),
  attachedDocumentIDs: z.array(z.string()),
  messages: z.array(message),
})

type Chat = z.infer<typeof chat>

const editTargetIdentifierPrompt = ({
  tweet,
  messages,
}: {
  tweet: string
  messages: Message[]
}) => `
You are a precise and context-aware assistant working inside ContentPort — a focused studio for creating high-quality posts for Twitter. Your job is to analyze a user instruction and identify which specific section of a tweet should be edited. The tweet will be edited by a second model, but ONLY the part(s) you wrap in <edit> tags will be visible to that model.

<task>
Your job is to decide which part of the tweet should be edited / forwarded to the next model based on the user's instruction.

- If the instruction suggests a full rewrite or general improvement — even implicitly (e.g. "improve this", "what do you think", "can you make it better", "clarify this", "make it hit harder") — wrap the full tweet in a single <edit> tag.
- If the instruction clearly targets a specific part (e.g. "change the last line", "fix the first sentence", "reword the third part"), wrap only that section in <edit> tags.
- If multiple parts are explicitly mentioned, wrap each in its own <edit> tag.
- If the instruction is vague or unsure but suggests a desire for feedback or polishing, default to wrapping the whole tweet.
</task>

<rules>
- Always return the full tweet, with only the part(s) to be edited wrapped in <edit> tags.
- ALWAYS return the EXACT SAME tweet without ANY additional formatting, punctuation, ANYTHING changed but the edit tag.
- Your ONLY job is to place the <edit>...</edit> tag(s), NEVER make ANY changes beyond that.
- If it's a general feedback request, assume full context is needed and wrap the whole tweet in <edit>...</edit>.
- If the instruction targets specific areas, isolate those in <edit>.
- NEVER return ANY kind of explanations for your changes - just 1:1 the tweet with edit tag(s).
</rules>

<examples>

<example>
<tweet>I finally launched my side project. It's a small tool that helps writers stay focused.</tweet>
<user_instruction>can you improve this?</user_instruction>
<output><edit>I finally launched my side project. It's a small tool that helps writers stay focused.</edit></output>
</example>

<example>
<tweet>I finally launched my side project. It's a small tool that helps writers stay focused.</tweet>
<user_instruction>can you rework the second sentence?</user_instruction>
<output>I finally launched my side project. <edit>It's a small tool that helps writers stay focused.</edit></output>
</example>

<example>
<tweet>don't optimize too early.\n\nbuild the dumb version first, then make it better.</tweet>
<user_instruction>make it sharper and punchier</user_instruction>
<output><edit>don't optimize too early.\n\nbuild the dumb version first, then make it better</edit></output>
</example>

<example>
<tweet>One post. Every day. For a year. That's how you get good.</tweet>
<user_instruction>change the last part</user_instruction>
<output>One post. Every day. For a year. <edit>That's how you get good.</edit></output>
</example>

<example>
<tweet>Launch fast. Ship messy. Learn fast. Improve relentlessly.</tweet>
<user_instruction>improve the second and fourth parts</user_instruction>
<output>Launch fast. <edit>Ship messy.</edit> Learn fast. <edit>Improve relentlessly.</edit></output>
</example>

<example>
<tweet>AI won't replace you. But someone using AI will.</tweet>
<user_instruction>ehh this feels cliché</user_instruction>
<output><edit>AI won't replace you. But someone using AI will.</edit></output>
</example>

<example>
<tweet>Turned my side project into a business.\n\nTook 6 months with zero funding.\n\nJust focus.</tweet>
<user_instruction>make the first part more inspiring</user_instruction>
<output><edit>Turned my side project into a business.</edit>\n\nTook 6 months with zero funding.\n\nJust focus.</output>
</example>

</examples>

<tweet>
${tweet}
</tweet>

<message_history>
${messages}
</message_history>

<user_instruction>
${messages[messages.length - 1]?.content}
</user_instruction>

<output>`

export const chatRouter = j.router({
  generate: privateProcedure
    .input(
      z.object({
        chatId: z.string(),
        messages: z.array(message),
        attachedDocumentIDs: z.array(z.string()).optional(),
        tweets: z.array(tweet).optional().default([]),
      })
    )
    .post(async ({ c, input, ctx }) => {
      const { chatId, messages, attachedDocumentIDs, tweets } = input
      const { user } = ctx

      const chatExists = await redis.exists(`chat:${chatId}`)
      let existingChat: Chat | null = null

      if (chatExists) {
        existingChat = await redis.json.get<Chat>(`chat:${chatId}`)
      }

      const allAttachedDocumentIDs = existingChat
        ? [
            ...new Set([
              ...existingChat.attachedDocumentIDs,
              ...(attachedDocumentIDs || []),
            ]),
          ]
        : attachedDocumentIDs || []

      const documentContents: Document[] = []
      const editor = createEditor({
        nodes: [
          LineBreakNode,
          CustomLinkNode,
          {
            replace: LinkNode,
            with: (node: LinkNode) => {
              return new CustomLinkNode(node.getTextContent())
            },
            withKlass: CustomLinkNode,
          },
          HeadingNode,
          ListNode,
          ListItemNode,
          TextNode,
          QuoteNode,
          CodeNode,
          CodeHighlightNode,
          TableNode,
          TableRowNode,
          TableCellNode,
          AutoLinkNode,
        ],
      })

      // Fetch all attached documents
      if (allAttachedDocumentIDs.length > 0) {
        const docResults = await Promise.all(
          allAttachedDocumentIDs.map(async (docId) => {
            const doc = await redis.json.get<Document>(
              `context-doc:${user.email}:${docId}`
            )
            if (doc) {
              const parsedEditorState = editor.parseEditorState(doc.content)
              const editorStateTextString = parsedEditorState.read(() =>
                $getRoot().getTextContent()
              )

              return {
                id: doc.id,
                title: doc.title,
                content: editorStateTextString,
                updatedAt: doc.updatedAt,
              }
            }
            return null
          })
        )

        documentContents.push(...(docResults.filter(Boolean) as any))
      }

      const edit_tweet = tool({
        description: "Edit or change a tweet",
        parameters: z.object({
          tweetId: z.string().describe("ID of the tweet to edit/modify."),
        }),
        execute: async ({ tweetId }): Promise<EditTweetToolResult> => {
          const tweetToEdit = tweets?.find((t) => t.id === tweetId)

          if (!tweetToEdit) throw new Error("tweet doesnt exist.")

          const style = await redis.json.get<Style>(`style:${user.email}`)

          if (style) {
            messages.unshift(editToolStyleMessage({ style }))
          }

          // Pre-process the user's message to identify which part of the tweet to edit
          const lastMessage = messages[messages.length - 1]
          if (!lastMessage) throw new Error("No message found")

          const targetIdentifierResult = await generateText({
            model: openai("gpt-4o"),
            stopSequences: ["</output>"],
            prompt: editTargetIdentifierPrompt({
              tweet: tweetToEdit.content,
              messages,
            }),
          })

          const targetXML = targetIdentifierResult.text.trim()

          console.log("🎯🎯🎯 TARGET XML", targetXML)

          const prompt = editToolPrompt({
            tweets,
            tweetToEdit,
            documents: documentContents,
            messages,
            targetXML,
          })

          console.log("final promopt", prompt)

          const result = await generateText({
            model: anthropic("claude-3-opus-latest"),
            system: editToolSystemPrompt,
            prompt,
            stopSequences: ["</edited_tweet>"],
          })

          let sanitizedOutput = result.text.endsWith("\n")
            ? result.text.slice(0, -1)
            : result.text

          sanitizedOutput = sanitizedOutput
            .replaceAll("<edit>", "")
            .replaceAll("</edit>", "")
            .replaceAll("—", "-")

          const dmp = new diff_match_patch()

          const t1 = tweetToEdit.content
          const t2 = sanitizedOutput

          const rawDiffs = diff_wordMode(t1, t2)
          const chunkedDiffs = chunkDiffs(rawDiffs)

          const processedDiffs = processDiffs(chunkedDiffs)

          console.log("raw", rawDiffs)
          console.log("processed", processedDiffs)

          return {
            id: tweetToEdit.id,
            improvedText: sanitizedOutput,
            diffs: processedDiffs,
          }
        },
      })

      after(async () => {
        const updatedChat: Chat = {
          id: chatId,
          attachedDocumentIDs: allAttachedDocumentIDs,
          messages: existingChat
            ? [...existingChat.messages, ...messages]
            : messages,
        }

        await redis.json.set(`chat:${chatId}`, "$", updatedChat)
      })

      return createDataStreamResponse({
        execute: (stream) => {
          const result = streamText({
            model: openai("gpt-4o"),
            prompt: assistantPrompt({ messages, tweets }),
            tools: { edit_tweet },
            toolCallStreaming: true,
            toolChoice: "auto",
            maxSteps: 6,
          })

          result.mergeIntoDataStream(stream)
        },
      })
    }),
})

// const create_tweet = tool({
//   description: "Create a new tweet to create a thread",
//   parameters: z.object({}),
//   execute: async () => {
//     const id = crypto.randomUUID()
//     const newTweet: Tweet = { id, content: "" }

//     const result = await edit_tweet.execute(
//       { tweetToEdit: newTweet },
//       { messages, toolCallId: id }
//     )

//     return result
//   },
// })
