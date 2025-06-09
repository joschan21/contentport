import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import DuolingoButton from '@/components/ui/duolingo-button'
import { useSidebarContext } from '@/hooks/sidebar-ctx'
import { useTweetContext } from '@/hooks/tweet-ctx'
import { client } from '@/lib/client'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { InferInput, InferOutput } from '@/server'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { diff_match_patch } from 'diff-match-patch'
import { $getRoot } from 'lexical'
import { Bold, Download, ImagePlus, Italic, Pencil, Smile, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Icons } from '../icons'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer'
import { Separator } from '../ui/separator'
import { ImageTool } from './image-tool'
import { Skeleton } from '../ui/skeleton'
import debounce from 'lodash.debounce'
import { useSearchParams } from 'react-router'
import { hasAutoParseableInput } from 'openai/lib/parser.mjs'

interface TweetProps {
  // suggestion: string | null
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

type SaveInput = InferInput['tweet']['save']
type GetRecentTweetsOutput = InferOutput['tweet']['recents']['tweets']

export default function Tweet({
  // suggestion,
  account,
}: TweetProps) {
  const [editor] = useLexicalComposerContext()
  const [charCount, setCharCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [imageDrawerOpen, setImageDrawerOpen] = useState(false)
  const [searchParams] = useSearchParams()
  const chatId = searchParams.get('chatId')
  const { id } = useParams()

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const saveInFlight = useRef(false)
  const hasPendingChanges = useRef(false)
  const { queuedImprovements, addImprovements } = useTweetContext()

  const pendingSaves = useRef<Array<({ assignedId }: { assignedId: string }) => void>>([])

  // prevent unsaved changes
  useEffect(() => {
    const handleUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges.current) {
        const message = 'Changes you made may not be saved.'
        e.preventDefault()
        return (e.returnValue = message)
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [])

  const { registerClearTweet } = useSidebarContext()

  const {
    potentialId,
    registerEditor,
    registerMutationReset,
    unregisterEditor,
    downloadTweetImage,
    tweet,
  } = useTweetContext()

  const prevContent = useRef('')

  const { mutate, submittedAt, reset } = useMutation({
    mutationFn: async ({ id, content, editorState }: SaveInput) => {
      // prevent multiple saves at once
      saveInFlight.current = true

      // id if is "new", let server generate id
      const payloadId = id === 'new' ? undefined : id

      console.log(
        '%c🔄 SAVING TWEET',
        'color: #3b82f6; font-weight: bold; font-size: 14px;',
        {
          id: payloadId,
          content,
          timestamp: new Date().toISOString(),
        },
      )

      const res = await client.tweet.save.$post({
        id: payloadId,
        content,
        editorState,
      })
      saveInFlight.current = false

      return await res.json()
    },
    onSuccess: ({ assignedId, tweet }) => {
      processPendingSaves({ assignedId })

      if (!id || id === 'new') {
        if (chatId) {
          navigate(`/studio/t/${assignedId}?chatId=${chatId}`)
        } else {
          navigate(`/studio/t/${assignedId}`)
        }
      }

      // refresh "recents" in left sidebar
      queryClient.setQueryData(['get-recent-tweets'], (old: GetRecentTweetsOutput) => {
        const getNewData = () => {
          const existing = old.find((t) => t.id === assignedId)

          if (existing) {
            return old.map((element) => {
              if (element.id === assignedId && tweet)
                return { ...element, content: tweet.content }
              return element
            })
          }

          if (tweet) {
            return [tweet, ...old]
          }

          return old
        }

        const data = getNewData()

        return data.filter((item) => item.id !== 'new')
      })

      queryClient.setQueryData(['tweet', assignedId], tweet)
    },
  })

  const { data, isFetching: isLoadingTweet } = useQuery({
    queryKey: ['tweet', id],
    queryFn: async () => {
      if (!id) return null

      console.log(
        '%c🔄 GETTING TWEET',
        'color: #3b82f6; font-weight: bold; font-size: 14px;',
        { id },
      )

      const res = await client.tweet.getTweet.$get({ id })
      const { tweet } = await res.json()

      if (!tweet) return null

      return tweet
    },
    staleTime: Infinity,
    enabled: !Boolean(submittedAt),
  })

  useEffect(() => {
    registerMutationReset(reset)
  }, [reset])

  const prevId = useRef('')

  useEffect(() => {
    if (!Boolean(submittedAt)) {
      if (!data || !id) {
        editor.update(() => $getRoot().clear(), { tag: 'system-update' })
        return
      }

      const queue = queuedImprovements[id]

      console.log('fucking queue', id, queuedImprovements, queue)

      if (queue) {
        addImprovements(id, queue, editor)
        prevId.current = id
        return
        console.log('DONE IMPROVEMENTS')
      }

      if (id === prevId.current) return

      const state = editor.parseEditorState(JSON.stringify(data.editorState))

      if (state.isEmpty()) {
        editor.update(() => $getRoot().clear(), { tag: 'system-update' })
      } else {
        editor.setEditorState(state, { tag: 'system-update' })
      }

      console.log('SET EDITOR AGAIN', id, prevId.current)

      prevContent.current = editor.read(() => $getRoot().getTextContent())
      editor.focus()

      prevId.current = id
    }
  }, [data, editor, submittedAt, prevId, queuedImprovements, id])

  const queueSave = useCallback(
    debounce(({ id, content, editorState }: SaveInput) => {
      hasPendingChanges.current = false
      if (saveInFlight.current === true) {
        pendingSaves.current.push(({ assignedId }) =>
          mutate({ id: assignedId, content, editorState }),
        )
      } else {
        mutate({ id, content, editorState })
      }
    }, 750),
    [mutate],
  )

  const processPendingSaves = ({ assignedId }: { assignedId: string }) => {
    if (pendingSaves.current.length > 0 && !saveInFlight.current) {
      const next = pendingSaves.current.shift()
      if (next) next({ assignedId })
    }
  }

  useEffect(() => {
    if(id) registerEditor(id, editor)
    registerClearTweet(() => {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
      })
    })

    // return () => {
    //   if (id) {
    //     console.log('unregistering', id)
    //     unregisterEditor(id)
    //   }
    // }
  }, [editor, id, registerEditor, unregisterEditor])

  const { setContent } = useTweetContext()

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState, tags }) => {
      const content = editorState.read(() => $getRoot().getTextContent())

      setCharCount(content.length)
      setContent(content)

      if (tags.has('system-clear')) prevContent.current = ''
      if (tags.has('system-update')) prevContent.current = content

      if (content === prevContent.current) return

      hasPendingChanges.current = true
      queueSave({ id, content, editorState })

      prevContent.current = content
    })

    return () => unregister()
  }, [editor, id, potentialId, queueSave])

  const handlePostToTwitter = () => {
    const tweetText = editor.read(() => $getRoot().getTextContent())
    const encodedText = encodeURIComponent(tweetText)

    const sanitizedText = encodedText.endsWith('%0A')
      ? encodedText.slice(0, -3)
      : encodedText

    window.open(`https://twitter.com/intent/tweet?text=${sanitizedText}`, '_blank')
  }

  const getProgressColor = () => {
    const percentage = (charCount / 280) * 100
    if (percentage >= 100) return 'text-red-500'
    return 'text-blue-500'
  }

  const progress = Math.min((charCount / 280) * 100, 100)
  const circumference = 2 * Math.PI * 10
  const strokeDashoffset = circumference - (progress / 100) * circumference

  if (isLoadingTweet && id !== 'new') {
    return (
      <div className="relative bg-white p-6 rounded-2xl w-full border border-stone-200 bg-clip-padding shadow-sm">
        <div className="flex gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg">
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="w-px h-4 bg-stone-300 mx-2"></div>
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
                <div className="w-px h-4 bg-stone-300 mx-2"></div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>

              <Skeleton className="h-11 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

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

            {tweet?.image && (
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
            )}

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
              <ImageTool
                onClose={() => setImageDrawerOpen(false)}
                onSave={(image) => {
                  // editTweetImage(id, image)
                  setImageDrawerOpen(false)
                }}
                initialEditorState={tweet?.image?.editorState}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Drawer>
  )
}
