import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useEffect, useRef, useState } from "react"
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  $setSelection,
  $createRangeSelection,
  TextNode,
  $createParagraphNode,
  $getRoot,
} from "lexical"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { client } from "@/lib/client"
import { MentionNode, $createMentionNode } from "./nodes"
import { useMentionContext } from "@/hooks/mention-ctx"

const MENTION_TRIGGER = "@"

interface Document {
  id: string
  title: string
  updatedAt: Date
}

interface DocumentListResponse {
  success: boolean
  documents: Array<{
    id: string
    title: string
    updatedAt: Date
  }>
}

export function MentionPlugin() {
  const [editor] = useLexicalComposerContext()
  const [suggestions, setSuggestions] = useState<Document[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null)
  const lastTriggerRef = useRef<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const { addAttachedDocument, attachedDocumentIDs } = useMentionContext()

  const { data: documentsData } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await client.document.list.$get()
      return await res.json()
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const text = selection.anchor.getNode().getTextContent()
        const lastChar = text[selection.anchor.offset - 1]

        if (lastChar === MENTION_TRIGGER) {
          setShowSuggestions(true)
          setSuggestions(documentsData || [])
          setSelectedIndex(0)
          lastTriggerRef.current = selection.anchor.offset - 1

          const domSelection = window.getSelection()
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0)
            setAnchorElem(range.startContainer.parentElement)
          }
        } else if (lastTriggerRef.current !== null) {
          const searchText = text.slice(
            lastTriggerRef.current + 1,
            selection.anchor.offset
          )
          const filtered = (documentsData || []).filter((doc) =>
            doc.id.toLowerCase().includes(searchText.toLowerCase())
          )
          setSuggestions(filtered)
          setShowSuggestions(filtered.length > 0)
        }
      })
    })

    return () => {
      removeListener()
    }
  }, [editor, documentsData])

  // todo: small bug when deleting if mention is the only thing in the editor
  const insertMention = (
    document: Document,
    nodeToReplace: TextNode | null
  ) => {
    if (!nodeToReplace) return

    addAttachedDocument(document.id)
    console.log("added", document.id)

    const text = nodeToReplace.getTextContent()
    const triggerOffset = lastTriggerRef.current ?? 0
    const beforeText = text.slice(0, triggerOffset)

    const mentionNode = $createMentionNode(`@${document.title}`)
    const spaceNode = $createTextNode(" ")

    if (beforeText) {
      const beforeTextNode = $createTextNode(beforeText)
      nodeToReplace.replace(beforeTextNode)
      beforeTextNode.insertAfter(mentionNode)
    } else {
      nodeToReplace.replace(mentionNode)
    }

    mentionNode.selectEnd()

    mentionNode.insertAfter(spaceNode)
    spaceNode.selectStart()

    setShowSuggestions(false)
    lastTriggerRef.current = null
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!showSuggestions) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length
      )
    } else if (e.key === "Enter" && suggestions[selectedIndex]) {
      e.preventDefault()
      e.stopPropagation()
      editor.update(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) return

        const textNode = selection.anchor.getNode()
        if (!(textNode instanceof TextNode)) return

        insertMention(suggestions[selectedIndex]!, textNode)
      })
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowSuggestions(false)
      lastTriggerRef.current = null
    }
  }

  // const handleEditorKeyDown = (e: KeyboardEvent) => {
  //   if (e.key === "ArrowRight" || e.key === "Tab") {
  //     editor.update(() => {
  //       const selection = $getSelection()
  //       if (!$isRangeSelection(selection)) return

  //       const anchorNode = selection.anchor.getNode()
  //       const focusNode = selection.focus.getNode()

  //       const isAtEndOfMention =
  //         anchorNode.getParent()?.getType() === "mention" &&
  //         selection.anchor.offset === anchorNode.getTextContentSize()

  //       if (isAtEndOfMention) {
  //         e.preventDefault()

  //         const mentionNode = anchorNode.getParent()
  //         if (mentionNode) {
  //           const nextNode = mentionNode.getNextSibling()

  //           if (nextNode) {
  //             const newSelection = $createRangeSelection()
  //             newSelection.anchor.set(nextNode.getKey(), 0, "text")
  //             newSelection.focus.set(nextNode.getKey(), 0, "text")
  //             $setSelection(newSelection)
  //           } else {
  //             const newTextNode = $createTextNode("")
  //             mentionNode.insertAfter(newTextNode)

  //             const newSelection = $createRangeSelection()
  //             newSelection.anchor.set(newTextNode.getKey(), 0, "text")
  //             newSelection.focus.set(newTextNode.getKey(), 0, "text")
  //             $setSelection(newSelection)
  //           }
  //         }
  //       }
  //     })
  //   }
  // }

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, true)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
    }
  }, [showSuggestions, selectedIndex, suggestions])

  // useEffect(() => {
  //   editor.registerRootListener((rootElement, prevRootElement) => {
  //     if (rootElement) {
  //       rootElement.addEventListener("keydown", handleEditorKeyDown, true)
  //     }
  //     if (prevRootElement) {
  //       prevRootElement.removeEventListener(
  //         "keydown",
  //         handleEditorKeyDown,
  //         true
  //       )
  //     }
  //   })
  // }, [editor])

  // useEffect(() => {
  //   const removeListener = editor.registerUpdateListener(({ editorState }) => {
  //     editorState.read(() => {
  //       const selection = $getSelection()
  //       if (!$isRangeSelection(selection)) return

  //       const anchorNode = selection.anchor.getNode()
  //       const focusNode = selection.focus.getNode()

  //       const isInsideMention =
  //         anchorNode.getParent()?.getType() === "mention" ||
  //         focusNode.getParent()?.getType() === "mention"

  //       if (isInsideMention) {
  //         const mentionNode = anchorNode.getParent()
  //         if (mentionNode) {
  //           const nextNode = mentionNode.getNextSibling()

  //           if (nextNode) {
  //             const newSelection = $createRangeSelection()
  //             newSelection.anchor.set(nextNode.getKey(), 0, "text")
  //             newSelection.focus.set(nextNode.getKey(), 0, "text")
  //             $setSelection(newSelection)
  //           } else {
  //             const newTextNode = $createTextNode("")
  //             mentionNode.insertAfter(newTextNode)

  //             const newSelection = $createRangeSelection()
  //             newSelection.anchor.set(newTextNode.getKey(), 0, "text")
  //             newSelection.focus.set(newTextNode.getKey(), 0, "text")
  //             $setSelection(newSelection)
  //           }
  //         }
  //       }
  //     })
  //   })

  //   return () => {
  //     removeListener()
  //   }
  // }, [editor])

  // useEffect(() => {
  //   const removeListener = editor.registerRootListener(
  //     (rootElement, prevRootElement) => {
  //       if (rootElement) {
  //         const handleClick = (e: MouseEvent) => {
  //           const target = e.target as HTMLElement
  //           if (target.hasAttribute("data-lexical-mention")) {
  //             e.preventDefault()

  //             const mentionElement = target.closest("[data-lexical-mention]")
  //             if (mentionElement) {
  //               const nextElement = mentionElement.nextElementSibling
  //               if (nextElement) {
  //                 editor.update(() => {
  //                   const selection = $getSelection()
  //                   if (!$isRangeSelection(selection)) return

  //                   const nodeKey = nextElement.getAttribute("data-lexical-key")
  //                   if (nodeKey) {
  //                     const node = editor._editorState._nodeMap.get(nodeKey)
  //                     if (node) {
  //                       const newSelection = $createRangeSelection()
  //                       newSelection.anchor.set(node.getKey(), 0, "text")
  //                       newSelection.focus.set(node.getKey(), 0, "text")
  //                       $setSelection(newSelection)
  //                     }
  //                   }
  //                 })
  //               } else {
  //                 editor.update(() => {
  //                   const selection = $getSelection()
  //                   if (!$isRangeSelection(selection)) return

  //                   const nodeKey =
  //                     mentionElement.getAttribute("data-lexical-key")
  //                   if (nodeKey) {
  //                     const node = editor._editorState._nodeMap.get(nodeKey)
  //                     if (node) {
  //                       const newTextNode = $createTextNode("")
  //                       node.insertAfter(newTextNode)

  //                       const newSelection = $createRangeSelection()
  //                       newSelection.anchor.set(newTextNode.getKey(), 0, "text")
  //                       newSelection.focus.set(newTextNode.getKey(), 0, "text")
  //                       $setSelection(newSelection)
  //                     }
  //                   }
  //                 })
  //               }
  //             }
  //           }
  //         }

  //         rootElement.addEventListener("click", handleClick, true)

  //         return () => {
  //           rootElement.removeEventListener("click", handleClick, true)
  //         }
  //       }
  //     }
  //   )
  // }, [editor])

  const getDropdownPosition = () => {
    if (!anchorElem) return { top: 0, left: 0 }

    const rect = anchorElem.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const dropdownHeight = suggestions.length * 36

    const wouldClipBottom = rect.bottom + dropdownHeight > viewportHeight

    return {
      top: wouldClipBottom
        ? rect.top - dropdownHeight - window.scrollY
        : rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    }
  }

  return mounted
    ? createPortal(
        showSuggestions && anchorElem ? (
          <div
            ref={dropdownRef}
            className="fixed z-50 w-64 rounded-md border bg-popover p-1 shadow-md"
            style={getDropdownPosition()}
          >
            {suggestions.map((doc, index) => (
              <div
                key={doc.id}
                className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm ${
                  index === selectedIndex
                    ? "bg-accent text-accent-foreground"
                    : ""
                }`}
              >
                {doc.title || doc.id}
              </div>
            ))}
          </div>
        ) : null,
        document.body
      )
    : null
}
