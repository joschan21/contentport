"use client"

import { HeadingNode, QuoteNode } from "@lexical/rich-text"
import { ListItemNode, ListNode } from "@lexical/list"
import { CodeNode, CodeHighlightNode } from "@lexical/code"
import { CustomLinkNode } from "@/lib/nodes"
import { LinkNode } from "@lexical/link"
import { ContextDocumentEditor } from "@/components/context-document-editor"
import { LexicalComposer } from "@lexical/react/LexicalComposer"
import { useParams } from "react-router"
import { ArrowLeft } from "lucide-react"
import { NavLink } from "react-router"
import DuolingoButton from "@/components/ui/duolingo-button"

export const ContextPage = () => {
  const { id } = useParams()

  const initialConfig = {
    namespace: "context-document-editor",
    theme: {
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
      },
      heading: {
        h1: "text-3xl font-bold text-gray-900 mb-4",
        h2: "text-2xl font-bold text-gray-900 mb-3",
        h3: "text-xl font-bold text-gray-900 mb-2",
      },
      quote: "border-l-4 border-indigo-300 pl-4 italic text-gray-700 my-4",
      list: {
        ul: "list-disc list-inside space-y-1",
        ol: "list-decimal list-inside space-y-1",
      },
      code: "bg-gray-100 rounded px-2 py-1 font-mono text-sm",
      codeblock: "bg-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto",
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
          return new CustomLinkNode(node.getTextContent())
        },
        withKlass: CustomLinkNode,
      },
    ],
  }

  return (
    <div className="relative z-10 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8 w-fit">
          <NavLink to="/studio/knowledge">
            <DuolingoButton variant="secondary" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              Back to Knowledge Base
            </DuolingoButton>
          </NavLink>
        </div>

        <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl p-8">
          <LexicalComposer initialConfig={initialConfig}>
            <ContextDocumentEditor key={id!} documentId={id!} />
          </LexicalComposer>
        </div>
      </div>
    </div>
  )
}
