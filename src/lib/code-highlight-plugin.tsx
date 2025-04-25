"use client"

import {
  registerCodeHighlighting
} from "@lexical/code"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import dark_plus from "@shikijs/themes/dark-plus"

import {
  $createNodeSelection,
  $createParagraphNode,
  $createRangeSelection,
  $getRoot,
  $isTextNode,
  $setSelection,
  createCommand
} from "lexical"
import { ChevronDown, ChevronRight } from "lucide-react"
import { KeyboardEvent, useEffect, useState } from "react"
import Editor from "react-simple-code-editor"
import {
  BundledLanguage,
  BundledTheme,
  createHighlighter,
  HighlighterGeneric,
} from "shiki"
import { DecoratorCodeNode } from "./nodes"

export const INSERT_CODE_COMMAND = createCommand()

export default function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    registerCodeHighlighting(editor)
  }, [editor])

  // useEffect(() => {
  //   if (!editor) return

  //   const removeTripleBacktickListener = editor.registerCommand(
  //     INSERT_CODE_COMMAND,
  //     () => {
  //       editor.update(() => {
  //         const selection = $getSelection()
  //         if (selection !== null) {
  //           const codeNode = $createDecoratorCodeNode()
  //           selection.insertNodes([codeNode])
  //         }
  //       })

  //       return true
  //     },
  //     COMMAND_PRIORITY_EDITOR
  //   )

  //   const removeTextContentListener = editor.registerTextContentListener(
  //     (text) => {
  //       const lastThreeChars = text.slice(-3)
  //       if (lastThreeChars === "```") {
  //         editor.update(() => {
  //           const selection = $getSelection()
  //           if (!$isRangeSelection(selection)) return
  //           selection.deleteCharacter(true)
  //           selection.deleteCharacter(true)
  //           selection.deleteCharacter(true)
  //         })

  //         editor.dispatchCommand(INSERT_CODE_COMMAND, undefined)
  //       }
  //     }
  //   )

  //   return () => {
  //     removeTripleBacktickListener()
  //     removeTextContentListener()
  //   }
  // }, [editor])

  return (
    <button
      onClick={() => {
        editor.update(() => {
          const root = $getRoot()
          const firstTextNode = root.getFirstDescendant()
          const lastTextNode = root.getLastDescendant()

          if (
            firstTextNode &&
            lastTextNode &&
            $isTextNode(firstTextNode) &&
            $isTextNode(lastTextNode)
          ) {
            const rangeSelection = $createRangeSelection()
            rangeSelection.setTextNodeRange(
              firstTextNode,
              0,
              lastTextNode,
              lastTextNode.getTextContentSize()
            )
            $setSelection(rangeSelection)
          }
        })
      }}
      className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-md text-sm font-medium transition-colors"
    >
      Select All
    </button>
  )
}

interface CodeBlockProps {
  node: DecoratorCodeNode
}

export function CodeBlockComponent({ node }: CodeBlockProps) {
  const [code, setCode] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const [editor] = useLexicalComposerContext()

  const [highlighter, setHighlighter] = useState<HighlighterGeneric<
    BundledLanguage,
    BundledTheme
  > | null>(null)

  useEffect(() => {
    const initHighlighter = async () => {
      const highlighter = await createHighlighter({
        themes: [dark_plus],
        langs: [
          "javascript",
          "typescript",
          "tsx",
          "jsx",
          "html",
          "css",
          "json",
          "markdown",
        ],
      })
      setHighlighter(highlighter)
    }

    initHighlighter()
  }, [])

  const handleKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement | HTMLDivElement>
  ) => {
    if (event.key === "Backspace" && code.trim() === "") {
      event.preventDefault()
      event.stopPropagation()
      editor.update(() => {
        node.remove()
      })
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      event.stopPropagation()

      editor.update(() => {
        const nextNode = node.getNextSibling()
        if (nextNode) {
          const nodeSelection = $createNodeSelection()
          nodeSelection.add(nextNode.getKey())
          $setSelection(nodeSelection)
          nextNode.selectStart()
        } else {
          const paragraph = $createParagraphNode()
          node.insertAfter(paragraph)
          const nodeSelection = $createNodeSelection()
          nodeSelection.add(paragraph.getKey())
          $setSelection(nodeSelection)
          paragraph.selectStart()
        }
      })
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      event.stopPropagation()

      editor.update(() => {
        const prevNode = node.getPreviousSibling()
        if (prevNode) {
          const nodeSelection = $createNodeSelection()
          nodeSelection.add(prevNode.getKey())
          $setSelection(nodeSelection)
          prevNode.selectEnd()
        }
      })
    }
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="relative group bg-stone-800 font-mono rounded-lg overflow-hidden shadow-md"
    >
      <div className="bg-stone-900 p-2 flex gap-2 items-center">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-stone-400 hover:text-stone-200 transition-colors"
          aria-label={isExpanded ? "Collapse code" : "Expand code"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <div className="flex items-center gap-3">
          <input
            type="text"
            className="bg-transparent text-stone-200 font-medium text-sm border-none focus:outline-none focus:ring-0 placeholder-stone-400 w-auto"
            defaultValue="Code block"
            placeholder="Enter title..."
          />
          <span className="text-stone-400 text-xs">{node.getLanguage()}</span>
        </div>
      </div>
      {isExpanded && (
        <Editor
          className="rounded-2xl"
          style={{ outline: "none", fontSize: 14 }}
          textareaClassName="focus:outline-none focus:ring-0 focus:border-none"
          value={code}
          onValueChange={setCode}
          highlight={(code) => {
            console.log("code", code)
            if (!highlighter) return code
            try {
              const html = highlighter.codeToHtml(code, {
                lang: "javascript",
                theme: "dark-plus",
              })
              console.log("html", html)
              return html
            } catch (error) {
              console.error("Highlighting error:", error)
              return code
            }
          }}
          padding={10}
        />
      )}
    </div>
  )
}
