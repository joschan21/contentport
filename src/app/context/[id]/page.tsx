"use client"

import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { CustomLinkNode } from "@/lib/nodes"
import { LinkNode } from "@lexical/link"
import { ContextDocumentEditor } from "@/components/context-document-editor"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useParams } from "next/navigation"

export default function ContextPage() {
  const params = useParams()
  const id = params.id as string

  const initialConfig = {
    namespace: "context-document-editor",
    theme: {
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
      },
    },
    onError: (error: Error) => {
      console.error("[Context Document Editor Error]", error)
    },
    editable: true,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListItemNode,
      ListNode,
      CodeNode,
      CodeHighlightNode,
      CustomLinkNode,
      {
        replace: LinkNode,
        with: (node: LinkNode) => {
          return new CustomLinkNode(node.getTextContent());
        },
        withKlass: CustomLinkNode,
      },
    ],
  }

  return (
    <div className="relative bg-white mt-4 border border-stone-200 shadow-sm rounded-md p-5 z-10 max-w-3xl w-full h-full mx-auto">
      <LexicalComposer initialConfig={initialConfig}>
        <ContextDocumentEditor documentId={id} />
      </LexicalComposer>
    </div>
  )
}
