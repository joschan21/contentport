import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import DuolingoButton from '@/components/ui/duolingo-button'
import { useTweets } from '@/hooks/use-tweets'
import { client } from '@/lib/client'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { InferInput, InferOutput } from '@/server'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { $getRoot } from 'lexical'
import debounce from 'lodash.debounce'
import { Bold, ImagePlus, Italic, Smile, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icons } from '../icons'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer'
import { Skeleton } from '../ui/skeleton'
import { ImageTool } from './image-tool'
import { useEditor } from '@/hooks/use-editors'
import { AdditionNode, DeletionNode, ReplacementNode, UnchangedNode } from '@/lib/nodes'
import { InitialConfigType, LexicalComposer } from '@lexical/react/LexicalComposer'
import { MultipleEditorStorePlugin } from '@/lib/lexical-plugins/multiple-editor-plugin'
import { useNavigate } from 'react-router'
import { KEY_DOWN_COMMAND } from 'lexical'

const initialConfig: InitialConfigType = {
  namespace: 'tweet-editor',
  theme: {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
  onError: (error: Error) => {
    console.error('[Tweet Editor Error]', error)
  },
  editable: true,
  nodes: [DeletionNode, AdditionNode, UnchangedNode, ReplacementNode],
}

interface TweetProps {
  account: {
    name: string
    handle: string
    avatarFallback: string
    avatar?: string
    verified?: boolean
  }
  onDelete?: () => void
  onAdd?: () => void
}

export default function Tweet({ account }: TweetProps) {
  const editor = useEditor('tweet-editor')
  const [charCount, setCharCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [imageDrawerOpen, setImageDrawerOpen] = useState(false)
  const { tweetId, queueSave, setTweetContent } = useTweets()

  const prev = useRef('')

  useEffect(() => {
    const unregister = editor?.registerUpdateListener(({ editorState, tags }) => {
      const content = editorState.read(() => $getRoot().getTextContent())

      setCharCount(content.length)

      if (tags.has('system-clear')) {
        prev.current = ''
        return
      }

      if (tags.has('system-update')) {
        prev.current = content
        return
      }

      if (content === prev.current) return
      setTweetContent(tweetId, content)

      queueSave({ tweetId, content })
    })

    return () => {
      unregister?.()
    }
  }, [editor, tweetId, prev.current, queueSave])

  const handlePostToTwitter = () => {
    const tweetText = editor?.read(() => $getRoot().getTextContent())
    const encodedText = encodeURIComponent(tweetText ?? '')

    const sanitizedText = encodedText.endsWith('%0A')
      ? encodedText.slice(0, -3)
      : encodedText

    window.open(`https://x.com/intent/tweet?text=${sanitizedText}`, '_blank')
  }

  const getProgressColor = () => {
    const percentage = (charCount / 280) * 100
    if (percentage >= 100) return 'text-red-500'
    return 'text-blue-500'
  }

  const progress = Math.min((charCount / 280) * 100, 100)
  const circumference = 2 * Math.PI * 10
  const strokeDashoffset = circumference - (progress / 100) * circumference

  // if (isLoadingTweet && tweetId !== 'new') {
  //   return (
  //     <div className="relative bg-white p-6 rounded-2xl w-full border border-stone-200 bg-clip-padding shadow-sm">
  //       <div className="flex gap-3">
  //         <Skeleton className="h-12 w-12 rounded-full" />

  //         <div className="flex-1">
  //           <div className="flex items-center gap-2 mb-3">
  //             <Skeleton className="h-4 w-24" />
  //             <Skeleton className="h-4 w-20" />
  //           </div>

  //           <div className="space-y-2">
  //             <Skeleton className="h-4 w-full" />
  //             <Skeleton className="h-4 w-3/4" />
  //             <Skeleton className="h-4 w-5/6" />
  //           </div>

  //           <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
  //             <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg">
  //               <Skeleton className="h-8 w-8 rounded-md" />
  //               <div className="w-px h-4 bg-stone-300 mx-2"></div>
  //               <Skeleton className="h-8 w-8 rounded-md" />
  //               <Skeleton className="h-8 w-8 rounded-md" />
  //               <Skeleton className="h-8 w-8 rounded-md" />
  //               <div className="w-px h-4 bg-stone-300 mx-2"></div>
  //               <Skeleton className="h-8 w-8 rounded-full" />
  //             </div>

  //             <Skeleton className="h-11 w-28 rounded-lg" />
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  return (
    <Drawer modal={false} open={open} onOpenChange={setOpen}>
      <div className="relative bg-white p-6 rounded-2xl w-full border border-stone-200 bg-clip-padding shadow-sm">
        {/* {showConnector && (
        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200 dark:bg-stone-700 z-0"></div>
      )} */}

        <div className="flex gap-3 relative z-10">
          <Avatar className="h-12 w-12 rounded-full border-2 border-white bg-white">
            <AvatarImage src={account.avatar} alt={account.handle} />
            <AvatarFallback>{account.avatarFallback}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-text-gray text-base">
                  {account.name}
                </span>
                {account.verified && <Icons.verificationBadge className="h-4 w-4" />}
                <span className="text-stone-400 text-base">@{account.handle}</span>
              </div>
            </div>

            <div className="mt-1 text-stone-800 leading-relaxed">
              <LexicalComposer initialConfig={initialConfig}>
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
                <MultipleEditorStorePlugin id="tweet-editor" />
              </LexicalComposer>
            </div>

            {/* {tweet?.image && (
              <>
                <Separator className="bg-stone-200 my-4" />

                <div className="overflow-hidden group relative">
                  <div
                    className="relative w-full"
                    style={{
                      paddingBottom: `${(tweet.image.height / tweet.image.width) * 100}%`,
                    }}
                  >
                    <img
                      src={tweet.image.src}
                      alt="Tweet media"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DuolingoButton
                        size="icon"
                        variant="secondary"
                        onClick={() => {
                          setImageDrawerOpen(true)
                        }}
                        className="rounded-full"
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit image</span>
                      </DuolingoButton>
                      <DuolingoButton
                        size="icon"
                        variant="secondary"
                        onClick={() => id && downloadTweetImage(id)}
                        className="rounded-full"
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download image</span>
                      </DuolingoButton>
                      <DuolingoButton
                        size="icon"
                        variant="secondary"
                        // onClick={() => removeTweetImage(id)}
                        className="size-8 p-0 rounded-full"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                        <span className="sr-only">Remove image</span>
                      </DuolingoButton>
                    </div>
                  </div>
                </div>
              </>
            )} */}

            <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg">
                <DrawerTrigger asChild>
                  <DuolingoButton variant="secondary" size="icon" className="rounded-md">
                    <ImagePlus className="size-4" />
                    <span className="sr-only">Add image</span>
                  </DuolingoButton>
                </DrawerTrigger>
                <DrawerContent className="h-full">
                  <div className="max-w-6xl mx-auto w-full">
                    <DrawerHeader className="px-0">
                      <DrawerTitle className="font-medium">Add image</DrawerTitle>
                    </DrawerHeader>
                    <DrawerClose asChild>
                      <DuolingoButton
                        variant="secondary"
                        size="icon"
                        className="absolute bg-stone-100 right-4 top-4"
                      >
                        <X className="h-4 w-4 text-stone-500" />
                      </DuolingoButton>
                    </DrawerClose>
                  </div>

                  <div className="w-full drawer-body h-full overflow-y-auto">
                    <div className="max-w-6xl mx-auto w-full mb-12">
                      <ImageTool
                        onClose={() => setOpen(false)}
                        onSave={(image) => {
                          // setTweetImage(id, image)
                          setOpen(false)
                        }}
                      />
                    </div>
                  </div>
                </DrawerContent>

                <div className="w-px h-4 bg-stone-300 mx-2"></div>

                <DuolingoButton variant="secondary" size="icon" className="rounded-md">
                  <Bold className="size-4" />
                  <span className="sr-only">Bold</span>
                </DuolingoButton>
                <DuolingoButton variant="secondary" size="icon" className="rounded-md">
                  <Italic className="size-4" />
                  <span className="sr-only">Italic</span>
                </DuolingoButton>
                <DuolingoButton variant="secondary" size="icon" className="rounded-md">
                  <Smile className="size-4" />
                  <span className="sr-only">Emoji</span>
                </DuolingoButton>

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
                      className={`text-sm/6 ${280 - charCount < 1 ? 'text-red-500' : 'text-stone-800'} mr-3.5`}
                    >
                      <p>{280 - charCount < 20 ? 280 - charCount : charCount}</p>
                    </div>
                  )}
                </div>

                {/* <div className="flex items-center gap-1 ml-2">
                  {getSaveStatusIcon()}
                  <span className="text-xs text-stone-500">
                    {getSaveStatusText()}
                  </span>
                </div> */}
              </div>
              <div className="flex items-center gap-2">
                <DuolingoButton className="h-11" onClick={handlePostToTwitter}>
                  <Icons.twitter className="size-4 mr-2" />
                  <span className="text-sm">Preview</span>
                  <span className="sr-only">Preview on Twitter</span>
                </DuolingoButton>
                {/* <DuolingoButton
                variant="secondary"
                size="sm"
                className="h-7 w-7 p-0 rounded-full"
                onClick={handleImproveClarity}
                disabled={improvementsMutation.isPending}
              >
                {improvementsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                )}
                <span className="sr-only">Improve clarity</span>
              </DuolingoButton> */}
                {/* {onDelete && (
                <DuolingoButton
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 p-0 rounded-full"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                  <span className="sr-only">Delete tweet</span>
                </DuolingoButton>
              )} */}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Drawer modal={false} open={imageDrawerOpen} onOpenChange={setImageDrawerOpen}>
        <DrawerContent className="h-full">
          <div className="max-w-6xl mx-auto w-full">
            <DrawerHeader className="px-0">
              <DrawerTitle className="font-medium">Edit image</DrawerTitle>
            </DrawerHeader>
            <DrawerClose asChild>
              <DuolingoButton
                variant="secondary"
                size="icon"
                className="absolute right-4 top-4 rounded-full p-2"
              >
                <X className="h-4 w-4 text-stone-500" />
              </DuolingoButton>
            </DrawerClose>
          </div>

          <div className="w-full drawer-body h-full overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full mb-12">
              {/* <ImageTool
                onClose={() => setImageDrawerOpen(false)}
                onSave={(image) => {
                  // editTweetImage(id, image)
                  setImageDrawerOpen(false)
                }}
                initialEditorState={tweet?.image?.editorState}
              /> */}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Drawer>
  )
}
