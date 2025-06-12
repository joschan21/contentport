// "use client"

// import { TRANSFORMERS } from "@lexical/markdown"
// import { ContentEditable } from "@lexical/react/LexicalContentEditable"
// import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
// import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
// import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin"
// import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin"
// import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin"
// import { LexicalComposer } from "@lexical/react/LexicalComposer"
// import { HeadingNode, QuoteNode } from "@lexical/rich-text"
// import { ListNode, ListItemNode } from "@lexical/list"
// import { CodeNode, CodeHighlightNode } from "@lexical/code"
// import { LinkNode } from "@lexical/link"
// import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode"
// import {
//   $getRoot,
//   EditorState,
//   SerializedEditorState,
//   SerializedLexicalNode,
// } from "lexical"
// import debounce from "lodash.debounce"
// import { ChangeEvent, useCallback, useState, useEffect } from "react"
// import { Save, CheckCircle, Clock, BookOpen, Calendar } from "lucide-react"

// import { useDocumentContext } from "@/hooks/document-ctx"
// import { useLocalStorage } from "@/hooks/use-local-storage"
// import PlaceholderPlugin from "@/lib/placeholder-plugin"
// import { InitialContentPlugin } from "@/lib/initial-content-plugin"
// import DuolingoBadge from "@/components/ui/duolingo-badge"
// import { cn } from "@/lib/utils"

// interface ContextDocumentEditorProps {
//   documentId: string
//   initialContent?: string
// }

// export function ContextDocumentEditor({
//   documentId,
//   initialContent = "",
// }: ContextDocumentEditorProps) {
//   const { setDocs } = useDocumentContext()
//   const storageKey = `doc-${documentId}`
//   const [storedDoc, setStoredDoc] = useLocalStorage<{
//     title: string
//     content: string
//     createdAt: string
//   }>(storageKey, {
//     title: "",
//     content: "",
//     createdAt: new Date().toISOString(),
//   })

//   const [isSaving, setIsSaving] = useState(false)
//   const [lastSaved, setLastSaved] = useState<Date | null>(null)
//   const [wordCount, setWordCount] = useState(0)
//   const [characterCount, setCharacterCount] = useState(0)

//   const editorConfig = {
//     namespace: "ContextDocumentEditor",
//     theme: {
//       paragraph: "mb-1",
//       heading: {
//         h1: "text-3xl font-bold mb-4 text-gray-900",
//         h2: "text-2xl font-semibold mb-3 text-gray-900",
//         h3: "text-xl font-medium mb-2 text-gray-900",
//         h4: "text-lg font-medium mb-2 text-gray-900",
//         h5: "text-base font-medium mb-1 text-gray-900",
//         h6: "text-sm font-medium mb-1 text-gray-900",
//       },
//       list: {
//         ul: "list-disc pl-5 mb-2",
//         ol: "list-decimal pl-5 mb-2",
//         listitem: "mb-1",
//       },
//       quote: "border-l-4 border-gray-300 pl-4 italic text-gray-700 mb-2",
//       code: "bg-gray-100 px-1 py-0.5 rounded font-mono text-sm",
//       codeHighlight: {
//         atrule: "text-blue-600",
//         attr: "text-green-600",
//         boolean: "text-purple-600",
//         builtin: "text-purple-600",
//         cdata: "text-gray-600",
//         char: "text-green-600",
//         class: "text-yellow-600",
//         "class-name": "text-yellow-600",
//         comment: "text-gray-500 italic",
//         constant: "text-purple-600",
//         deleted: "text-red-600",
//         doctype: "text-gray-600",
//         entity: "text-red-600",
//         function: "text-blue-600",
//         important: "text-red-600 font-bold",
//         inserted: "text-green-600",
//         keyword: "text-purple-600",
//         namespace: "text-purple-600",
//         number: "text-green-600",
//         operator: "text-gray-700",
//         prolog: "text-gray-600",
//         property: "text-green-600",
//         punctuation: "text-gray-700",
//         regex: "text-red-600",
//         selector: "text-blue-600",
//         string: "text-green-600",
//         symbol: "text-purple-600",
//         tag: "text-red-600",
//         url: "text-blue-600 underline",
//         variable: "text-red-600",
//       },
//       link: "text-blue-600 underline hover:text-blue-800",
//     },
//     nodes: [
//       HeadingNode,
//       QuoteNode,
//       ListNode,
//       ListItemNode,
//       CodeNode,
//       CodeHighlightNode,
//       LinkNode,
//       HorizontalRuleNode,
//     ],
//     onError: (error: Error) => {
//       console.error("Lexical error:", error)
//     },
//   }

