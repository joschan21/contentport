import { CustomLinkNode } from "@/lib/nodes"
import { LinkNode } from "@lexical/link"
import { z } from "zod"
import { redis } from "../../lib/redis"
import { j, privateProcedure } from "../jstack"

import { chatLimiter } from "@/lib/chat-limiter"
import {
  assistantPrompt,
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
import {} from "@lexical/plain-text"
import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table"
import {
  appendClientMessage,
  appendResponseMessages,
  createDataStreamResponse,
  generateText,
  streamText,
  tool,
} from "ai"
import { format, isToday, isTomorrow } from "date-fns"
import "diff-match-patch-line-and-word"
import { HTTPException } from "hono/http-exception"
import {
  $getRoot,
  createEditor,
  LineBreakNode,
  SerializedEditorState,
  SerializedLexicalNode,
  TextNode,
} from "lexical"
import { nanoid } from "nanoid"
import { after } from "next/server"
import { chunkDiffs } from "../../../diff"
import { Style } from "./style-router"
import { diff_match_patch } from "diff-match-patch"
import { google } from "@ai-sdk/google"
import { ConnectedAccount } from "@/components/tweet-editor/tweet-editor"

export type EditTweetToolResult = {
  id: string
  improvedText: string
  diffs: DiffWithReplacement[]
}

export interface Document {
  id: string
  title: string
  content: SerializedEditorState<SerializedLexicalNode>
}

const message = z.object({
  id: z.string(),
  role: z.enum(["assistant", "user", "system", "data"]),
  content: z.string(),
})

export type Message = z.infer<typeof message>

const chat = z.object({
  id: z.string(),
  // attachedDocumentIDs: z.array(z.string()),
  messages: z.array(message),
})

type Chat = z.infer<typeof chat>

const document = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(), // serialized editor state
})

