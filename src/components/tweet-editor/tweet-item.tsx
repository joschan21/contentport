'use client'

import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { MediaFile, MemoryTweet, useTweetsV2 } from '@/hooks/use-tweets-v2'
import { client } from '@/lib/client'
import { LinkPreviewPlugin } from '@/lib/lexical-plugins/link-preview-plugin'
import MentionsPlugin from '@/lib/lexical-plugins/mention-plugin'
import { MentionTooltipPlugin } from '@/lib/lexical-plugins/mention-tooltip-plugin'
import { ShadowEditorSyncPlugin } from '@/lib/lexical-plugins/sync-plugin'
import { MentionNode, MentionNode2 } from '@/lib/nodes'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { cn } from '@/lib/utils'
import { AutoLinkNode } from '@lexical/link'
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from '@lexical/react/LexicalAutoLinkPlugin'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { useMutation } from '@tanstack/react-query'
import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { nanoid } from 'nanoid'
import posthog from 'posthog-js'
import React, { useCallback, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer'
import DuolingoButton from '../ui/duolingo-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import ContentLengthIndicator from './content-length-indicator'
import { ImageTool } from './image-tool'
import { TweetMedia } from './tweet-media'

const TWITTER_MEDIA_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  gif: ['image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
} as const

const URL_REGEX =
  /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g

export const MATCHERS = createLinkMatcherWithRegExp(URL_REGEX, (text) => {
  return text.startsWith('http') ? text : `https://${text}`
})

const TWITTER_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  gif: 15 * 1024 * 1024, // 15MB
  video: 512 * 1024 * 1024, // 512MB
} as const

const MAX_MEDIA_COUNT = 4

interface TweetItemProps {
  tweet: MemoryTweet
  index: number
  isConnectedAfter?: boolean
  isConnectedBefore?: boolean
}