//   const saveToLocalStorage = useCallback(
//     debounce(({ content }: { content: string }) => {
//       setIsSaving(true)
//       const prev = localStorage.getItem(storageKey)
//       const parsed = JSON.parse(
//         prev ??
//           JSON.stringify({
//             title: storedDoc.title,
//             content,
//             createdAt: storedDoc.createdAt,
//           })
//       ) as { title: string; content: string; createdAt: string }
//       localStorage.setItem(storageKey, JSON.stringify({ ...parsed, content }))

//       setTimeout(() => {
//         setIsSaving(false)
//         setLastSaved(new Date())
//       }, 300)
//     }, 500),
//     [storageKey, storedDoc.title, storedDoc.createdAt]
//   )

//   const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
//     setDocs((prev) => {
//       return prev.map((doc) => {
//         if (doc.id === documentId) {
//           return { ...doc, title: e.target.value }
//         }
//         return doc
//       })
//     })
//     setStoredDoc((prev) => ({ ...prev, title: e.target.value }))
//   }

//   const onChange = useCallback(
//     (editorState: EditorState) => {
//       const content = JSON.stringify(editorState.toJSON())

//       editorState.read(() => {
//         const root = $getRoot()
//         const textContent = root.getTextContent()
//         const words = textContent
//           .trim()
//           .split(/\s+/)
//           .filter((word) => word.length > 0)

//         setWordCount(words.length)
//         setCharacterCount(textContent.length)
//       })

//       saveToLocalStorage({ content })
//     },
//     [saveToLocalStorage]
//   )

//   const formatLastSaved = (date: Date) => {
//     const now = new Date()
//     const diffInMinutes = Math.floor(
//       (now.getTime() - date.getTime()) / (1000 * 60)
//     )

//     if (diffInMinutes < 1) return "Saved"
//     if (diffInMinutes === 1) return "1m ago"
//     if (diffInMinutes < 60) return `${diffInMinutes}m ago`

//     const diffInHours = Math.floor(diffInMinutes / 60)
//     if (diffInHours === 1) return "1h ago"
//     if (diffInHours < 24) return `${diffInHours}h ago`

//     return date.toLocaleDateString()
//   }

//   const formatCreatedDate = () => {
//     const date = new Date(storedDoc.createdAt)
//     const now = new Date()
//     const diffInDays = Math.floor(
//       (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
//     )

//     if (diffInDays === 0) return "Created today"
//     if (diffInDays === 1) return "Created yesterday"
//     if (diffInDays < 7) return `Created ${diffInDays} days ago`
//     return `Created ${date.toLocaleDateString()}`
//   }

//   return (
//     <div className="w-full h-full space-y-6">
//       <div className="space-y-4">
//         <input
//           autoFocus
//           type="text"
//           placeholder="Untitled document"
//           value={storedDoc.title}
//           onChange={handleTitleChange}
//           className="text-3xl font-bold text-gray-900 leading-tight w-full focus:outline-none bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 placeholder:text-gray-400"
//         />

//         <div className="flex items-center justify-start gap-2">
//           <div className="flex items-center gap-3">
//             <DuolingoBadge variant="streak">
//               <Calendar className="size-3 mr-1" />
//               {formatCreatedDate()}
//             </DuolingoBadge>
//           </div>

//           <div className="flex items-center gap-3">
//             {isSaving ? (
//               <DuolingoBadge variant="notification">
//                 <Save className="size-3 mr-1 animate-spin" />
//                 Saving
//               </DuolingoBadge>
//             ) : lastSaved ? (
//               <DuolingoBadge variant="notification">
//                 <CheckCircle className="size-3 mr-1" />
//                 {formatLastSaved(lastSaved)}
//               </DuolingoBadge>
//             ) : null}
//           </div>
//         </div>
//       </div>

//       <div className="relative w-full rounded-xl bg-white border-2 border-gray-200 shadow-[0_2px_0_#E5E7EB] focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 transition-all duration-200">
//         <div className="p-4 min-h-[200px]">
//           <LexicalComposer initialConfig={editorConfig}>
//             <RichTextPlugin
//               contentEditable={
//                 <ContentEditable className="w-full min-h-[500px] resize-none text-base leading-relaxed text-gray-900 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
//               }
//               ErrorBoundary={LexicalErrorBoundary}
//             />
//             <PlaceholderPlugin placeholder="Start writing..." />
//             <InitialContentPlugin storageKey={storageKey} />
//             <HistoryPlugin />
//             <OnChangePlugin onChange={onChange} />
//             <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
//           </LexicalComposer>
//         </div>

//         <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-xl">
//           <div className="flex items-center justify-between text-sm text-gray-600">
//             <span>
//               {characterCount.toLocaleString()} characters •{" "}
//               {wordCount.toLocaleString()} words
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