export const chatRouter = j.router({
  chat_messages: privateProcedure
    .input(z.object({ chatId: z.string() }))
    .get(async ({ c, input, ctx }) => {
      const { chatId } = input
      const { user } = ctx

      const chat = await redis.json.get<Chat>(`chat:${user.email}:${chatId}`)
      const filtered = chat?.messages.filter(
        (msg) => !msg.id.startsWith("doc:") && !msg.id.startsWith("meta:")
      )

      return c.json({ chat: { ...chat, messages: filtered } })
    }),
  generate: privateProcedure
    .input(
      z.object({
        chatId: z.string(),
        message: message,
        attachedDocuments: z.array(document).optional(),
        tweet: tweet,
      })
    )
    .post(async ({ c, input, ctx }) => {
      const { chatId, message, attachedDocuments, tweet } = input
      const { user } = ctx

      const { success, reset } = await chatLimiter.limit(user.email)

      if (!success && process.env.NODE_ENV !== "development") {
        const resetDate = new Date(reset)
        let resetStr = format(resetDate, "h:mm a")
        if (isToday(resetDate)) {
          resetStr = `today at ${resetStr}`
        } else if (isTomorrow(resetDate)) {
          resetStr = `tomorrow at ${resetStr}`
        } else {
          resetStr = `${format(resetDate, "MMM d")} at ${resetStr}`
        }
        throw new HTTPException(429, {
          message: `You've reached your daily message limit. Your limit resets ${resetStr}.`,
        })
      }

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

      const attachment = new PromptBuilder()

      const tool_chat = await redis.json.get<Chat>(
        `chat:${user.email}:tool:${chatId}`
      )

      let edit_tool_messages: Message[] = tool_chat?.messages ?? []

      const isFirstChatMessage =
        edit_tool_messages.length === 0 && !Boolean(tweet.content.trim())

      const account = await redis.json.get<ConnectedAccount>(
        `connected-account:${user.email}`
      )

      if (edit_tool_messages.length === 0) {
        const style = await redis.json.get<Style>(`style:${user.email}`)
        if (style) {
          const styleMessage = editToolStyleMessage({ style, account })
          edit_tool_messages = appendClientMessage({
            messages: edit_tool_messages,
            message: styleMessage,
          })
        }
      }

      const chat = await redis.json.get<Chat>(`chat:${user.email}:${chatId}`)

      let messages: Message[] = []

      // restore chat history
      if (chat?.messages) {
        messages = appendClientMessage({
          messages: chat.messages,
          message,
        })
      }

      // append the new message to the previous messages:
      messages = appendClientMessage({
        messages,
        message,
      })

      if (attachedDocuments && attachedDocuments.length > 0) {
        attachedDocuments.forEach(async (doc) => {
          const parsedEditorState = editor.parseEditorState(doc.content)
          const editorStateTextString = parsedEditorState.read(() =>
            $getRoot().getTextContent()
          )

          const documentMessage: Message = {
            id: `doc:${nanoid()}`,
            content: `<document_content title="${doc.title}">${editorStateTextString}</document_content>`,
            role: "user",
          }

          edit_tool_messages = appendClientMessage({
            messages: edit_tool_messages,
            message: documentMessage,
          })
        })
      }

      messages = appendClientMessage({
        messages,
        message: {
          id: `meta:current-tweet:${nanoid()}`,
          content: `<system_attachment>
<important_info>This is a system attachment to the user request. The purpose of this attachment is to keep you informed about the user's latest tweet editor state at all times. It might be empty or already contain text.
</important_info>

<current_tweet>${tweet.content}</current_tweet>

</system_attachment>`,
          role: "user",
        },
      })

      const edit_tweet = tool({
        description: "Edit or change a tweet",
        parameters: z.object({}),
        execute: async (): Promise<EditTweetToolResult> => {
          edit_tool_messages = appendClientMessage({
            messages: edit_tool_messages,
            message: message,
          })

          const lastSuggestion = await redis.get<string>(
            `last-suggestion:${chatId}`
          )

          if (lastSuggestion) {
            attachment.push(
              `<important_info>
This is a system attachment to the USER request. The purpose of this attachment is to keep you informed about the USER's latest tweet editor state at all times. It might be empty or already contain text. REMEMBER: All parts of your previous suggestion that are NOT inside of the current tweet have been explicitly REJECTED by the USER. NEVER suggest or reintroduce that text again unless the USER explicitly asks for it.
</important_info>`
            )
          } else {
            attachment.push(
              `<important_info>
This is a system attachment to the USER request. The purpose of this attachment is to keep you informed about the USER's latest tweet editor state at all times. It might be empty or already contain text.
</important_info>`
            )
          }

          attachment.push(`<current_tweet>${tweet.content}</current_tweet>`)

          if (lastSuggestion) {
            attachment.push(
              `<your_last_suggestion>${lastSuggestion}</your_last_suggestion>`
            )

            const t1 = tweet.content
            const t2 = lastSuggestion

            const dmp = new diff_match_patch()
            const diffs = dmp.diff_main(t2, t1)
            dmp.diff_cleanupSemantic(diffs)

            const rejectedElements2 = diffs.filter(([action]) => action === -1)
            console.log("👉👉👉 REJECTED ELEMENTS", rejectedElements2)

            const rejectedElements = diffs
              .filter(([action]) => action === -1)
              .map(([_, text]) => text.trim())
              .filter((text) => text.length > 0)

            console.log(
              "👉👉👉 REJECTED ELEMENTS AFTER PARSE",
              rejectedElements
            )

            if (rejectedElements.length > 0) {
              attachment.push(
                `<rejected_elements>
${rejectedElements.map((element) => `- "${element}"`).join("\n")}
</rejected_elements>

<important_note>
The user has explicitly rejected the elements listed above. DO NOT reintroduce these elements in your suggestions unless the user specifically requests them.
</important_note>`
              )
            }
          }

          if (isFirstChatMessage) {
            attachment.push(
              `<system_hint>The current tweet editor is empty, the user is asking you for a first draft. Keep it REALLY SHORT, NEVER exceed 160 CHARACTERS or 5 LINES OF TEXT</system_hint>`
            )
          }

          attachment.push(`<reminder>NEVER announce the tweet you're creating, e.g. NEVER say ("Here's the edited tweet" etc.), just create the tweet. Also, remember to NEVER use ANY of the PROHIBITED WORDS.</reminder>`)

          edit_tool_messages = appendClientMessage({
            messages: edit_tool_messages,
            message: {
              id: `meta:current-tweet:${nanoid()}`,
              content: `<system_attachment>
${attachment.toString()}
</system_attachment>`,
              role: "user",
            },
          })

          const result = await generateText({
            model: anthropic("claude-4-opus-20250514"),
            system: editToolSystemPrompt,
            messages: edit_tool_messages,
          })

          let sanitizedOutput = result.text.endsWith("\n")
            ? result.text.slice(0, -1)
            : result.text

          sanitizedOutput = sanitizedOutput
            .replaceAll("<current_tweet>", "")
            .replaceAll("</current_tweet>", "")
            .replaceAll("—", "-")

          const t1 = tweet.content
          const t2 = sanitizedOutput

          const rawDiffs = diff_wordMode(t1, t2)
          const chunkedDiffs = chunkDiffs(rawDiffs)

          const processedDiffs = processDiffs(chunkedDiffs)

          edit_tool_messages = appendClientMessage({
            messages: edit_tool_messages,
            message: {
              id: nanoid(),
              role: "assistant",
              content: sanitizedOutput,
            },
          })

          await redis.set(`last-suggestion:${chatId}`, sanitizedOutput)

          return {
            id: tweet.id,
            improvedText: sanitizedOutput,
            diffs: processedDiffs,
          }
        },
      })

      const saveMessages = async (chat: Chat) => {
        await redis.json.set(`chat:${user.email}:${chat.id}`, "$", chat)
      }

      const saveToolMessages = async (chat: Chat) => {
        await redis.json.set(`chat:${user.email}:tool:${chat.id}`, "$", chat)
      }

      after(async () => {
        await incrementChatCount(user.email)
      })

      return createDataStreamResponse({
        execute: (stream) => {
          const result = streamText({
            model: openai("gpt-4o"),
            system: assistantPrompt({ tweet }),
            messages: messages.filter((msg) => !msg.id.startsWith("style:")),
            tools: { edit_tweet },
            toolChoice: "auto",
            maxSteps: 6,
            onFinish: async ({ response }) => {
              await saveMessages({
                id: chatId,
                messages: appendResponseMessages({
                  messages,
                  responseMessages: response.messages,
                }),
              })

              await saveToolMessages({
                id: chatId,
                messages: edit_tool_messages,
              })
            },
          })

          result.mergeIntoDataStream(stream)
        },
      })
    }),
})

async function incrementChatCount(userEmail: string) {
  const today = format(new Date(), "yyyy-MM-dd")
  const hashKey = `chat:count:${userEmail}`
  await redis.hincrby(hashKey, today, 1)
}

class PromptBuilder {
  private parts: string[] = []

  push(content: string | undefined | null): this {
    if (content?.trim()) {
      this.parts.push(content.trim())
    }
    return this
  }

  toString(): string {
    return this.parts.join("\n\n").trim()
  }
}
