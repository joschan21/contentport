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
import {
  appendClientMessage,
  appendResponseMessages,
  AssistantMessage,
  CoreAssistantMessage,
  CoreSystemMessage,
  CoreUserMessage,
  createDataStreamResponse,
  generateText,
  streamText,
  tool,
} from "ai"
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
import { chatLimiter } from "@/lib/chat-limiter"
import { HTTPException } from "hono/http-exception"
import { format, isToday, isTomorrow } from "date-fns"
import { nanoid } from "nanoid"

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

      if (!success) {
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

      const tool_chat = await redis.json.get<Chat>(
        `chat:${user.email}:tool:${chatId}`
      )

      let edit_tool_messages: Message[] = tool_chat?.messages ?? []

      if (edit_tool_messages.length === 0) {
        const style = await redis.json.get<Style>(`style:${user.email}`)
        if (style) {
          const styleMessage = editToolStyleMessage({ style })
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

          messages = appendClientMessage({
            messages,
            message: documentMessage,
          })
        })
      }

      messages = appendClientMessage({
        messages,
        message: {
          id: `meta:current-tweet:${nanoid()}`,
          content: `<system_message><important_info>This is a system message. The user did not write this message. The user is interfacing with you through contentport's visual tweet editor. The only purpose of this message is to keep you informed about the user's latest tweet editor state at all times.</important_info><current_tweet>${tweet.content}</current_tweet><system_message>`,
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

          edit_tool_messages = appendClientMessage({
            messages: edit_tool_messages,
            message: {
              id: `meta:current-tweet:${nanoid()}`,
              content: `<system_message><important_info>This is a system message. The user did not write this message. The user is interfacing with you through contentport's visual tweet editor. The only purpose of this message is to keep you informed about the user's latest tweet editor state at all times.</important_info><current_tweet>${tweet.content}</current_tweet><system_message>`,
              role: "user",
            },
          })

          const result = await generateText({
            model: anthropic("claude-3-opus-latest"),
            system: editToolSystemPrompt,
            messages: edit_tool_messages,
          })

          let sanitizedOutput = result.text.endsWith("\n")
            ? result.text.slice(0, -1)
            : result.text

          sanitizedOutput = sanitizedOutput
            .replaceAll("<edit>", "")
            .replaceAll("</edit>", "")
            .replaceAll("<tweet_suggestion>", "")
            .replaceAll("</tweet_suggestion>", "")
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

          return {
            id: tweet.id,
            improvedText: sanitizedOutput,
            diffs: processedDiffs,
          }
        },
      })

      const saveMessages = async (chat: Chat) => {
        await redis.json.set(`chat:${user.email}:${chat.id}`, "$", chat)
        await redis.expire(`chat:${user.email}:${chat.id}`, 60 * 10)
      }

      const saveToolMessages = async (chat: Chat) => {
        await redis.json.set(`chat:${user.email}:tool:${chat.id}`, "$", chat)
        await redis.expire(`chat:${user.email}:tool:${chat.id}`, 60 * 10)
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
