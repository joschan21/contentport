import { LinkNode } from "@lexical/link"
import { z } from "zod"
import { redis } from "../../lib/redis"
import { j, publicProcedure } from "../jstack"
import { CustomLinkNode } from "@/lib/nodes"

import { anthropic } from "@ai-sdk/anthropic"
import { openai } from "@ai-sdk/openai"
import {} from "@lexical/plain-text"
import { HeadingNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { TextNode } from "lexical"
import { QuoteNode } from "@lexical/rich-text"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table"
import { AutoLinkNode } from "@lexical/link"
import { createDataStreamResponse, generateText, streamText, tool } from "ai"
import {
  $getRoot,
  createEditor,
  LineBreakNode,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical"
import { xai } from "@ai-sdk/xai"
import { tweet } from "@/lib/validators"

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

const chat = z.object({
  id: z.string(),
  attachedDocumentIDs: z.array(z.string()),
  messages: z.array(message),
})

type Chat = z.infer<typeof chat>

export const chatRouter = j.router({
  generate: publicProcedure
    .input(
      z.object({
        chatId: z.string(),
        messages: z.array(message),
        attachedDocumentIDs: z.array(z.string()).optional(),
        tweets: z.array(tweet).optional(),
      })
    )
    .post(async ({ c, input }) => {
      const { chatId, messages, attachedDocumentIDs, tweets } = input

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

      const documentContents = []
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
        for (const docId of allAttachedDocumentIDs) {
          const doc = await redis.json.get<Document>(`context:doc:${docId}`)
          if (doc) {
            const parsedEditorState = editor.parseEditorState(doc.content)
            const editorStateTextString = parsedEditorState.read(() =>
              $getRoot().getTextContent()
            )

            documentContents.push({
              id: doc.id,
              title: doc.title,
              content: editorStateTextString,
            })
          }
        }
      }

      const xmlAttachedDocs = documentContents
        .map(
          (doc) => `<document id="${doc.id}" title="${doc.title}">
${doc.content}
</document>`
        )
        .join("\n\n")

      const xmlTweets = tweets
        ?.map(
          (tweet) => `<tweet id="${tweet.id}">
${tweet.content}
</tweet>`
        )
        .join("\n\n")

      const formattedPrompt = `<system>
You are a helpful AI assistant. You have access to the following tweets and tools:

<tools>
- edit_tweet: used if there's an existing (even empty) tweet that you're modifying
</tools>

<tweets>
  ${xmlTweets}
</tweets>

<messages>
  ${messages
    .map(
      (message) => `<message role="${message.role}">
${message.content}
</message>`
    )
    .join("\n\n")}
</messages>

<rules>
- Before calling any tools, explain briefly what you're about to do - then call tools. Do not repeat specific IDs, the tools you're using or the tweets you just created, just the concept behind what's happening.
- Speak from the "I"-perspective, e.g. "I will create...", "I created..."
- Provide accurate and helpful responses based on the information in the attached documents and tweets
- Every tweet edit has to happen through the edit_tweet tool.
- NEVER write or edit a tweet yourself, ALWAYS do so through the edit_tweet tool without writing or repeating any xml yourself.
- Be concise and direct in your responses.
</rules>
</system>`

      const edit_tweet = tool({
        description: "Edit or change a tweet",
        parameters: z.object({
          tweetId: z.string().describe("ID of the tweet to edit/modify."),
        }),
        execute: async ({ tweetId }) => {
          const tweetToEdit = tweets?.find((t) => t.id === tweetId)

          if (!tweetToEdit) throw new Error("tweet doesnt exist.")

          const prompt = `You are a tweet ghost writer. Write or modify this tweet according to the user's wishes. A user may reference documents they have attached to the message for additional context. If the user refers to a style they want (e.g. referencing their previous tweets or tone), match it EXACTLY.

<messages>
${messages
  .map(
    (message) => `<message role="${message.role}">${message.content}</message>`
  )
  .join("\n")}
</messages>

<tweet_to_edit id="${tweetToEdit.id}">
${tweetToEdit.content}
</tweet_to_edit>
            
${
  tweets && tweets.length > 1
    ? `<all_tweets_in_thread>
${xmlTweets}
</all_tweets_in_thread>`
    : ""
}

${
  xmlAttachedDocs
    ? `You have access to the following documents:

<documents>
${xmlAttachedDocs}
</documents>`
    : ""
}

<edited_tweet>`

          console.log("FINAL PROMPT!!", prompt)

          const result = await generateText({
            model: anthropic("claude-3-opus-latest"),
            prompt,
            stopSequences: ["</edited_tweet>"],
            system: `You are a tweet ghost writer. Write or modify this tweet according to the user's wishes. A user may reference documents they have attached to the message for additional context. If the user refers to a style they want (e.g. referencing their previous tweets or tone), match it EXACTLY - same tone, emojis and emoji frequency, etc.

<rules>
- Keep tweets short (under 240 characters) unless the user requests otherwise.
- NEVER use hashtags, links, and mentions unless the user specifically asks for them.
- Avoid complicated words or corporate/AI-sounding language (see prohibited words).
- Write in a natural, human tone, like a smart but casual person talking.
- Stick to a 6th-grade reading level: clean, clear, and catchy.
- Make your tweets concise and to the point.
- Match the user's preferred tone or examples exactly.
- Return only the improved tweet text without any explanation.
</rules>

<conciseness_examples>
<example>
Before: "It was through years of trial and error that they finally figured out what worked."
After: "Years of trial and error finally showed them what worked."
</example>
<example>
Before: "They approached the problem in a way that was both methodical and thoughtful."
After: "They approached the problem methodically and thoughtfully."
</example>
<example>
Before: "From the way they organize their team to the tools they choose, everything reflects their core values."
After: "Everything from team structure to tool choice reflects their values."
</example>
<example>
Before: "Exciting news! XYZ just launched!"
After: "XYZ just launched!"
</example>
</conciseness_examples>

<prohibited_words>
NEVER use the following types of language or words: 'meticulous', 'seamless', 'testament to', 'foster', 'beacon', 'journey', 'elevate', 'flawless', 'navigating', 'delve into', 'complexities', 'realm', 'bespoke', 'tailored', 'towards', 'underpins', 'to navigate xyz', 'the xzy landscape', 'comphrehensive', 'supercharge', 'ever-changing', 'ever-evolving', 'the world of', 'not only', 'seeking more than just', 'designed to enhance', 'it's not merely', 'our suite', 'it is advisable', 'daunting', 'in the heart of', 'when it comes to', 'in the realm of', 'amongst', 'unlock the secrets', 'unveil the secrets', 'transforms' and 'robust'.
</prohibited_words>

<best_practices>
- Try not to tag anyone in the first tweet, except the user wants it
- Try not to include a link in the first tweet, except the user wants it
</best_practices>`,
          })

          return {
            id: tweetToEdit.id,
            content: result.text,
          }
        },
      })

      const updatedChat: Chat = {
        id: chatId,
        attachedDocumentIDs: allAttachedDocumentIDs,
        messages: existingChat
          ? [...existingChat.messages, ...messages]
          : messages,
      }

      await redis.json.set(`chat:${chatId}`, "$", updatedChat)

      return createDataStreamResponse({
        execute: (stream) => {
          const result = streamText({
            model: openai("gpt-4o"),
            prompt: formattedPrompt,
            tools: { edit_tweet },
            toolCallStreaming: true,
            toolChoice: "auto",
            maxSteps: 10,
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
