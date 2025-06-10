import { AdditionNode, DeletionNode, ReplacementNode, UnchangedNode } from '@/lib/nodes'
import { DiffWithReplacement } from '@/lib/utils'
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  LexicalEditor,
} from 'lexical'
import { nanoid } from 'nanoid'
import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'

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

interface Tweet {
  id: string
  content: string
  suggestion: null | string
  improvements: {
    [category: string]: DiffWithReplacement[] | undefined
  }
  image?: TweetImage
}

interface TweetContextType {
  tweet: Tweet
  addImprovements: (
    id: string,
    diffs: DiffWithReplacement[],
    editor?: LexicalEditor,
  ) => void
  queueImprovements: (tweetId: string, diffs: DiffWithReplacement[]) => void
  queuedImprovements: Record<string, DiffWithReplacement[]>
  updateTweet: (content: string) => void
  registerEditor: (tweetId: string, lexicalEditor: LexicalEditor) => void
  unregisterEditor: (id: string) => void
  createTweet: (id?: string) => void
  waitForEditor: (id: string, callback: () => void) => void
  acceptImprovement: (id: string, diff: DiffWithReplacement) => void
  rejectImprovement: (id: string, diff: DiffWithReplacement) => void
  downloadTweetImage: (id: string) => void
  rejectAllImprovements: () => void
  clearTweet: () => void
  potentialId: string
  refreshPotentialId: () => void
  mutationReset: () => void
  registerMutationReset: (reset: () => void) => void
  contentRef: React.RefObject<string>
  setContent: (content: string) => void
}

const TweetContext = createContext<TweetContextType | undefined>(undefined)

const initialTweet: Tweet = {
  id: nanoid(),
  content: '',
  improvements: {},
  suggestion: null,
}