const TweetItem = ({ tweet, index }: TweetItemProps) => {
  const { removeTweet, addMediaFile, updateMediaFile } = useTweetsV2()
  const [isDragging, setIsDragging] = useState(false)
  const [isDrawerOpen, setisDrawerOpen] = useState(false)

  const config = {
    namespace: `tweet-editor-${tweet.id}`,
    onError: (error: Error) => {
      console.error('[Tweet Editor Error]', error)
    },
    nodes: [MentionNode, MentionNode2, AutoLinkNode],
  }

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const uploadToS3Mutation = useMutation({
    mutationFn: async ({
      file,
      mediaType,
      fileUrl,
    }: {
      file: File
      mediaType: 'image' | 'gif' | 'video'
      fileUrl: string
    }) => {
      // Create and store single controller for this file
      const controller = new AbortController()
      abortControllersRef.current.set(fileUrl, controller)

      const res = await client.file.uploadTweetMedia.$post(
        {
          fileName: file.name,
          fileType: file.type,
        },
        { init: { signal: controller.signal } },
      )

      const { url, fields, fileKey } = await res.json()

      const formData = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      formData.append('file', file)

      // Use same controller for S3 upload
      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3')
      }

      return { fileKey, mediaType, file, fileUrl }
    },
  })

  const uploadToTwitterMutation = useMutation({
    mutationFn: async ({
      s3Key,
      mediaType,
      fileUrl,
    }: {
      s3Key: string
      mediaType: 'image' | 'gif' | 'video'
      fileUrl: string
    }) => {
      const controller = abortControllersRef.current.get(fileUrl)

      if (!controller) {
        throw new Error('Upload controller not found')
      }

      const res = await client.file.uploadMediaToTwitter.$post(
        {
          s3Key,
          mediaType,
        },
        { init: { signal: controller.signal } },
      )

      return await res.json()
    },
    onSettled: (data, error, variables) => {
      abortControllersRef.current.delete(variables.fileUrl)
    },
  })

  const handleFiles = async (tweet: MemoryTweet, files: FileList | File[]) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      const validation = validateFile(tweet, file)

      if (!validation.valid) {
        toast.error(validation.error!)
        continue
      }

      const url = URL.createObjectURL(file)

      const mediaFile: MediaFile = {
        id: nanoid(),
        file,
        url,
        type: validation.type!,
        uploading: true,
        uploaded: false,
      }

      addMediaFile(tweet.id, mediaFile)

      try {
        // Upload to S3
        const s3Result = await uploadToS3Mutation.mutateAsync({
          file,
          mediaType: validation.type!,
          fileUrl: url,
        })

        // Upload to Twitter
        const twitterResult = await uploadToTwitterMutation.mutateAsync({
          s3Key: s3Result.fileKey,
          mediaType: s3Result.mediaType,
          fileUrl: url,
        })

        updateMediaFile(tweet.id, mediaFile.id, {
          uploading: false,
          uploaded: true,
          media_id: twitterResult.media_id,
          media_key: twitterResult.media_key,
          s3Key: s3Result.fileKey,
        })

        // setMediaFiles((prev) =>
        //   prev.map((mf) =>
        //     mf.url === url
        //       ? {
        //           ...mf,
        //           uploading: false,
        //           uploaded: true,
        //           media_id: twitterResult.media_id,
        //           media_key: twitterResult.media_key,
        //           s3Key: s3Result.fileKey,
        //         }
        //       : mf,
        //   ),
        // )

        posthog.capture('tweet_media_uploaded', {
          mediaType: validation.type,
          mediaId: twitterResult.media_id,
          mediaKey: twitterResult.media_key,
          s3Key: s3Result.fileKey,
        })

        // toast.success('Upload done!')
      } catch (error) {
        // setMediaFiles((prev) =>
        //   prev.map((mf) =>
        //     mf.url === url ? { ...mf, uploading: false, error: 'Upload failed' } : mf,
        //   ),
        // )

        updateMediaFile(tweet.id, mediaFile.id, {
          uploading: false,
          error: 'Upload failed',
        })
      }
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = (tweet: MemoryTweet, e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(tweet, files)
    }
  }

  // Move all the individual tweet logic here
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (isDrawerOpen) {
      return
    }

    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
    if (files.length > 0) {
      e.preventDefault()
      await handleFiles(tweet, files)
    }
  }

  return (
    <Drawer modal={false} open={isDrawerOpen} onOpenChange={setisDrawerOpen}>
      <div
        className={cn(
          'relative p-3 border-2 border-transparent border-dashed bg-white rounded-xl w-full transition-colors',
          {
            'border-indigo-600 bg-indigo-50': isDragging,
          },
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(tweet, e)}
      >
        <div className="w-full flex gap-3 relative">
          <div
            className={cn(
              'relative z-50 w-10 h-14 bg-white flex -top-2.5 items-center justify-center transition-colors',
              {
                'bg-indigo-50': isDragging,
              },
            )}
          >
            <AccountAvatar className="relative !z-50 size-10" />
          </div>

          <div className="w-full flex-1">
            <div className="flex items-center gap-1">
              <AccountName />
              <AccountHandle />
            </div>

            <div className="text-stone-800 leading-relaxed">
              <LexicalComposer initialConfig={config}>
                <PlainTextPlugin
                  contentEditable={
                    <ContentEditable
                      id="editor"
                      spellCheck={false}
                      onPaste={handlePaste}
                      className={cn(
                        'w-full !min-h-16 resize-none text-base/7 leading-relaxed text-stone-800 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
                      )}
                    />
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <PlaceholderPlugin placeholder="What's happening?" />
                <HistoryPlugin />
                <MentionsPlugin />
                <MentionTooltipPlugin />
                <AutoLinkPlugin matchers={[MATCHERS]} />
                <LinkPreviewPlugin shouldShowLink={!Boolean(tweet?.mediaFiles.length)} />
                <ShadowEditorSyncPlugin tweetId={tweet.id} />
              </LexicalComposer>
            </div>

            {/* Rest of your tweet content */}
            <TweetMedia tweetId={tweet.id} mediaFiles={tweet.mediaFiles} />

            {/* Tweet actions */}
            <div className="mt-3 w-full flex items-center justify-between">
              <div
                className={cn(
                  'flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg transition-colors',
                  {
                    'bg-indigo-100': isDragging,
                  },
                )}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DuolingoButton
                        variant="secondary"
                        size="icon"
                        className="rounded-md"
                        type="button"
                        onClick={() => {
                          const input = document.getElementById(
                            'media-upload',
                          ) as HTMLInputElement
                          input?.click()
                        }}
                      >
                        <Upload className="size-4" />
                        <span className="sr-only">Upload files</span>
                      </DuolingoButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upload media</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DuolingoButton
                        variant="secondary"
                        size="icon"
                        className="rounded-md"
                        onClick={() => setisDrawerOpen(true)}
                      >
                        <ImagePlus className="size-4" />
                        <span className="sr-only">Screenshot editor</span>
                      </DuolingoButton>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Screenshot editor</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* image tool */}
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
                          onClose={() => setisDrawerOpen(false)}
                          onUpload={async (file) => {
                            setisDrawerOpen(false)
                            await handleFiles(tweet, [file])
                          }}
                        />
                      </div>
                    </div>
                  </DrawerContent>

                  <input
                    id="media-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFiles(tweet, e.target.files)
                      }
                      e.target.value = ''
                    }}
                  />
                  {index !== 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DuolingoButton
                          variant="secondary"
                          size="icon"
                          className="rounded-md"
                          onClick={() => removeTweet(tweet.id)}
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove tweet</span>
                        </DuolingoButton>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove tweet</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>

                <div className="w-px h-4 bg-stone-300 mx-2" />

                <ContentLengthIndicator tweetId={tweet.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  )
}

