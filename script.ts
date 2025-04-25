import { redis } from "@/lib/redis"
import { Document } from "@/server/routers/chat-router"
import { $getRoot, createEditor, LineBreakNode } from "lexical"
import { LinkNode } from "@lexical/link"
import { HeadingNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { TextNode } from "lexical"
import { QuoteNode } from "@lexical/rich-text"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table"
import { AutoLinkNode } from "@lexical/link"

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
  if (attachedDocumentIDs && attachedDocumentIDs.length > 0) {
    for (const docId of attachedDocumentIDs) {
      const doc = await redis.json.get<Document>(`context:doc:${docId}`)
      console.log("raw", doc)
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

  console.log(documentContents)
}

run()
