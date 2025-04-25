"use client"

import { InferInput } from "@/server"
import { useCompletion } from "@ai-sdk/react"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { useMutation } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useRef, useState } from "react"

import {
  $createAdditionNode,
  $createElNode,
  $createUnchangedNode,
  AdditionNode,
  ElNode,
  InlineNode,
  UnchangedNode,
  UnprocessedNode,
} from "@/lib/nodes"
import DiffMatchPatch from "diff-match-patch"
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  ElementNode,
  ParagraphNode,
  RangeSelection,
  TextNode,
} from "lexical"

import { $setBlocksType } from "@lexical/selection"
import { client } from "@/lib/client"

interface VoiceContextType {
  completion: string
  transcribe: (data: Input) => void
  isProcessing: boolean
  currentCommand: string
  setCurrentCommand: (command: string) => void
  proposedText: string | null
  setProposedText: (text: string | null) => void
  isGenerating: boolean
  acceptCompletion: () => void
  rejectCompletion: () => void
}

const dmp = new DiffMatchPatch()
const VoiceContext = createContext<VoiceContextType | null>(null)

type Input = InferInput["voice"]["transcribe"]
type DocumentState = InferInput["voice"]["transcribe"]["documentState"]

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [currentCommand, setCurrentCommand] = useState("")
  const [proposedText, setProposedText] = useState<string | null>(null)
  const [editor] = useLexicalComposerContext()
  const currentTextRef = useRef<string>("")
  const [trigger, setTrigger] = useState(false)

  const elnodekey = useRef<string>("null")

  const {
    mutate: transcribe,
    isPending: isTranscribing,
    variables,
  } = useMutation({
    mutationKey: ["transcribe"],
    mutationFn: async (data: Input) => {
      setCompletion("")
      const res = await client.voice.transcribe.$post(data)
      return await res.json()
    },
    onSuccess: ({ transcript, documentState }) => {
      complete(transcript, { body: { documentState, command: transcript } })
    },
  })

  const acceptCompletion = () => {
    if (completion) {
      editor.update(() => {
        if (!elnodekey.current) return
        const elNode = $getNodeByKey(elnodekey.current)

        if (elNode instanceof ElNode) {
          const inlineNode = elNode
            .getChildren()
            .find((child) => child instanceof InlineNode)

          let finalText = ""

          if (inlineNode) {
            for (const child of inlineNode.getChildren()) {
              if (
                child instanceof AdditionNode ||
                child instanceof UnchangedNode
              ) {
                finalText += child.getTextContent()
              }
            }

            const parent = elNode.getParent()
            if (!parent) return

            const text = $createTextNode(finalText)

            // Use elNode's position for insertion
            const elNodeIndex = parent.getChildren().indexOf(elNode)
            if (elNodeIndex !== -1) {
              elNode.insertBefore(text, true)
              elNode.remove()
            }
          }
        }
      })
    }
  }

  const rejectCompletion = () => {
    if (completion) {
      editor.update(() => {
        if (!elnodekey.current) return
        const elNode = $getNodeByKey(elnodekey.current)

        if (elNode instanceof ElNode) {
          const parent = elNode.getParent()
          if (!parent) return

          const text = $createTextNode(currentTextRef.current)

          const elNodeIndex = parent.getChildren().indexOf(elNode)
          if (elNodeIndex !== -1) {
            elNode.insertBefore(text, true)
            elNode.remove()
          }

          text.select()
        }
      })
    }
  }

  const {
    completion,
    complete,
    isLoading: isGenerating,
    setCompletion,
  } = useCompletion({
    api: "/api/voice/generate",
    onResponse: () => {
      setTrigger(false)

      editor.update(
        () => {
          const selection = $getSelection()

          if ($isRangeSelection(selection)) {
            /**
             * collapse selection
             */
            // const anchor = selection.anchor

            // // Create a new collapsed selection at the anchor point
            // const collapsedSelection = $createRangeSelection()
            // collapsedSelection.anchor.set(
            //   anchor.key,
            //   anchor.offset,
            //   anchor.type
            // )
            // collapsedSelection.focus.set(anchor.key, anchor.offset, anchor.type)

            // $setSelection(collapsedSelection)

            /**
             * insertion logic
             */
            currentTextRef.current = selection.getTextContent()

            const unprocessedTextNode = new UnprocessedNode(
              selection.getTextContent()
            )

            const elNode = new ElNode()
            elnodekey.current = elNode.getKey()

            if (elNode instanceof ElNode) {
              const inlineNode = new InlineNode()
              elNode.append(inlineNode)
              elNode.append(unprocessedTextNode)
            }

            selection.insertNodes([elNode])
          }
        },
        { discrete: true }
      )
    },
    onFinish: () => {
      // TODO: turn elnode into paragraph
      setTrigger(true)
    },
  })

  useEffect(() => {
    if (completion) {
      const diff1 = currentTextRef.current
      const diff2 = completion

      const diffs = dmp.diff_main(diff1, diff2)
      dmp.diff_cleanupSemantic(diffs)

      const additions = diffs.reduce((acc, [type, text]) => {
        return type === 1 ? acc + text.length : acc
      }, 0)

      const unprocessedText = trigger
        ? ""
        : currentTextRef.current.slice(completion.length - additions)

      editor.update(
        () => {
          if (!elnodekey.current) return

          const rootChildren = $getRoot().getChildren()
          console.log("Root children:", rootChildren)

          const elNode = $getNodeByKey(elnodekey.current)

          if (elNode instanceof ElNode) {
            const nodes = elNode.getChildren()

            let unprocessedTextNodeKey = ""
            let inlineNodeKey = ""

            nodes.forEach((node) => {
              if (node instanceof UnprocessedNode) {
                unprocessedTextNodeKey = node.getKey()
              }

              if (node instanceof InlineNode) {
                inlineNodeKey = node.getKey()
              }
            })

            const inlineNode = $getNodeByKey(inlineNodeKey)
            const unprocessedTextNode = $getNodeByKey(unprocessedTextNodeKey)

            if (inlineNode instanceof InlineNode) {
              inlineNode.clear()

              for (const [type, text] of diffs) {
                let node: AdditionNode | UnchangedNode | undefined = undefined

                if (type === DiffMatchPatch.DIFF_INSERT) {
                  node = $createAdditionNode(text)
                } else if (type === DiffMatchPatch.DIFF_EQUAL) {
                  node = $createUnchangedNode(text)
                } else if (type === DiffMatchPatch.DIFF_DELETE) {
                  // skip
                  continue
                }

                if (node) inlineNode.append(node)
              }
            }

            if (unprocessedTextNode instanceof UnprocessedNode) {
              console.log("unprocessed:", unprocessedText)
              unprocessedTextNode.setTextContent(unprocessedText)
            }
          }
        },
        { discrete: true }
      )
    }
  }, [completion, editor, trigger])

  return (
    <VoiceContext.Provider
      value={{
        completion,
        transcribe,
        isProcessing: isTranscribing || isGenerating,
        currentCommand,
        setCurrentCommand,
        proposedText,
        setProposedText,
        isGenerating,
        acceptCompletion,
        rejectCompletion,
      }}
    >
      {children}
    </VoiceContext.Provider>
  )
}

export function useVoice() {
  const context = useContext(VoiceContext)
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider")
  }
  return context
}

function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor
  const focus = selection.focus
  const anchorNode = anchor.getNode()
  const focusNode = focus.getNode()
  return anchorNode === focusNode
    ? anchorNode
    : selection.isBackward()
      ? focusNode
      : anchorNode
}
