import { redis } from "@/lib/redis"
import { Document } from "@/server/routers/chat-router"
import { $getRoot, createEditor, LineBreakNode } from "lexical"
import { LinkNode } from "@lexical/link"
import "dotenv/config"
import { HeadingNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { TextNode } from "lexical"
import { QuoteNode } from "@lexical/rich-text"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table"
import { AutoLinkNode } from "@lexical/link"
import { generateText } from "ai"
import { google } from "@ai-sdk/google"

const attachedDocumentIDs = ["46dbda75-c741-4817-9a1c-c65382f3ce0b"]

type Doc = {
  id: string
  title: string
  content: string
}

const documentContents: Doc[] = []
const editor = createEditor({
  nodes: [
    LineBreakNode,

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

const run = async () => {
  const tweet = `just built something new 🎉

◆ a powerful way to write tweets faster
◆ an AI assistant that helps you sound like yourself
◆ a tool to create great content without the stress

coming soon to @contentport 👀`

  const message = "rate my tweet from 1-10"

  const editTargetIdentifierPrompt = ({
    tweet,
    userMessage,
  }: {
    tweet: string
    userMessage: string
  }) => `
You are a precise and context-aware assistant working inside ContentPort - a focused studio for creating high-quality posts for Twitter. Your job is to analyze a user instruction and identify which specific section of a tweet should be edited. The tweet will be edited by a second model, but ONLY the part you return will be visible to that model.

<task>
Your job is to decide which part of the tweet should be edited / forwarded to the next model based on the user's instruction.

- If the instruction suggests a full rewrite or general improvement (e.g. "improve for clarity", "make this better", "rate my tweet" (assumes next model has access to full tweet)), return the full tweet.
- If the instruction points to a specific section (e.g. "change the last line", "fix the first sentence"), return only that part.
</task>

<rules>
- Output the **exact** part of the tweet that should be changed/forwarded.
- If the instruction implies general improvement or rewriting, return the **full tweet**.
- If the instruction clearly targets a specific part, return **only that part**.
- DO NOT return anything other than tweet content. No comments, no tags, no reasoning.
</rules>

<tweet>
${tweet}
</tweet>

<user_instruction>
${userMessage}
</user_instruction>

<part_to_edit>`

  const result = await generateText({
    model: google("gemini-2.5-flash-preview-04-17"),
    prompt: editTargetIdentifierPrompt({ tweet, userMessage: message }),
  })

  console.log("res", result.text)
}

run()
