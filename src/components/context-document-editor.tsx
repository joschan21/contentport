"use client"

import { TRANSFORMERS } from "@lexical/markdown"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
import {
  EditorState,
  SerializedEditorState,
  SerializedLexicalNode,
} from "lexical"
import debounce from "lodash.debounce"
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react"

import { client } from "@/lib/client"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Input } from "./ui/input"
import PlaceholderPlugin from "@/lib/placeholder-plugin"
import { useDocumentContext } from "@/hooks/document-ctx"
import { usePathname, useRouter } from "next/navigation"

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
  const [editor] = useLexicalComposerContext()
  const [title, setTitle] = useState("")
  const queryClient = useQueryClient()
  const { documentTitles, setDocumentTitle } = useDocumentContext()
  const pathname = usePathname()

  const { data } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const res = await client.document.get.$get({ documentId })
      return res.json()
    },
  })

  useEffect(() => {
    if (!data?.document) return

    const document = data.document
    setTitle(document.title)

    queryClient.setQueryData(["documents"], (old: Document[] = []) => {
      return old.map((doc) =>
        doc.id === documentId ? { ...doc, title: document.title } : doc
      )
    })

    if (!document.content) return

    editor.update(() => {
      const editorState = editor.parseEditorState(document.content!)
      editor.setEditorState(editorState)
    })
  }, [data, editor, documentId, queryClient])

  const {
    mutate: saveToRedis,
    isPending,
    isSuccess,
    isError,
  } = useMutation({
    mutationKey: ["save-doc", pathname],
    mutationFn: async () => {
      const content = editor.getEditorState().toJSON()

      const res = await client.document.save.$post({
        documentId,
        title,
        content,
      })

      return res.json()
    },
    onSuccess: ({ documentId }) => {},
  })

  const debouncedSave = useCallback(
    debounce(() => {
      saveToRedis()
    }, 1000),
    []
  )

  const onChange = () => {
    debouncedSave()
  }

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setDocumentTitle(documentId, newTitle)
    debouncedSave()
  }

  // useEffect(() => {
  //   return () => {
  //     debouncedSave.cancel()
  //   }
  // }, [debouncedSave])

  return (
    <div className="w-full h-full p-4 space-y-4">
      <div className="flex gap-4 justify-between items-center">
        <input
          autoFocus
          type="text"
          placeholder="Document title"
          value={documentTitles[documentId] || title}
          onChange={handleTitleChange}
          className="text-2xl/10 w-full tracking-tight focus:outline-none font-semibold bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
        />
        <div className="w-40 text-xs text-stone-800">
          {isPending && "Saving..."}
          {isSuccess && "All changes saved"}
          {isError && "Error saving"}
        </div>
      </div>
      <div className="relative">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="w-full !min-h-80 resize-none text-lg/7 leading-relaxed text-stone-800 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <PlaceholderPlugin placeholder="Write anything" />
        <HistoryPlugin />
        <OnChangePlugin onChange={onChange} />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
      </div>
    </div>
  )
}
