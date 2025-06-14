import { client } from '@/lib/client'
import { AdditionNode, DeletionNode, ReplacementNode, UnchangedNode } from '@/lib/nodes'
import { DiffWithReplacement } from '@/lib/utils'
import { InferInput, InferOutput } from '@/server'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { $createParagraphNode, $createTextNode, $getNodeByKey, $getRoot } from 'lexical'
import debounce from 'lodash.debounce'
import { nanoid } from 'nanoid'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useEditor } from './use-editors'

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

interface TweetContextType {
  // tweets: Tweet[]
  currentTweet: { id: string; content: string; image?: TweetImage }
  tweetId: string | null
  improvements: DiffWithReplacement[]
  // setTweetId: (id: string) => void
  setTweetContent: (content: string) => void
  setTweetImage: (image: TweetImage) => void
  removeTweetImage: () => void
  listImprovements: (diffs: DiffWithReplacement[]) => void
  showImprovementsInEditor: (tweetId: string, diffs: DiffWithReplacement[]) => void
  acceptImprovement: (diff: DiffWithReplacement, opts?: { isInitial: boolean }) => void
  rejectImprovement: (diff: DiffWithReplacement) => void
  queuedImprovements: Record<string, DiffWithReplacement[]>
  setQueuedImprovements: React.Dispatch<
    React.SetStateAction<Record<string, DiffWithReplacement[]>>
  >
  resetImprovements: () => void
}

const TweetContext = createContext<TweetContextType | undefined>(undefined)

