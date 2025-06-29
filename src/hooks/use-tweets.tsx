import { AdditionNode, DeletionNode, ReplacementNode, UnchangedNode } from '@/lib/nodes'
import { DiffWithReplacement } from '@/lib/utils'
import { InferOutput } from '@/server'
import { useQueryClient } from '@tanstack/react-query'
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  createEditor,
} from 'lexical'
import { nanoid } from 'nanoid'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

interface TweetImage {
  src: string
  originalSrc: string
  width: number
  height: number
  editorState: {
    blob: {
      src: string
      w?: number
      h?: number
    }
    canvasWidth: number
    canvasHeight: number
    outlineSize: number
    outlineColor: string
    options: {
      aspectRatio: string
      theme: string
      customTheme: {
        colorStart: string
        colorEnd: string
      }
      rounded: number
      roundedWrapper: string
      shadow: number
      noise: boolean
      browserBar: string
      screenshotScale: number
      rotation: number
      pattern: {
        enabled: boolean
        intensity: number
        rotation: number
        opacity: number
        type: 'waves' | 'dots' | 'stripes' | 'zigzag' | 'graphpaper' | 'none'
      }
      frame: 'none' | 'arc' | 'stack'
      outlineSize: number
      outlineColor: string
    }
  }
}

export type Tweet = InferOutput['tweet']['getTweet']['tweet'] & { image?: TweetImage }

interface Draft {
  id: string
  improvedText: string
  diffs: any[]
}

export const initialConfig = {
  namespace: `tweet-editor`,
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
  nodes: [DeletionNode, AdditionNode, UnchangedNode, ReplacementNode],
}

interface TweetContextType {
  // tweets: Tweet[]
  currentTweet: { id: string; content: string; image?: TweetImage; mediaIds: string[] }
  tweetId: string | null
  improvements: DiffWithReplacement[]
  drafts: Draft[]
  toolErrors: Record<string, string>
  shadowEditor: ReturnType<typeof createEditor>
  // setTweetId: (id: string) => void
  setTweetContent: (content: string) => void
  setTweetImage: (image: TweetImage) => void
  removeTweetImage: () => void
  listImprovements: (diffs: DiffWithReplacement[]) => void
  showImprovementsInEditor: (diffs: DiffWithReplacement[]) => void
  acceptImprovement: (
    acceptedDiff: DiffWithReplacement,
    diffs: DiffWithReplacement[],
  ) => void
  rejectImprovement: (
    rejectedDiff: DiffWithReplacement,
    diffs: DiffWithReplacement[],
  ) => void
  resetImprovements: () => void
  setCurrentTweet: React.Dispatch<React.SetStateAction<CurrentTweet>>
  setDrafts: (drafts: Draft[]) => void
  clearDrafts: () => void
  setToolError: (toolName: string, error: string) => void
  clearToolError: (toolName: string) => void
  draftCheckpoint: React.RefObject<string | null>
  selectedDraftIndex: number
  setSelectedDraftIndex: React.Dispatch<React.SetStateAction<number>>
}

const TweetContext = createContext<TweetContextType | undefined>(undefined)

export type CurrentTweet = {
  id: string
  content: string
  image?: TweetImage
  mediaIds: string[]
}

