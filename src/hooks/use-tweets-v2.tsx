import { MentionNode, MentionNode2 } from '@/lib/nodes'
import { TweetWithMedia } from '@/server/routers/tweet/fetch-media-from-s3'
import { AutoLinkNode } from '@lexical/link'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  LexicalEditor,
} from 'lexical'
import { nanoid } from 'nanoid'
import { createContext, useContext, useRef, useState } from 'react'

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
  nodes: [MentionNode, MentionNode2, AutoLinkNode],
}

export interface MediaFile {
  id: string
  file: File | null
  url: string
  type: 'image' | 'gif' | 'video'
  uploading: boolean
  uploaded: boolean
  error?: string
  media_id?: string
  media_key?: string
  s3Key?: string
}

type TweetContextType = {
  tweets: MemoryTweet[]
  setTweets: React.Dispatch<React.SetStateAction<MemoryTweet[]>>

  // tweets
  updateTweet: (tweetId: string, content: string) => void
  addTweet: ({
    initialContent,
    index,
  }: {
    initialContent?: string
    index?: number
  }) => void
  removeTweet: (tweetId: string) => void

  // media files
  addMediaFile: (tweetId: string, file: Omit<MediaFile, 'id'>) => void
  updateMediaFile: (tweetId: string, mediaId: string, file: Partial<MediaFile>) => void
  removeMediaFile: (tweetId: string, mediaId: string) => void
  clearMediaFiles: (tweetId: string) => void

  // preview links
  setPreviewLinks: (
    tweetId: string,
    changes: {
      url: string
      dismissed: boolean
    }[],
  ) => void

  // utils
  downloadMediaFile: (mediaFile: MediaFile) => void
  toPayloadTweet: (tweet: MemoryTweet) => PayloadTweet
  toPayloadTweets: () => PayloadTweet[]
  reset: () => void
  loadThread: (thread: TweetWithMedia[]) => void
}

const TweetContext = createContext<TweetContextType | null>(null)

export interface LinkPreview {
  url: string
  dismissed: boolean
}

export type MemoryTweet = {
  id: string
  mediaFiles: MediaFile[]
  editor: LexicalEditor | undefined
  previewLinks: LinkPreview[]
}

export type PayloadTweet = {
  id: string
  index: number
  content: string
  media: Array<{
    media_id: string
    s3Key: string
  }>
  // mediaFiles: MediaFile[]
}

