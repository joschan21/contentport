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
import { diff_wordMode, DiffWithReplacement, processDiffs } from "@/lib/utils"
import { tweet } from "@/lib/validators"
import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import { CodeHighlightNode, CodeNode } from "@lexical/code"
import { AutoLinkNode } from "@lexical/link"
import { ListItemNode, ListNode } from "@lexical/list"
import { } from "@lexical/plain-text"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table"
import { createDataStreamResponse, generateText, streamText, tool } from "ai"
import { diff_match_patch } from "diff-match-patch"
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
            const doc = await redis.json.get<Document>(`context:doc:${docId}`)
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

        // @ts-ignore
        documentContents.push(...docResults.filter(Boolean))
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

          const result = await generateText({
            model: anthropic("claude-3-opus-latest"),
            system: editToolSystemPrompt,
            prompt: editToolPrompt({
              tweets,
              tweetToEdit,
              documents: documentContents,
              messages,
            }),
            stopSequences: ["</edited_tweet>"],
          })

          const dmp = new diff_match_patch()

          const rawDiffs = diff_wordMode(tweetToEdit.content, result.text)
          dmp.diff_cleanupSemantic(rawDiffs)
          const processedDiffs = processDiffs(rawDiffs)

          return {
            id: tweetToEdit.id,
            improvedText: result.text,
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
