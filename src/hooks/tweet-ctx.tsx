import {
  AdditionNode,
  DeletionNode,
  ReplacementNode,
  UnchangedNode,
} from "@/lib/nodes"
import { DiffWithReplacement } from "@/lib/utils"
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  LexicalEditor,
} from "lexical"
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react"
import toast from "react-hot-toast"

type DiffType = -1 | 0 | 1

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
        type: "waves" | "dots" | "stripes" | "zigzag" | "graphpaper" | "none"
      }
      frame: "none" | "arc" | "stack"
      outlineSize: number
      outlineColor: string
    }
  }
}

interface Tweet {
  id: string
  suggestion: null | string
  improvements: {
    [category: string]: DiffWithReplacement[] | undefined
  }
  image?: TweetImage
}

// type ImprovementOutput = InferOutput["improvement"]["clarity"]
// type ImprovementInput = InferInput["improvement"]["clarity"]

interface TweetContextType {
  tweets: Tweet[]
  addImprovements: (id: string, diffs: DiffWithReplacement[]) => void
  addSuggestion: (id: string, suggestion: string) => void
  acceptSuggestion: (id: string, suggestion: string) => void
  rejectSuggestion: (id: string) => void
  addTweet: (tweet: Tweet) => void
  updateTweet: (id: string, content: string) => void
  deleteTweet: (id: string) => void
  registerEditor: (id: string, editor: LexicalEditor) => void
  unregisterEditor: (id: string) => void
  createTweet: (id?: string) => void
  waitForEditor: (id: string, callback: () => void) => void
  editors: React.MutableRefObject<Map<string, LexicalEditor>>
  acceptImprovement: (id: string, diff: DiffWithReplacement) => void
  rejectImprovement: (id: string, diff: DiffWithReplacement) => void
  setTweetImage: (id: string, image: { 
    src: string
    width: number
    height: number
    editorState: TweetImage["editorState"]
  }) => void
  removeTweetImage: (id: string) => void
  editTweetImage: (id: string, image: { 
    src: string
    width: number
    height: number
    editorState: TweetImage["editorState"]
  }) => void
  downloadTweetImage: (id: string) => void
  rejectAllImprovements: () => void
  contents: React.RefObject<Map<string, string>>
}

const TweetContext = createContext<TweetContextType | undefined>(undefined)

const initialTweet: Tweet = {
  id: "initial-tweet",
  improvements: {},
  suggestion: null,
}