export const TweetV2Provider = ({ children }: { children: React.ReactNode }) => {
  const initialTweetId = useRef(nanoid())

  const shadowEditors = useRef<Record<string, LexicalEditor>>({
    [initialTweetId.current]: createEditor(initialConfig),
  })

  // const shadowEditors = useRef<Array<{ editor: LexicalEditor; tweetId: string }>>([
  //   {
  //     tweetId: initialTweetId.current,
  //     editor: createEditor(initialConfig),
  //   },
  // ])

  const [tweets, setTweets] = useState<MemoryTweet[]>([
    {
      id: initialTweetId.current,
      mediaFiles: [],
      editor: shadowEditors.current[initialTweetId.current],
      previewLinks: [],
    },
  ])

  /**
   * TWEETS
   */
  const updateTweet = (tweetId: string, content: string) => {
    const editor = shadowEditors.current[tweetId]

    if (!editor) return

    editor.update(
      () => {
        const root = $getRoot()
        root.clear()

        const paragraph = $createParagraphNode()
        paragraph.append($createTextNode(content))
        root.append(paragraph)
      },
      { tag: 'force-sync' },
    )
  }

  const addTweet = async ({
    initialContent,
    index,
  }: { initialContent?: string; index?: number } = {}) => {
    const newTweetId = nanoid()
    const shadowEditor = createEditor(initialConfig)

    shadowEditors.current = {
      ...shadowEditors.current,
      [newTweetId]: shadowEditor,
    }

    if (initialContent) {
      await new Promise<void>((resolve) => {
        shadowEditor.update(
          () => {
            const root = $getRoot()
            const paragraph = $createParagraphNode()
            paragraph.append($createTextNode(initialContent))
            root.append(paragraph)
          },
          { onUpdate: resolve, tag: 'force-sync' },
        )
      })
    }

    setTweets((prev) => [
      ...prev,
      {
        id: newTweetId,
        mediaFiles: [],
        editor: shadowEditors.current[newTweetId],
        previewLinks: [],
      },
    ])
  }

  const removeTweet = (tweetId: string) => {
    setTweets((prev) => prev.filter((tweet) => tweet.id !== tweetId))

    const newShadowEditors = { ...shadowEditors.current }
    delete newShadowEditors[tweetId]
    shadowEditors.current = newShadowEditors
  }

  /**
   * MEDIA
   */
  const addMediaFile = (
    tweetId: string,
    file: Partial<Pick<MediaFile, 'id'>> & Omit<MediaFile, 'id'>,
  ) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              mediaFiles: [...tweet.mediaFiles, { ...file, id: file.id || nanoid() }],
            }
          : tweet,
      ),
    )
  }

  const updateMediaFile = (
    tweetId: string,
    mediaId: string,
    file: Partial<MediaFile>,
  ) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              mediaFiles: tweet.mediaFiles.map((f) =>
                f.id === mediaId ? { ...f, ...file } : f,
              ),
            }
          : tweet,
      ),
    )
  }

  const removeMediaFile = (tweetId: string, mediaId: string) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === tweetId
          ? { ...tweet, mediaFiles: tweet.mediaFiles.filter((f) => f.id !== mediaId) }
          : tweet,
      ),
    )
  }

  const clearMediaFiles = (tweetId: string) => {
    setTweets((prev) =>
      prev.map((tweet) => (tweet.id === tweetId ? { ...tweet, mediaFiles: [] } : tweet)),
    )
  }

  /**
   * PREVIEW LINKS
   */
  const setPreviewLinks = (
    tweetId: string,
    changes: { url: string; dismissed: boolean }[],
  ) => {
    // const previewLinks = changes.map(({ url, action }) => {
    //   // const dismissed = Boolean(
    //   //   tweets.find((t) =>
    //   //     t.previewLinks.some((l) => l.url === previousUrl && !l.dismissed),
    //   //   ),
    //   // )

    //   return { url, dismissed: false }
    // })

    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              previewLinks: changes,
            }
          : tweet,
      ),
    )
  }

  const dismissPreviewLink = (tweetId: string, url: string) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === tweetId
          ? {
              ...tweet,
              previewLinks: tweet.previewLinks.map((link) =>
                link.url === url ? { ...link, dismissed: true } : link,
              ),
            }
          : tweet,
      ),
    )
  }

  const clearPreviewLinks = (tweetId: string) => {
    setTweets((prev) =>
      prev.map((tweet) =>
        tweet.id === tweetId ? { ...tweet, previewLinks: [] } : tweet,
      ),
    )
  }

  /**
   * UTILS
   */

  const downloadMediaFile = (mediaFile: MediaFile) => {
    const link = document.createElement('a')
    link.href = mediaFile.url
    link.download = `media-${Date.now()}.${mediaFile.type === 'video' ? 'mp4' : 'jpg'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const toPayloadTweet = (tweet: MemoryTweet): PayloadTweet => {
    const index = tweets.findIndex((t) => t.id === tweet.id)
    return {
      id: tweet.id,
      index: index >= 0 ? index : 0,
      content: tweet.editor?.read(() => $getRoot().getTextContent().trim()) ?? '',
      media: tweet.mediaFiles
        .filter((f) => Boolean(f.media_id) && Boolean(f.s3Key))
        .map((f) => ({
          media_id: f.media_id as string,
          s3Key: f.s3Key as string,
        })),
    }
  }

  const toPayloadTweets = (): PayloadTweet[] => {
    return tweets.map((tweet) => toPayloadTweet(tweet))
  }

  const reset = async () => {
    const baseId = nanoid()

    await Promise.all(
      tweets.map(async (tweet) => {
        await new Promise<void>((resolve) => {
          tweet.editor?.update(
            () => {
              const root = $getRoot()
              root.clear()

              const paragraph = $createParagraphNode()
              root.append(paragraph)
            },
            { onUpdate: resolve, tag: 'force-sync' },
          )
        })
      }),
    )

    shadowEditors.current = {
      [baseId]: createEditor(initialConfig),
    }

    setTweets([
      {
        id: baseId,
        mediaFiles: [],
        editor: shadowEditors.current[baseId],
        previewLinks: [],
      },
    ])
  }

  const loadThread = async (thread: TweetWithMedia[]) => {
    shadowEditors.current = {}

    const loadedTweets: MemoryTweet[] = []

    for (const tweet of thread) {
      const shadowEditor = createEditor(initialConfig)

      shadowEditors.current = {
        ...shadowEditors.current,
        [tweet.id]: shadowEditor,
      }

      if (tweet.content) {
        await new Promise<void>((resolve) => {
          shadowEditor.update(
            () => {
              const root = $getRoot()
              const paragraph = $createParagraphNode()
              paragraph.append($createTextNode(tweet.content))
              root.append(paragraph)
            },
            { onUpdate: resolve, tag: 'force-sync' },
          )
        })
      }

      const mediaFiles: MediaFile[] = tweet.media.map((f) => ({
        ...f,
        id: nanoid(),
      }))

      loadedTweets.push({
        id: tweet.id,
        mediaFiles,
        editor: shadowEditors.current[tweet.id],
        previewLinks: [],
      })
    }

    setTweets(loadedTweets)
  }

  return (
    <TweetContext.Provider
      value={{
        tweets,
        setTweets,
        // tweets
        updateTweet,
        addTweet,
        removeTweet,
        // media
        addMediaFile,
        updateMediaFile,
        removeMediaFile,
        clearMediaFiles,
        // preview links
        setPreviewLinks,
        // utils
        downloadMediaFile,
        toPayloadTweet,
        toPayloadTweets,
        reset,
        loadThread,
      }}
    >
      {children}
    </TweetContext.Provider>
  )
}

export function useTweetsV2() {
  const context = useContext(TweetContext)
  if (context === null) {
    throw new Error('useTweetsV2 must be used within a TweetProvider')
  }
  return context
}