export function TweetProvider({ children }: PropsWithChildren) {
  const { tweetId } = useParams() as { tweetId: string | null }
  const queryClient = useQueryClient()
  const hasLoaded = useRef(false)

  const editor = useEditor('tweet-editor')
  const [improvements, setImprovements] = useState<DiffWithReplacement[]>([])
  const [queuedImprovements, setQueuedImprovements] = useState<
    Record<string, DiffWithReplacement[]>
  >({})

  const resetImprovements = () => {
    setImprovements([])
  }

  const improvementKeys = useRef(new Map<string, string>())

  const [currentTweet, setCurrentTweet] = useState<{
    id: string
    content: string
    image?: TweetImage
  }>({ id: nanoid(), content: '' })

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
      editor?.update(
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
  }, [currentTweet, editor])

  // show list of improvements in chat
  const listImprovements = async (diffs: DiffWithReplacement[]) => {
    setImprovements(diffs)
  }

  const showImprovementsInEditor = async (
    tweetId: string,
    diffs: DiffWithReplacement[],
  ) => {
    editor?.update(
      () => {
        const p = $createParagraphNode()
        diffs.forEach((diff) => {
          if (diff.type === 2) {
            const node = new ReplacementNode(diff.replacement)
            const key = node.getKey()

            improvementKeys.current.set(diff.id, key)

            p.append(node)
          } else if (diff.type === 1) {
            const node = new AdditionNode(diff.text)
            const key = node.getKey()

            improvementKeys.current.set(diff.id, key)

            p.append(node)
          } else if (diff.type === 0) {
            const node = new UnchangedNode(diff.text)

            p.append(node)
          } else {
            const node = new DeletionNode(diff.text)
            const key = node.getKey()

            improvementKeys.current.set(diff.id, key)

            p.append(node)
          }
        })

        const root = $getRoot()
        root.clear()

        root.append(p)
      },
      // prevent save
      { tag: 'system-update' },
    )
  }

  const acceptImprovement = (
    diff: DiffWithReplacement,
    opts?: { isInitial: boolean },
  ) => {
    // apply initial suggestion directly
    if (opts?.isInitial) {
      if (!editor) console.warn('no editor')
      console.log('editor', editor)

      editor?.update(() => {
        const root = $getRoot()
        const p = $createParagraphNode()
        const text = $createTextNode(diff.text)

        p.append(text)

        root.append(p)
      })
    } else {
      const improvement = improvements?.find((d) => d.id === diff.id)
      if (!improvement) return console.warn('no improvement')

      const key = improvementKeys.current.get(diff.id)
      if (!key) return console.warn('no key')

      editor?.update(
        () => {
          const node = $getNodeByKey(key)

          if (node instanceof DeletionNode) {
            node.remove()
          } else if (node instanceof AdditionNode) {
            const textNode = $createTextNode(node.getTextContent())
            node.replace(textNode)
          } else if (node instanceof ReplacementNode) {
            const textNode = $createTextNode(diff.replacement)
            node.replace(textNode)
          }
        },
        { tag: 'accept-improvement' },
      )
    }

    const content = editor?.read(() => $getRoot().getTextContent())

    // save improvement
    // if (typeof content === 'string') {
    //   queueSave({ tweetId: diff.tweetId, content })
    // }

    // cleanup
    improvementKeys.current.delete(diff.id)
    setImprovements((prev) => prev.filter((d) => d.id !== diff.id))
  }

  const rejectImprovement = (diff: DiffWithReplacement) => {
    const key = improvementKeys.current.get(diff.id)
    if (!key) return

    editor?.update(() => {
      const node = $getNodeByKey(key)

      if (node instanceof DeletionNode) {
        const textNode = $createTextNode(node.getTextContent())
        node.replace(textNode)
      } else if (node instanceof AdditionNode) {
        node.remove()
      } else if (node instanceof ReplacementNode) {
        const textNode = $createTextNode(diff.text)
        node.replace(textNode)
      }
    })

    improvementKeys.current.delete(diff.id)
    setImprovements((prev) => prev.filter((i) => i.id !== diff.id))
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

  type SaveInput = InferInput['tweet']['save']
  const { mutate } = useMutation({
    mutationFn: async ({ tweetId, content }: SaveInput) => {
      // prevent multiple saves at once
      saveInFlight.current = true

      console.log(
        '%c🔄 SAVING TWEET',
        'color: #3b82f6; font-weight: bold; font-size: 14px;',
        {
          tweetId,
          content,
          timestamp: new Date().toISOString(),
        },
      )

      const res = await client.tweet.save.$post({
        tweetId,
        content,
      })

      saveInFlight.current = false

      return await res.json()
    },
    onSuccess: ({ assignedId, tweet }) => {
      queryClient.setQueryData(['get-current-tweet', tweetId], tweet)
      // queryClient.refetchQueries({ queryKey: ['get-recent-tweets'] })

      if (tweet) prevSave.current = tweet.content
      processPendingSaves({ assignedId })

      // if (pathname === '/studio') {
      //   const chatId = searchParams.get('chatId')
      //   let push = `/studio/t/${assignedId}`
      //   if (chatId) push += `?chatId=${chatId}`

      //   router.push(push)
      // }
      // setDraft({ isVisible: false, content: '' })

      // if (tweetId === 'draft' || !tweetId) {
      //   setTweetId(assignedId)
      // }
    },
  })

  const debouncedSave = useCallback(
    debounce(({ tweetId, content }: SaveInput) => {
      hasPendingChanges.current = false
      if (saveInFlight.current === true) {
        pendingSaves.current.push(({ assignedId }) =>
          mutate({ tweetId: assignedId, content }),
        )
      } else {
        mutate({ tweetId, content })
      }
    }, 750),
    [mutate],
  )

  const queueSave = useCallback(
    ({ tweetId, content }: SaveInput) => {
      hasPendingChanges.current = true
      debouncedSave({ tweetId, content })
    },
    [debouncedSave],
  )

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
        currentTweet,
        tweetId,
        // setTweetId,
        setTweetContent,
        setTweetImage,
        removeTweetImage,
        listImprovements,
        showImprovementsInEditor,
        acceptImprovement,
        rejectImprovement,
        queuedImprovements,
        setQueuedImprovements,
        resetImprovements,
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