export function TweetProvider({ children }: { children: React.ReactNode }) {
  const [tweets, setTweets] = useState<Tweet[]>([initialTweet])
  const editors = useRef<Map<string, LexicalEditor>>(new Map())
  const contents = useRef<Map<string, string>>(new Map())
  const checkpoints = useRef<Map<string, string>>(new Map())

  const addSuggestion = (id: string, suggestion: string) => {
    setTweets((prev) =>
      prev.map((tweet) => (tweet.id === id ? { ...tweet, suggestion } : tweet))
    )
  }

  const rejectSuggestion = (id: string) => {
    const editor = editors.current.get(id)
    if (!editor) return

    const checkpoint = checkpoints.current.get(id)

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const textNode = $createTextNode(checkpoint)
      const p = $createParagraphNode()
      p.append(textNode)
      root.append(p)
    })

    checkpoints.current.delete(id)

    setTweets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              suggestion: null,
            }
          : t
      )
    )
  }

  const acceptSuggestion = (id: string, suggestion: string) => {
    const editor = editors.current.get(id)
    if (!editor) return

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      const textNode = $createTextNode(suggestion)
      const p = $createParagraphNode()
      p.append(textNode)
      root.append(p)
    })

    setTweets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              content: suggestion,
              suggestion: null,
            }
          : t
      )
    )
  }

  const addTweet = useCallback((tweet: Tweet) => {
    setTweets((prev) => [...prev, tweet])
  }, [])

  const updateTweet = useCallback((id: string, content: string) => {
    const editor = editors.current.get(id)
    
    if (editor) {
      editor.update(() => {
        const root = $getRoot()
        root.clear()
        const textNode = $createTextNode(content)
        const p = $createParagraphNode()
        p.append(textNode)
        root.append(p)
      })
    }
    
    setTweets((prev) =>
      prev.map((tweet) => (tweet.id === id ? { ...tweet, content } : tweet))
    )
  }, [])

  const deleteTweet = useCallback((id: string) => {
    setTweets((prev) => prev.filter((tweet) => tweet.id !== id))
  }, [])

  // const getDiff = useCallback((original: string, improved: string) => {
  //   const diffs = dmp.diff_main(original, improved)
  //   dmp.diff_cleanupSemantic(diffs)

  //   return diffs.map(([type, text], index): DiffWithReplacement => {
  //     return {
  //       id: `diff-${index}`,
  //       type: type as DiffType,
  //       text,
  //     }
  //   })
  // }, [])

  const improvements = useRef(new Map<string, string>()) // diffId, lexicalKey

  const acceptImprovement = useCallback(
    (id: string, diff: DiffWithReplacement) => {
      const tweet = tweets.find((t) => t.id === id)
      if (!tweet) return

      const editor = editors.current.get(id)
      if (!editor) return

      // Find the improvement in any category
      const category = diff.category
      const improvement = tweet.improvements?.[category]?.find(
        (d) => d.id === diff.id
      )
      if (!improvement) return

      const key = improvements.current.get(diff.id)
      if (!key) return

      editor.update(() => {
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

      improvements.current.delete(diff.id)

      // Remove the accepted improvement from the tweet's improvements array
      setTweets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                improvements: {
                  ...t.improvements,
                  [category]: t.improvements?.[category]?.filter(
                    (d) => d.id !== diff.id
                  ),
                },
              }
            : t
        )
      )
    },
    [tweets, editors]
  )

  const rejectImprovement = (id: string, diff: DiffWithReplacement) => {
    const tweet = tweets.find((t) => t.id === id)
    if (!tweet) return

    const editor = editors.current.get(id)
    if (!editor) return

    // Find the improvement in any category
    const category = diff.category
    const improvement = tweet.improvements?.[category]?.find(
      (d) => d.id === diff.id
    )
    if (!improvement) return

    const key = improvements.current.get(diff.id)
    if (!key) return

    editor.update(() => {
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

    setTweets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              improvements: {
                ...t.improvements,
                [category]: t.improvements?.[category]?.filter(
                  (d) => d.id !== diff.id
                ),
              },
            }
          : t
      )
    )
  }

  const addImprovements = (id: string, diffs: DiffWithReplacement[]) => {
    const editor = editors.current.get(id)
    const content = contents.current.get(id)

    if (!editor) return
    if (typeof content === "undefined") return

    checkpoints.current.set(id, content)

    editor.update(() => {
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
    })

    // Group improvements by category
    const improvementsByCategory = diffs.reduce<
      Record<string, DiffWithReplacement[]>
    >((acc, diff) => {
      const category = diff.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(diff)
      return acc
    }, {})

    setTweets((prev) => {
      return prev.map((tweet) => {
        if (tweet.id !== id) return tweet

        return {
          ...tweet,
          improvements: {
            ...tweet.improvements,
            ...improvementsByCategory,
          },
        }
      })
    })
  }

  // const improvementsMutation = useMutation({
  //   mutationFn: async () => {
  //     const payload = tweets.map((tweet) => {
  //       const content = contents.current.get(tweet.id) as string
  //       checkpoints.current.set(tweet.id, content)
  //       return { ...tweet, content }
  //     })
  //     const res = await client.improvement.clarity.$post({ tweets: payload })
  //     return await res.json()
  //   },
  //   onSuccess: (data) => {
  //     tweets.forEach((tweet) => {
  //       const result = data.results.find((r) => r.id === tweet.id)
  //       const content = contents.current.get(tweet.id) as string

  //       if (result && result.improvedText !== content) {
  //         addImprovements(tweet.id, result.diffs)
  //       }
  //     })

  //     setTweets((prev) => {
  //       return prev.map((tweet) => {
  //         const result = data.results.find((r) => r.id === tweet.id)
  //         if (!result) return tweet

  //         return {
  //           ...tweet,
  //           suggestion: result.improvedText,
  //         }
  //       })
  //     })
  //   },
  // })

  // const getImprovements = useCallback(async () => {
  //   const tweets = getTweets()

  //   try {

  //   } catch (error) {
  //     console.error("Failed to get improvements:", error)
  //   }
  // }, [tweets])

  const registerEditor = useCallback((id: string, editor: LexicalEditor) => {
    editors.current.set(id, editor)
  }, [])

  const unregisterEditor = useCallback((id: string) => {
    editors.current.delete(id)
  }, [])

  const createTweet = useCallback((id?: string) => {
    const newTweet: Tweet = {
      id: id || Date.now().toString(),
      improvements: {},
      suggestion: null,
    }
    setTweets((prev) => [...prev, newTweet])
  }, [])

  const waitForEditor = useCallback((id: string, callback: () => void) => {
    const interval = setInterval(() => {
      if (editors.current.has(id)) {
        clearInterval(interval)
        callback()
      }
    }, 50)
  }, [])

  const setTweetImage = useCallback((id: string, image: { 
    src: string
    width: number
    height: number
    editorState: TweetImage["editorState"]
  }) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === id
          ? {
              ...tweet,
              image: {
                src: image.src,
                originalSrc: image.editorState.blob.src,
                width: image.width,
                height: image.height,
                editorState: image.editorState
              },
            }
          : tweet
      )
    )
  }, [])

  const removeTweetImage = useCallback((id: string) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === id
          ? {
              ...tweet,
              image: undefined,
            }
          : tweet
      )
    )
  }, [])

  const editTweetImage = useCallback((id: string, image: { 
    src: string
    width: number
    height: number
    editorState: TweetImage["editorState"]
  }) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === id
          ? {
              ...tweet,
              image: {
                src: image.src,
                originalSrc: tweet.image?.originalSrc || image.editorState.blob.src,
                width: image.width,
                height: image.height,
                editorState: image.editorState
              },
            }
          : tweet
      )
    )
  }, [])

  const downloadTweetImage = useCallback((id: string) => {
    const tweet = tweets.find((t) => t.id === id)
    if (!tweet?.image) return

    const a = document.createElement("a")
    a.href = tweet.image.src
    a.download = `tweet-image-${id}-${new Date().toISOString()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [tweets])

  // TODO: doesnt work
  const rejectAllImprovements = useCallback(() => {
    tweets.forEach(tweet => {
      const id = tweet.id
      const editor = editors.current.get(id)
      const checkpoint = checkpoints.current.get(id)
      
      if (editor && checkpoint) {
        editor.update(() => {
          const root = $getRoot()
          root.clear()
          const textNode = $createTextNode(checkpoint)
          const p = $createParagraphNode()
          p.append(textNode)
          root.append(p)
        })
      }
      
      Object.values(tweet.improvements).forEach(category => {
        category?.forEach(diff => {
          improvements.current.delete(diff.id)
        })
      })
      
      checkpoints.current.delete(id)
    })

    setTweets(prev => 
      prev.map(tweet => ({
        ...tweet,
        improvements: {}
      }))
    )
  }, [tweets])

  return (
    <TweetContext.Provider
      value={{
        tweets,
        addImprovements,
        acceptImprovement,
        rejectImprovement,
        addSuggestion,
        rejectSuggestion,
        acceptSuggestion,
        addTweet,
        updateTweet,
        deleteTweet,
        registerEditor,
        unregisterEditor,
        createTweet,
        waitForEditor,
        editors,
        contents,
        setTweetImage,
        removeTweetImage,
        editTweetImage,
        downloadTweetImage,
        rejectAllImprovements,
      }}
    >
      {children}
    </TweetContext.Provider>
  )
}

export function useTweetContext() {
  const context = useContext(TweetContext)
  if (context === undefined) {
    throw new Error("useTweetContext must be used within a TweetProvider")
  }
  return context
}