export function TweetProvider({ children }: PropsWithChildren) {
  const { tweetId } = useParams() as { tweetId: string | null }
  const queryClient = useQueryClient()
  const hasLoaded = useRef(false)

  // fallback after rejecting all drafts
  const draftCheckpoint = useRef<string | null>(null)

  const [currentTweet, setCurrentTweet] = useState<CurrentTweet>({
    id: nanoid(),
    content: '',
    mediaIds: [],
  })

  const shadowEditorRef = useRef(createEditor({ ...initialConfig }))
  const shadowEditor = shadowEditorRef.current

  const [improvements, setImprovements] = useState<DiffWithReplacement[]>([])

  const [drafts, setDrafts] = useState<Draft[]>([])
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0)

  const [toolErrors, setToolErrors] = useState<Record<string, string>>({})

  const resetImprovements = () => {
    setImprovements([])
  }

  const clearDrafts = () => {
    setDrafts([])
  }

  const setToolError = (toolName: string, error: string) => {
    setToolErrors((prev) => ({ ...prev, [toolName]: error }))
    // Clear drafts if the three_drafts tool failed
    if (toolName === 'three_drafts') {
      setDrafts([])
    }
  }

  const clearToolError = (toolName: string) => {
    setToolErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[toolName]
      return newErrors
    })
  }

  const setTweetContent = (content: string) => {
    setCurrentTweet((prev) => ({ ...prev, content }))
  }

  const setTweetImage = (image: TweetImage) => {
    setCurrentTweet((prev) => ({ ...prev, image }))
  }

  const removeTweetImage = () => {
    setCurrentTweet((prev) => ({ ...prev, image: undefined }))
  }

  // initial load
  useEffect(() => {
    if (!hasLoaded.current && currentTweet) {
      shadowEditor.update(
        () => {
          const root = $getRoot()
          const p = $createParagraphNode()
          const text = $createTextNode(currentTweet.content)
          p.append(text)
          root.clear()
          root.append(p)
        },
        { tag: 'system-update' },
      )
      hasLoaded.current = true
    }
  }, [currentTweet, shadowEditor])

  // show list of improvements in chat
  const listImprovements = async (diffs: DiffWithReplacement[]) => {
    setImprovements(diffs)
  }

  const showImprovementsInEditor = async (diffs: DiffWithReplacement[]) => {
    shadowEditor.update(
      () => {
        const p = $createParagraphNode()
        diffs.forEach((diff) => {
          if (diff.type === 2) {
            const node = new ReplacementNode(diff.replacement)

            p.append(node)
          } else if (diff.type === 1) {
            const node = new AdditionNode(diff.text)

            p.append(node)
          } else if (diff.type === 0) {
            const node = new UnchangedNode(diff.text)

            p.append(node)
          } else {
            const node = new DeletionNode(diff.text)

            p.append(node)
          }
        })

        const root = $getRoot()
        root.clear()

        root.append(p)
      },
      // prevent save
      { tag: 'force-sync' },
    )
  }

  const acceptImprovement = (
    acceptedDiff: DiffWithReplacement,
    diffs: DiffWithReplacement[],
  ) => {
    shadowEditor.update(
      () => {
        const root = $getRoot()
        const p = $createParagraphNode()

        diffs.forEach((diff) => {
          if (diff.id === acceptedDiff.id) {
            let text = ''
            if (diff.type === -1) {
              text = ''
            } else if (diff.type === 0) {
              text = diff.text
            } else if (diff.type === 1) {
              text = diff.text
            } else if (diff.type === 2) {
              text = diff.replacement ?? ''
            }

            const textNode = $createTextNode(text)
            p.append(textNode)
          } else {
            // preserve all other diffs
            if (diff.type === 2) {
              const node = new ReplacementNode(diff.replacement)

              p.append(node)
            } else if (diff.type === 1) {
              const node = new AdditionNode(diff.text)

              p.append(node)
            } else if (diff.type === 0) {
              const node = new UnchangedNode(diff.text)

              p.append(node)
            } else {
              const node = new DeletionNode(diff.text)

              p.append(node)
            }
          }
        })

        root.clear()
        root.append(p)
      },
      { tag: 'force-sync' },
    )

    setImprovements((prev) => prev.filter((d) => d.id !== acceptedDiff.id))
  }

  const rejectImprovement = (
    rejectedDiff: DiffWithReplacement,
    diffs: DiffWithReplacement[],
  ) => {
    console.log('diffing', { rejectedDiff, diffs })

    shadowEditor.update(
      () => {
        const root = $getRoot()
        const p = $createParagraphNode()

        diffs.forEach((diff) => {
          if (diff.id === rejectedDiff.id) {
            let text = ''
            if (diff.type === -1) {
              text = diff.text
            } else if (diff.type === 0) {
              text = diff.text
            } else if (diff.type === 1) {
              text = ''
            } else if (diff.type === 2) {
              text = diff.text
            }

            if (text) {
              const textNode = $createTextNode(text)
              p.append(textNode)
            }
          } else {
            // preserve all other diffs
            if(diff.rejected) {
              const node = $createTextNode(diff.text)

              p.append(node)
            } else if (diff.type === 2) {
              const node = new ReplacementNode(diff.replacement)

              p.append(node)
            } else if (diff.type === 1) {
              const node = new AdditionNode(diff.text)

              p.append(node)
            } else if (diff.type === 0) {
              const node = new UnchangedNode(diff.text)

              p.append(node)
            } else {
              const node = new DeletionNode(diff.text)

              p.append(node)
            }
          }
        })

        root.clear()
        root.append(p)
      },
      { tag: 'force-sync' },
    )

    setImprovements((prev) =>
      prev.map((improvement) => {
        if (improvement.id === rejectedDiff.id) {
          return { ...improvement, rejected: true }
        } else {
          return improvement
        }
      }),
    )
    // setImprovements((prev) => prev.filter((d) => d.id !== rejectedDiff.id))
  }

  /**
   * Saving logic
   */

  const saveInFlight = useRef(false)
  const hasPendingChanges = useRef(false)
  const prevSave = useRef('')
  const pendingSaves = useRef<Array<({ assignedId }: { assignedId: string }) => void>>([])
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // type SaveInput = InferInput['tweet']['save']
  // const { mutate } = useMutation({
  //   mutationFn: async ({ tweetId, content }: SaveInput) => {
  //     // prevent multiple saves at once
  //     saveInFlight.current = true

  //     console.log(
  //       '%c🔄 SAVING TWEET',
  //       'color: #3b82f6; font-weight: bold; font-size: 14px;',
  //       {
  //         tweetId,
  //         content,
  //         timestamp: new Date().toISOString(),
  //       },
  //     )

  //     const res = await client.tweet.save.$post({
  //       tweetId,
  //       content,
  //     })

  //     saveInFlight.current = false

  //     return await res.json()
  //   },
  //   onSuccess: ({ assignedId, tweet }) => {
  //     queryClient.setQueryData(['get-current-tweet', tweetId], tweet)
  //     // queryClient.refetchQueries({ queryKey: ['get-recent-tweets'] })

  //     if (tweet) prevSave.current = tweet.content
  //     processPendingSaves({ assignedId })

  //     // if (pathname === '/studio') {
  //     //   const chatId = searchParams.get('chatId')
  //     //   let push = `/studio/t/${assignedId}`
  //     //   if (chatId) push += `?chatId=${chatId}`

  //     //   router.push(push)
  //     // }
  //     // setDraft({ isVisible: false, content: '' })

  //     // if (tweetId === 'draft' || !tweetId) {
  //     //   setTweetId(assignedId)
  //     // }
  //   },
  // })

  // const debouncedSave = useCallback(
  //   debounce(({ tweetId, content }: SaveInput) => {
  //     hasPendingChanges.current = false
  //     if (saveInFlight.current === true) {
  //       pendingSaves.current.push(({ assignedId }) =>
  //         mutate({ tweetId: assignedId, content }),
  //       )
  //     } else {
  //       mutate({ tweetId, content })
  //     }
  //   }, 750),
  //   [mutate],
  // )

  // const queueSave = useCallback(
  //   ({ tweetId, content }: SaveInput) => {
  //     hasPendingChanges.current = true
  //     debouncedSave({ tweetId, content })
  //   },
  //   [debouncedSave],
  // )

  // const queueSave = useCallback(
  //   debounce(({ tweetId, content }: SaveInput) => {
  //     hasPendingChanges.current = false
  //     if (saveInFlight.current === true) {
  //       pendingSaves.current.push(({ assignedId }) =>
  //         mutate({ tweetId: assignedId, content }),
  //       )
  //     } else {
  //       mutate({ tweetId, content })
  //     }
  //   }, 750),
  //   [mutate],
  // )

  const processPendingSaves = ({ assignedId }: { assignedId: string }) => {
    if (pendingSaves.current.length > 0 && !saveInFlight.current) {
      const next = pendingSaves.current.shift()
      if (next) next({ assignedId })
    }
  }

  // prevent losing unsaved changes
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

  return (
    <TweetContext.Provider
      value={{
        // tweets,
        improvements,
        drafts,
        currentTweet,
        setCurrentTweet,
        tweetId,
        shadowEditor,
        // setTweetId,
        setTweetContent,
        setTweetImage,
        removeTweetImage,
        listImprovements,
        showImprovementsInEditor,
        acceptImprovement,
        rejectImprovement,
        resetImprovements,
        setDrafts,
        clearDrafts,
        draftCheckpoint,
        toolErrors,
        setToolError,
        clearToolError,
        selectedDraftIndex,
        setSelectedDraftIndex,
      }}
    >
      {children}
    </TweetContext.Provider>
  )
}

export function useTweets() {
  const context = useContext(TweetContext)
  if (context === undefined) {
    throw new Error('useTweets must be used within a TweetProvider')
  }
  return context
}