TweetItem.displayName = 'TweetItem'

export { TweetItem }

function validateFile(
  tweet: MemoryTweet,
  file: File,
): { valid: boolean; type?: 'image' | 'gif' | 'video'; error?: string } {
  let mediaType: 'image' | 'gif' | 'video'
  if (TWITTER_MEDIA_TYPES.image.includes(file.type as any)) {
    mediaType = 'image'
  } else if (TWITTER_MEDIA_TYPES.gif.includes(file.type as any)) {
    mediaType = 'gif'
  } else if (TWITTER_MEDIA_TYPES.video.includes(file.type as any)) {
    mediaType = 'video'
  } else {
    return {
      valid: false,
      error: 'File type not supported. Use JPG, PNG, WEBP, GIF, or MP4.',
    }
  }

  const sizeLimit = TWITTER_SIZE_LIMITS[mediaType]
  if (file.size > sizeLimit) {
    const sizeMB = Math.round(sizeLimit / (1024 * 1024))
    return {
      valid: false,
      error: `File too large. ${mediaType.toUpperCase()} files must be under ${sizeMB}MB.`,
    }
  }

  const hasVideo = tweet.mediaFiles.some((m) => m.type === 'video')
  const hasGif = tweet.mediaFiles.some((m) => m.type === 'gif')

  if (mediaType === 'video' && (tweet.mediaFiles.length > 0 || hasGif)) {
    return { valid: false, error: 'Videos must be posted alone.' }
  }

  if (mediaType === 'gif' && (tweet.mediaFiles.length > 0 || hasVideo)) {
    return { valid: false, error: 'GIFs must be posted alone.' }
  }

  if (mediaType === 'image' && (hasVideo || hasGif)) {
    return { valid: false, error: 'Cannot mix images with videos or GIFs.' }
  }

  if (tweet.mediaFiles.length >= MAX_MEDIA_COUNT) {
    return { valid: false, error: 'Maximum 4 images per tweet.' }
  }

  return { valid: true, type: mediaType }
}
