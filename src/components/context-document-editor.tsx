"use client"

import { TRANSFORMERS } from "@lexical/markdown"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import {
  $getRoot,
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical"
import debounce from "lodash.debounce"
import { ChangeEvent, useCallback, useEffect, useMemo, useRef } from "react"

import { useDocumentContext } from "@/hooks/document-ctx"
import { useLocalStorage } from "@/hooks/use-local-storage"
import PlaceholderPlugin from "@/lib/placeholder-plugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { InitialContentPlugin } from "@/lib/initial-content-plugin"

interface ContextDocumentEditorProps {
  documentId: string
  initialContent?: string
}

interface Document {
  id: string
  title: string
  content: SerializedEditorState<SerializedLexicalNode> | null
  updatedAt: Date
}

export function ContextDocumentEditor({
  documentId,
  initialContent = "",
}: ContextDocumentEditorProps) {
  const { setDocs } = useDocumentContext()
  const storageKey = `doc-${documentId}`
  const [storedDoc, setStoredDoc] = useLocalStorage<{
    title: string
    content: string
  }>(storageKey, { title: "", content: "" })

  // do not use `setStoredDoc` here to prevent re-render (-> lose editor focus)
  const saveToLocalStorage = useCallback(
    debounce(({ content }: { content: string }) => {
      const prev = localStorage.getItem(storageKey)
      const parsed = JSON.parse(
        prev ?? JSON.stringify({ title: storedDoc.title, content })
      ) as { title: string; content: string }
      localStorage.setItem(storageKey, JSON.stringify({ ...parsed, content }))
    }, 300),
    [storageKey]
  )

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDocs((prev) => {
      return prev.map((doc) => {
        if (doc.id === documentId) {
          return { ...doc, title: e.target.value }
        }
        return doc
      })
    })
    setStoredDoc((prev) => ({ ...prev, title: e.target.value }))
  }

  const onChange = useCallback(
    (editorState: EditorState) => {
      const content = JSON.stringify(editorState.toJSON())
      saveToLocalStorage({ content })
    },
    [saveToLocalStorage]
  )

  return (
    <div className="w-full h-full p-4 space-y-4">
      <div className="flex gap-4 justify-between items-center">
        <input
          autoFocus
          type="text"
          placeholder="Untitled document"
          value={storedDoc.title}
          onChange={handleTitleChange}
          className="text-2xl tracking-tight text-stone-800 leading-relaxed w-full focus:outline-none font-semibold bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
        />
      </div>
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="w-full !min-h-80 resize-none text-lg/7 leading-relaxed text-stone-800 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <PlaceholderPlugin placeholder="Write anything" />
        <InitialContentPlugin storageKey={storageKey} />
        <HistoryPlugin />
        <OnChangePlugin onChange={onChange} />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
    </div>
  )
}