export function TweetProvider({ children }: { children: React.ReactNode }) {
  const contentRef = useRef<string>('')
  const setContent = (content: string) => {
    contentRef.current = content
  }
  const { id: tweetId } = useParams()
  const navigate = useNavigate()

  const [tweet, setTweet] = useState<Tweet>(initialTweet)

  console.log('tweet is', tweet)

  const improvements = useRef(new Map<string, string>()) // diffId, lexicalKey
  const [queuedImprovements, setQueuedImprovements] = useState<
    Record<string, DiffWithReplacement[]>
  >({})

  const editor = useRef<LexicalEditor | null>(null)
  const editors = useRef(new Map<string, LexicalEditor>()) // tweetId, editor

  const [potentialId, setPotentialId] = useState(nanoid())

  const refreshPotentialId = () => {
    const newId = nanoid()
    setPotentialId(newId)
  }

  const mutationReset = useRef(() => {})

  const registerMutationReset = (reset: () => void) => {
    mutationReset.current = reset
  }

  const updateTweet = useCallback((content: string) => {
    if (editor.current) {
      editor.current.update(() => {
        const root = $getRoot()
        root.clear()
        const textNode = $createTextNode(content)
        const p = $createParagraphNode()
        p.append(textNode)
        root.append(p)
      })
    }

    setTweet((prev) => ({ ...prev, content }))
  }, [])

  const acceptImprovement = useCallback(
    async (id: string, diff: DiffWithReplacement) => {
      const lexical = editors.current.get(diff.tweetId)
      if (!lexical) return console.warn('noe ditor')

      const category = diff.category

      const improvement = tweet.improvements?.[category]?.find(
        // TODO: fix this
        (d) => d.id === diff.id,
      )
      if (!improvement) return console.warn('noe improvement')

      const key = improvements.current.get(diff.id)
      if (!key) return console.warn('no key')

      console.log('APPLYING CHANGES')
      lexical.update(() => {
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
      })

      console.log('editor updated')

      improvements.current.delete(diff.id)

      // Remove the accepted improvement from the tweet's improvements array
      setTweet((prev) => ({
        ...prev,
        improvements: {
          ...prev.improvements,
          [category]: prev.improvements?.[category]?.filter((d) => d.id !== diff.id),
        },
      }))
    },
    [tweet],
  )

  const rejectImprovement = (id: string, diff: DiffWithReplacement) => {
    if (!editor.current) return

    // Find the improvement in any category
    const category = diff.category
    const improvement = tweet.improvements?.[category]?.find(
      // TODO: fix this
      (d) => d.id === diff.id,
    )
    if (!improvement) return

    const key = improvements.current.get(diff.id)
    if (!key) return

    editor.current.update(() => {
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

    improvements.current.delete(diff.id)

    setTweet((prev) => ({
      ...prev,
      improvements: {
        ...prev.improvements,
        [category]: prev.improvements?.[category]?.filter((d) => d.id !== diff.id),
      },
    }))
  }

  const queueImprovements = (tweetId: string, diffs: DiffWithReplacement[]) => {
    setQueuedImprovements((prev) => ({
      ...prev,
      [tweetId]: diffs,
    }))

    // Group improvements by category
    const improvementsByCategory = diffs.reduce<Record<string, DiffWithReplacement[]>>(
      (acc, diff) => {
        const category = diff.category
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(diff)
        return acc
      },
      {},
    )

    setTweet((prev) => ({
      ...prev,
      improvements: {
        ...prev.improvements,
        ...improvementsByCategory,
      },
    }))
  }

  const addImprovements = (
    tweetId: string,
    diffs: DiffWithReplacement[],
    lexical?: LexicalEditor,
  ) => {
    const lexicalEditor = editors.current.get(tweetId) ?? lexical ?? editor.current

    console.log('should add:', tweetId, diffs)

    if (!lexicalEditor) {
      console.warn('no eitor')
      return
    }

    if (typeof tweet.content === 'undefined') {
      console.warn('no tweet content')
      return
    }

    lexicalEditor.update(
      () => {
        const p = $createParagraphNode()
        diffs.forEach((diff) => {
          if (diff.type === 2) {
            const node = new ReplacementNode(diff.replacement)
            const key = node.getKey()

            improvements.current.set(diff.id, key)

            p.append(node)
          } else if (diff.type === 1) {
            const node = new AdditionNode(diff.text)
            const key = node.getKey()

            improvements.current.set(diff.id, key)

            p.append(node)
          } else if (diff.type === 0) {
            const node = new UnchangedNode(diff.text)
            const key = node.getKey()

            improvements.current.set(diff.id, key)

            p.append(node)
          } else {
            const node = new DeletionNode(diff.text)
            const key = node.getKey()

            improvements.current.set(diff.id, key)

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

    setQueuedImprovements((prev) => {
      const { [tweetId]: _, ...rest } = prev
      return rest
    })

    // Group improvements by category
    const improvementsByCategory = diffs.reduce<Record<string, DiffWithReplacement[]>>(
      (acc, diff) => {
        const category = diff.category
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(diff)
        return acc
      },
      {},
    )

    console.log('improvements by cat', improvementsByCategory)

    setTweet((prev) => ({
      ...prev,
      improvements: {
        ...prev.improvements,
        ...improvementsByCategory,
      },
    }))
  }

  const registerEditor = useCallback((tweetId: string, lexicalEditor: LexicalEditor) => {
    editor.current = lexicalEditor
    editors.current.set(tweetId, lexicalEditor)
  }, [])

  const unregisterEditor = useCallback(() => {
    editor.current = null
  }, [])

  const createTweet = useCallback((id?: string) => {
    const newTweet: Tweet = {
      id: id || Date.now().toString(),
      content: '',
      improvements: {},
      suggestion: null,
    }
    setTweet(newTweet)
  }, [])

  const waitForEditor = useCallback((id: string, callback: () => void) => {
    const interval = setInterval(() => {
      if (editor.current) {
        clearInterval(interval)
        callback()
      }
    }, 50)
  }, [])

  // const setTweetImage = useCallback(
  //   (
  //     id: string,
  //     image: {
  //       src: string
  //       width: number
  //       height: number
  //       editorState: TweetImage["editorState"]
  //     }
  //   ) => {
  //     setTweet((prev) => ({
  //       ...prev,
  //       image: {
  //         src: image.src,
  //         originalSrc: image.editorState.blob.src,
  //         width: image.width,
  //         height: image.height,
  //         editorState: image.editorState,
  //       },
  //     }))

  //     const editorState = editor.current?.getEditorState().toJSON()

  //     const tweetImage: TweetImage = {
  //       src: image.src,
  //       originalSrc: image.editorState.blob.src,
  //       width: image.width,
  //       height: image.height,
  //       editorState: image.editorState,
  //     }

  //     debouncedSave(id, tweet.content, editorState, tweetImage)
  //   },
  //   [debouncedSave]
  // )

  // const removeTweetImage = useCallback(
  //   (id: string) => {
  //     setTweet((prev) => ({
  //       ...prev,
  //       image: undefined,
  //     }))

  //     const editorState = editor.current?.getEditorState().toJSON()

  //     debouncedSave(id, tweet.content, editorState)
  //   },
  //   [debouncedSave]
  // )

  // const editTweetImage = useCallback(
  //   (
  //     id: string,
  //     image: {
  //       src: string
  //       width: number
  //       height: number
  //       editorState: TweetImage["editorState"]
  //     }
  //   ) => {
  //     setTweet((prev) => ({
  //       ...prev,
  //       image: {
  //         src: image.src,
  //         originalSrc: tweet.image?.originalSrc || image.editorState.blob.src,
  //         width: image.width,
  //         height: image.height,
  //         editorState: image.editorState,
  //       },
  //     }))

  //     const editorState = editor.current?.getEditorState().toJSON()

  //     const tweetImage: TweetImage = {
  //       src: image.src,
  //       originalSrc: tweet.image?.originalSrc || image.editorState.blob.src,
  //       width: image.width,
  //       height: image.height,
  //       editorState: image.editorState,
  //     }

  //     debouncedSave(id, tweet.content, editorState, tweetImage)
  //   },
  //   [debouncedSave]
  // )

  const downloadTweetImage = useCallback((id: string) => {
    if (!tweet.image) return

    const a = document.createElement('a')
    a.href = tweet.image.src
    a.download = `tweet-image-${id}-${new Date().toISOString()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  // TODO: doesnt work
  const rejectAllImprovements = useCallback(() => {
    if (!editor.current) return

    editor.current.update(() => {
      const root = $getRoot()
      root.clear()
      const textNode = $createTextNode(tweet.content)
      const p = $createParagraphNode()
      p.append(textNode)
      root.append(p)
    })

    Object.values(tweet.improvements).forEach((category) => {
      category?.forEach((diff) => {
        improvements.current.delete(diff.id)
      })
    })

    setTweet((prev) => ({
      ...prev,
      improvements: {},
    }))
  }, [tweet])

  const clearTweet = useCallback(() => {
    editor.current?.update(
      () => {
        const root = $getRoot()
        root.clear()
      },
      { tag: 'system-clear' },
    )

    improvements.current.clear()
    setTweet(initialTweet)
  }, [])

  return (
    <TweetContext.Provider
      value={{
        contentRef,
        setContent,
        tweet,
        addImprovements,
        queueImprovements,
        queuedImprovements,
        acceptImprovement,
        rejectImprovement,
        updateTweet,
        registerEditor,
        unregisterEditor,
        createTweet,
        waitForEditor,
        // setTweetImage,
        downloadTweetImage,
        rejectAllImprovements,
        clearTweet,
        potentialId: potentialId,
        refreshPotentialId,
        mutationReset: () => mutationReset.current(),
        registerMutationReset,
      }}
    >
      {children}
    </TweetContext.Provider>
  )
}

export function useTweetContext() {
  const context = useContext(TweetContext)
  if (context === undefined) {
    throw new Error('useTweetContext must be used within a TweetProvider')
  }
  return context
}
