import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useTweetContext } from "@/hooks/tweet-ctx"
import { AdditionNode, DeletionNode, UnchangedNode } from "@/lib/nodes"
import PlaceholderPlugin from "@/lib/placeholder-plugin"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { ContentEditable } from "@lexical/react/LexicalContentEditable"
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary"
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin"
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin"
import { diff_match_patch } from "diff-match-patch"
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical"
import {
  Bold,
  Check,
  Italic,
  Loader2,
  Smile,
  Sparkles,
  Trash2,
  X,
  Twitter,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useQueryState } from "nuqs"

interface TweetProps {
  id: string
  suggestion: string | null
  author: {
    name: string
    handle: string
    avatar: string
    avatarFallback: string
  }
  onDelete?: () => void
  onAdd?: () => void
}

const dmp = new diff_match_patch()

export default function Tweet({
  id,
  suggestion,
  author,
  onDelete,
}: TweetProps) {
  const [editor] = useLexicalComposerContext()
  const [charCount, setCharCount] = useState(0)

  const {
    registerEditor,
    unregisterEditor,
    improvementsMutation,
    acceptSuggestion,
    rejectSuggestion,
    contents,
  } = useTweetContext()

  const content = contents.current.get(id)

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const textNode = $createTextNode(content)
      const p = $createParagraphNode()
      p.append(textNode)
      root.append(p)
    })
  }, [editor])

  useEffect(() => {
    registerEditor(id, editor)

    return () => {
      unregisterEditor(id)
    }
  }, [editor, id, registerEditor, unregisterEditor])

  useEffect(() => {
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent()
        setCharCount(text.length)
        contents.current.set(id, text)
      })
    })

    return () => {
      removeListener()
    }
  }, [editor, content])

  const handleAcceptSuggestion = () => {
    if (suggestion) acceptSuggestion(id, suggestion)
  }

  const handleRejectSuggestion = () => {
    if (suggestion) rejectSuggestion(id)
  }

  const handleImproveClarity = () => {
    improvementsMutation.mutate()
  }

  const handlePostToTwitter = () => {
    const tweetText = editor.read(() => $getRoot().getTextContent())
    const encodedText = encodeURIComponent(tweetText)
    window.open(
      `https://twitter.com/intent/tweet?text=${encodedText}`,
      "_blank"
    )
  }

  useEffect(() => {
    if (!suggestion) return

    const content = editor.read(() => $getRoot().getTextContent())

    const diffs = dmp.diff_main(content, suggestion)
    dmp.diff_cleanupSemantic(diffs)

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const p = $createParagraphNode()

      diffs.forEach(([type, text]) => {
        if (type === 0) {
          p.append(new UnchangedNode(text))
        } else if (type === 1) {
          p.append(new AdditionNode(text))
        } else if (type === -1) {
          p.append(new DeletionNode(text))
        }
      })

      root.append(p)
    })
  }, [suggestion, editor])

  const getProgressColor = () => {
    const percentage = (charCount / 280) * 100
    if (percentage >= 100) return "text-red-500"
    return "text-blue-500"
  }

  const progress = Math.min((charCount / 280) * 100, 100)
  const circumference = 2 * Math.PI * 10
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative bg-white p-6 rounded-2xl w-full shadow-sm border border-stone-200">
      {/* {showConnector && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-stone-700 z-0"></div>
      )} */}

      <div className="flex gap-3 relative z-10">
        <Avatar className="h-12 w-12 rounded-full border-2 border-white bg-white">
          <AvatarImage src="/images/profile_picture.jpg" alt="@joshtriedcoding" />
          <AvatarFallback>{author.avatarFallback}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-base">{author.name}</span>
              <span className="text-gray-500 text-base">@{author.handle}</span>
            </div>
            {/* <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                onClick={handleImproveClarity}
              >
                <Sparkles className="h-4 w-4" />
                <span className="sr-only">Improve clarity</span>
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete tweet</span>
                </Button>
              )}
            </div> */}
          </div>

          <div className="mt-1 text-stone-800 leading-relaxed">
            <PlainTextPlugin
              contentEditable={
                <ContentEditable
                  autoFocus
                  spellCheck={false}
                  className="w-full !min-h-16 resize-none text-base/7 leading-relaxed text-stone-800 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <PlaceholderPlugin placeholder="What's happening?" />
            <HistoryPlugin />
          </div>

          <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 rounded-md"
              >
                <Bold className="h-4 w-4" />
                <span className="sr-only">Bold</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 rounded-md"
              >
                <Italic className="h-4 w-4" />
                <span className="sr-only">Italic</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-stone-800 bg-white hover:bg-stone-50 border border-stone-200 rounded-md"
              >
                <Smile className="h-4 w-4" />
                <span className="sr-only">Emoji</span>
              </Button>

              <div className="w-px h-4 bg-stone-300 mx-2"></div>

              <div className="relative flex items-center justify-center">
                <div className="h-8 w-8">
                  <svg className="-ml-[5px] -rotate-90 w-full h-full">
                    <circle
                      className="text-stone-200"
                      strokeWidth="2"
                      stroke="currentColor"
                      fill="transparent"
                      r="10"
                      cx="16"
                      cy="16"
                    />
                    <circle
                      className={`${getProgressColor()} transition-all duration-200`}
                      strokeWidth="2"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="transparent"
                      r="10"
                      cx="16"
                      cy="16"
                    />
                  </svg>
                </div>
                {charCount > 260 && charCount < 280 && (
                  <div
                    className={`text-sm/6 ${280 - charCount < 1 ? "text-red-500" : "text-stone-800"} mr-3.5`}
                  >
                    <p>{280 - charCount < 20 ? 280 - charCount : charCount}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                onClick={handlePostToTwitter}
              >
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Post to Twitter</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 rounded-full text-gray-400 hover:text-amber-500 hover:bg-amber-50"
                onClick={handleImproveClarity}
                disabled={improvementsMutation.isPending}
              >
                {improvementsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="sr-only">Improve clarity</span>
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete tweet</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {suggestion && (
        <div className="mt-2 flex justify-end items-center gap-2 text-xs text-gray-500">
          <button
            onClick={handleRejectSuggestion}
            className="flex items-center gap-1 px-2 py-1 rounded text-red-600 bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <X className="h-3 w-3" />
            <span>Reject</span>
          </button>
          <button
            onClick={handleAcceptSuggestion}
            className="flex items-center gap-1 px-2 py-1 rounded text-stone-600 bg-stone-50 dark:hover:bg-stone-900/20 transition-colors"
          >
            <Check className="h-3 w-3" />
            <span>Apply</span>
          </button>
        </div>
      )}
    </div>
  )
}
