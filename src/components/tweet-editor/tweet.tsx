'use client'

import DuolingoButton from '@/components/ui/duolingo-button'
import DuolingoCheckbox from '@/components/ui/duolingo-checkbox'
import { useConfetti } from '@/hooks/use-confetti'
import { MediaFile, useTweets } from '@/hooks/use-tweets'
import PlaceholderPlugin from '@/lib/placeholder-plugin'
import { cn } from '@/lib/utils'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'

import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { client } from '@/lib/client'
import { ShadowEditorSyncPlugin } from '@/lib/lexical-plugins/sync-plugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  EditorState,
  LexicalEditor
} from 'lexical'
import {
  AlertCircle,
  Calendar,
  ImagePlus,
  Trash2,
  X
} from 'lucide-react'
import Link from 'next/link'
import posthog from 'posthog-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Icons } from '../icons'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer'
import { Loader } from '../ui/loader'
import { ImageTool } from './image-tool'

interface TweetProps {
  id: string | undefined
  initialContent?: string
  onDelete?: () => void
  onAdd?: () => void
  selectionMode?: boolean
}

// Twitter media type validation
const TWITTER_MEDIA_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  gif: ['image/gif'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
} as const

const TWITTER_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  gif: 15 * 1024 * 1024, // 15MB
  video: 512 * 1024 * 1024, // 512MB
} as const

const MAX_MEDIA_COUNT = 4

export default function Tweet({ id, initialContent, selectionMode = false }: TweetProps) {
  const {
    setTweetContent,
    currentTweet,
    shadowEditor,
    mediaFiles,
    setMediaFiles,
    setCurrentTweet,
  } = useTweets()

  const { fire } = useConfetti()
  const [charCount, setCharCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [imageDrawerOpen, setImageDrawerOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const renderMediaOverlays = (mediaFile: MediaFile, index: number) => (
    <>
      {(mediaFile.uploading || mediaFile.error) && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          {mediaFile.uploading && (
            <div className="text-white flex flex-col items-center gap-1.5 text-center">
              <Loader variant="classic" />
              <p className="text-sm/6 font-medium">Uploading</p>
            </div>
          )}
          {mediaFile.error && (
            <div className="text-white text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{mediaFile.error}</p>
            </div>
          )}
        </div>
      )}

      {!selectionMode && (
        <DuolingoButton
          size="icon"
          variant="destructive"
          onClick={() => removeMediaFile(mediaFile.url)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </DuolingoButton>
      )}
    </>
  )

  const getDefaultScheduleDateTime = (): { date: string; time: string } => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)

    const date = now.toISOString().split('T')[0] || ''
    const time = now.toTimeString().slice(0, 5) || ''

    return { date, time }
  }

  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTime, setScheduleTime] = useState('')

  const s3Controller = useRef<AbortController | null>(null)
  const twitterController = useRef<AbortController | null>(null)

  // Media upload mutations
  const uploadToS3Mutation = useMutation({
    mutationFn: async ({
      file,
      mediaType,
    }: {
      file: File
      mediaType: 'image' | 'gif' | 'video'
    }) => {
      s3Controller.current = new AbortController()

      const res = await client.file.uploadTweetMedia.$post(
        {
          fileName: file.name,
          fileType: file.type,
        },
        { init: { signal: s3Controller.current.signal } },
      )

      const { url, fields, fileKey } = await res.json()

      const formData = new FormData()
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string)
      })
      formData.append('file', file)

      const uploadResponse = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload to S3')
      }

      return { fileKey, mediaType, file }
    },
    onSettled: () => {
      if (s3Controller.current) {
        s3Controller.current = null
      }
    },
  })

  const uploadToTwitterMutation = useMutation({
    mutationFn: async ({
      s3Key,
      mediaType,
    }: {
      s3Key: string
      mediaType: 'image' | 'gif' | 'video'
    }) => {
      twitterController.current = new AbortController()

      const res = await client.tweet.uploadMediaToTwitter.$post(
        {
          s3Key,
          mediaType,
        },
        { init: { signal: twitterController.current.signal } },
      )

      return await res.json()
    },
    onSuccess: ({ media_id }) => {
      setCurrentTweet((prev) => ({
        ...prev,
        mediaIds: [...prev.mediaIds, media_id],
      }))
    },
    onSettled: () => {
      if (s3Controller.current) {
        s3Controller.current = null
      }
    },
  })

  const postTweetMutation = useMutation({
    mutationFn: async ({
      content,
      mediaIds = [],
      s3Keys = [],
    }: {
      content: string
      mediaIds?: string[]
      s3Keys?: string[]
    }) => {
      const res = await client.tweet.postImmediate.$post({
        content,
        mediaIds,
        s3Keys,
      })

      return await res.json()
    },
    onSuccess: (data, variables) => {
      toast.success('Tweet posted successfully!')

      posthog.capture('tweet_posted', {
        tweetId: data.tweetId,
        accountId: data.accountId,
        accountName: data.accountName,
        content: variables.content,
        s3Keys: variables.s3Keys,
        mediaIds: variables.mediaIds,
      })

      fire({
        particleCount: 100,
        spread: 110,
        origin: { y: 0.6 },
      })

      localStorage.removeItem('tweet')
    },
    onError: (error) => {
      console.error('Failed to post tweet:', error)
      toast.error('Failed to post tweet')
    },
  })

  const queryClient = useQueryClient()

  const scheduleTweetMutation = useMutation({
    mutationFn: async ({
      content,
      scheduledUnix,
      mediaIds = [],
      s3Keys = [],
    }: {
      content: string
      scheduledUnix: number
      mediaIds?: string[]
      s3Keys?: string[]
    }) => {
      const res = await client.tweet.schedule.$post({
        content,
        scheduledUnix,
        mediaIds,
        s3Keys,
      })

      return await res.json()
    },
    onSuccess: (data, variables) => {
      toast.success(
        <div className="flex gap-1.5 items-center">
          <p>Tweet scheduled!</p>
          <Link
            href="/studio/scheduled"
            className="text-base text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 rounded py-0.5 transition-colors"
          >
            See schedule
          </Link>
        </div>,
      )

      posthog.capture('tweet_scheduled', {
        tweetId: data.tweetId,
        accountId: data.accountId,
        accountName: data.accountName,
        content: variables.content,
        scheduledUnix: variables.scheduledUnix,
        mediaIds: variables.mediaIds,
        s3Keys: variables.s3Keys,
      })

      setMediaFiles([])

      shadowEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          root.append($createParagraphNode())
        },
        { tag: 'force-sync' },
      )

      setScheduleDialogOpen(false)
      setScheduleDate('')
      setScheduleTime('')

      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
    },
    onError: () => {
      toast.error('Failed to schedule tweet')
    },
  })

  const validateFile = (
    file: File,
  ): { valid: boolean; type?: 'image' | 'gif' | 'video'; error?: string } => {
    // Check file type
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

    // Check file size
    const sizeLimit = TWITTER_SIZE_LIMITS[mediaType]
    if (file.size > sizeLimit) {
      const sizeMB = Math.round(sizeLimit / (1024 * 1024))
      return {
        valid: false,
        error: `File too large. ${mediaType.toUpperCase()} files must be under ${sizeMB}MB.`,
      }
    }

    // Check media count limits
    const hasVideo = mediaFiles.some((m) => m.type === 'video')
    const hasGif = mediaFiles.some((m) => m.type === 'gif')

    if (mediaType === 'video' && (mediaFiles.length > 0 || hasGif)) {
      return { valid: false, error: 'Videos must be posted alone.' }
    }

    if (mediaType === 'gif' && (mediaFiles.length > 0 || hasVideo)) {
      return { valid: false, error: 'GIFs must be posted alone.' }
    }

    if (mediaType === 'image' && (hasVideo || hasGif)) {
      return { valid: false, error: 'Cannot mix images with videos or GIFs.' }
    }

    if (mediaFiles.length >= MAX_MEDIA_COUNT) {
      return { valid: false, error: 'Maximum 4 images per tweet.' }
    }

    return { valid: true, type: mediaType }
  }

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)

    for (const file of fileArray) {
      const validation = validateFile(file)

      if (!validation.valid) {
        toast.error(validation.error!)
        continue
      }

      const url = URL.createObjectURL(file)
      const mediaFile: MediaFile = {
        file,
        url,
        type: validation.type!,
        uploading: true,
        uploaded: false,
      }

      setMediaFiles((prev) => [...prev, mediaFile])

      try {
        // Upload to S3
        const s3Result = await uploadToS3Mutation.mutateAsync({
          file,
          mediaType: validation.type!,
        })

        // Upload to Twitter
        const twitterResult = await uploadToTwitterMutation.mutateAsync({
          s3Key: s3Result.fileKey,
          mediaType: s3Result.mediaType,
        })

        setMediaFiles((prev) =>
          prev.map((mf) =>
            mf.url === url
              ? {
                  ...mf,
                  uploading: false,
                  uploaded: true,
                  media_id: twitterResult.media_id,
                  media_key: twitterResult.media_key,
                  s3Key: s3Result.fileKey,
                }
              : mf,
          ),
        )

        posthog.capture('tweet_media_uploaded', {
          mediaType: validation.type,
          mediaId: twitterResult.media_id,
          mediaKey: twitterResult.media_key,
          s3Key: s3Result.fileKey,
        })

        // toast.success('Upload done!')
      } catch (error) {
        setMediaFiles((prev) =>
          prev.map((mf) =>
            mf.url === url ? { ...mf, uploading: false, error: 'Upload failed' } : mf,
          ),
        )
      }
    }
  }

  const removeMediaFile = (url: string) => {
    if (s3Controller.current) {
      s3Controller.current.abort('Media file removed')
    }

    if (twitterController.current) {
      twitterController.current.abort('Media file removed')
    }

    setMediaFiles((prev) => {
      const file = prev.find((f) => f.url === url)
      if (file) {
        URL.revokeObjectURL(file.url)
      }
      return prev.filter((f) => f.url !== url)
    })
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (selectionMode) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFiles(files)
      }
    },
    [selectionMode],
  )

  useEffect(() => {
    const tweet = localStorage.getItem('tweet')

    if (tweet) {
      shadowEditor?.update(() => {
        const root = $getRoot()
        const p = $createParagraphNode()
        const text = $createTextNode(tweet)

        p.append(text)
        root.clear()
        root.append(p)
      })
    }
  }, [shadowEditor])

  useEffect(() => {
    if (initialContent) {
      shadowEditor?.update(() => {
        const root = $getRoot()
        const p = $createParagraphNode()
        const text = $createTextNode(initialContent)

        p.append(text)
        root.clear()
        root.append(p)
      })
    }
  }, [initialContent, shadowEditor])

  const onEditorChange = (
    editorState: EditorState,
    editor: LexicalEditor,
    tags: Set<string>,
  ) => {
    const content = editorState.read(() => $getRoot().getTextContent())

    setCharCount(content.length)
    setTweetContent(content)

    localStorage.setItem('tweet', content)
  }

  const handleScheduleTweet = () => {
    if (!scheduleDate || !scheduleTime) {
      toast.error('Please select both date and time')
      return
    }

    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`)
    const now = new Date()

    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future')
      return
    }

    const scheduledUnix = Math.floor(scheduledDateTime.getTime() / 1000)
    const uploadedMedia = mediaFiles.filter((f) => f.uploaded && f.media_id)
    const mediaIds = uploadedMedia.map((f) => f.media_id!)

    const s3Keys = mediaFiles
      .filter((f) => Boolean(f.s3Key))
      .map((f) => f.s3Key)
      .filter(Boolean)

    scheduleTweetMutation.mutate({
      content: currentTweet.content,
      scheduledUnix,
      mediaIds,
      s3Keys,
    })
  }

  const handlePostTweet = () => {
    const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

    if (!content.trim() && mediaFiles.length === 0) {
      toast.error('Tweet cannot be empty')
      return
    }

    if (mediaFiles.some((f) => f.uploading)) {
      toast.error('Please wait for media uploads to complete')
      return
    }

    if (mediaFiles.some((f) => f.error)) {
      toast.error('Please remove failed media uploads')
      return
    }

    const skipConfirmation = localStorage.getItem('skipPostConfirmation') === 'true'

    if (skipConfirmation) {
      performPostTweet()
    } else {
      setShowPostConfirmModal(true)
    }
  }

  const performPostTweet = () => {
    const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''
    const uploadedMedia = mediaFiles.filter((f) => f.uploaded && f.media_id)
    const mediaIds = uploadedMedia.map((f) => f.media_id!)

    const s3Keys = mediaFiles
      .filter((f) => Boolean(f.s3Key))
      .map((f) => f.s3Key)
      .filter(Boolean)

    postTweetMutation.mutate({
      content,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
      s3Keys,
    })
  }

  const handleConfirmPost = () => {
    if (dontShowAgain) {
      localStorage.setItem('skipPostConfirmation', 'true')
    }
    setShowPostConfirmModal(false)
    performPostTweet()
  }

  const handleClearTweet = () => {
    if (s3Controller.current) {
      s3Controller.current.abort('Media file removed')
    }
    if (twitterController.current) {
      twitterController.current.abort('Media file removed')
    }

    shadowEditor.update(
      () => {
        const root = $getRoot()
        root.clear()
        root.append($createParagraphNode())
      },
      { tag: 'force-sync' },
    )

    setMediaFiles([])
    localStorage.removeItem('tweet')
    setCharCount(0)
    setTweetContent('')
  }

  const copyTweetImageToClipboard = async () => {
    if (!currentTweet?.image) return

    try {
      const response = await fetch(currentTweet.image.src)
      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])

      toast.success('Image copied to clipboard! 📋')
    } catch (error) {
      console.error('Failed to copy image to clipboard:', error)
      toast.error('Failed to copy image to clipboard')
    }
  }

  const getProgressColor = () => {
    const percentage = (charCount / 280) * 100
    if (percentage >= 100) return 'text-red-500'
    return 'text-blue-500'
  }

  const progress = Math.min((charCount / 280) * 100, 100)
  const circumference = 2 * Math.PI * 10
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const [editor] = useLexicalComposerContext()
  // const [focus, setFocus] = useState(false)

  // useEffect(
  //   () =>
  //     editor.registerCommand(
  //       BLUR_COMMAND,
  //       () => {
  //         setFocus(false)
  //         return false
  //       },
  //       COMMAND_PRIORITY_LOW,
  //     ),
  //   [],
  // )

  // useEffect(
  //   () =>
  //     editor.registerCommand(
  //       FOCUS_COMMAND,
  //       () => {
  //         setFocus(true)
  //         return false
  //       },
  //       COMMAND_PRIORITY_LOW,
  //     ),
  //   [],
  // )

  return (
    <>
      <Drawer modal={false} open={open && !selectionMode} onOpenChange={setOpen}>
        <div
          className={cn(
            'relative bg-white p-6 rounded-2xl w-full border border-stone-200 border-transparent bg-clip-padding shadow-sm transition-colors',
            isDragging && !selectionMode && 'border-indigo-600 border-dashed border-2',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex gap-3 relative z-10">
            <AccountAvatar className="size-12" />

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <AccountName />
                  <AccountHandle />
                </div>
              </div>

              <div className="mt-1 text-stone-800 leading-relaxed">
                <PlainTextPlugin
                  contentEditable={
                    <ContentEditable
                      autoFocus={!selectionMode}
                      spellCheck={false}
                      className={cn(
                        'w-full !min-h-16 resize-none text-base/7 leading-relaxed text-stone-800 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none',
                        selectionMode && 'pointer-events-none',
                      )}
                    />
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <PlaceholderPlugin placeholder="What's happening?" />
                <OnChangePlugin onChange={onEditorChange} />
                <HistoryPlugin />
                <ShadowEditorSyncPlugin />
              </div>

              {/* Media Files Display */}
              {mediaFiles.length > 0 && (
                <div className="mt-3">
                  {mediaFiles.length === 1 && mediaFiles[0] && (
                    <div className="relative group">
                      <div className="relative overflow-hidden rounded-2xl border border-stone-200">
                        {mediaFiles[0].type === 'video' ? (
                          <video
                            src={mediaFiles[0].url}
                            className="w-full max-h-[510px] object-cover"
                            controls={false}
                          />
                        ) : (
                          <img
                            src={mediaFiles[0].url}
                            alt="Upload preview"
                            className="w-full max-h-[510px] object-cover"
                          />
                        )}
                        {renderMediaOverlays(mediaFiles[0], 0)}
                      </div>
                    </div>
                  )}

                  {mediaFiles.length === 2 && (
                    <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200">
                      {mediaFiles.map((mediaFile, index) => (
                        <div key={mediaFile.url} className="relative group">
                          <div className="relative overflow-hidden h-[254px]">
                            {mediaFile.type === 'video' ? (
                              <video
                                src={mediaFile.url}
                                className="w-full h-full object-cover"
                                controls={false}
                              />
                            ) : (
                              <img
                                src={mediaFile.url}
                                alt="Upload preview"
                                className="w-full h-full object-cover"
                              />
                            )}
                            {renderMediaOverlays(mediaFile, index)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {mediaFiles.length === 3 && mediaFiles[0] && (
                    <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200 h-[254px]">
                      <div className="relative group">
                        <div className="relative overflow-hidden h-full">
                          {mediaFiles[0].type === 'video' ? (
                            <video
                              src={mediaFiles[0].url}
                              className="w-full h-full object-cover"
                              controls={false}
                            />
                          ) : (
                            <img
                              src={mediaFiles[0].url}
                              alt="Upload preview"
                              className="w-full h-full object-cover"
                            />
                          )}
                          {renderMediaOverlays(mediaFiles[0], 0)}
                        </div>
                      </div>
                      <div className="grid grid-rows-2 gap-0.5">
                        {mediaFiles.slice(1).map((mediaFile, index) => (
                          <div key={mediaFile.url} className="relative group">
                            <div className="relative overflow-hidden h-full">
                              {mediaFile.type === 'video' ? (
                                <video
                                  src={mediaFile.url}
                                  className="w-full h-full object-cover"
                                  controls={false}
                                />
                              ) : (
                                <img
                                  src={mediaFile.url}
                                  alt="Upload preview"
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {renderMediaOverlays(mediaFile, index + 1)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {mediaFiles.length === 4 && (
                    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200 h-[254px]">
                      {mediaFiles.map((mediaFile, index) => (
                        <div key={mediaFile.url} className="relative group">
                          <div className="relative overflow-hidden h-full">
                            {mediaFile.type === 'video' ? (
                              <video
                                src={mediaFile.url}
                                className="w-full h-full object-cover"
                                controls={false}
                              />
                            ) : (
                              <img
                                src={mediaFile.url}
                                alt="Upload preview"
                                className="w-full h-full object-cover"
                              />
                            )}
                            {renderMediaOverlays(mediaFile, index)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
                <div
                  className={cn(
                    'flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg',
                    selectionMode && 'pointer-events-none opacity-50',
                  )}
                >
                  <label htmlFor="media-upload" className="cursor-pointer">
                    <DuolingoButton
                      variant="secondary"
                      size="icon"
                      className="rounded-md"
                      onClick={() => setImageDrawerOpen(true)}
                      disabled={selectionMode}
                    >
                      <ImagePlus className="size-4" />
                      <span className="sr-only">Add media</span>
                    </DuolingoButton>
                  </label>
                  <input
                    id="media-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/x-msvideo"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFiles(e.target.files)
                      }
                      e.target.value = ''
                    }}
                  />

                  <div className="w-px h-4 bg-stone-300 mx-2" />

                  <DuolingoButton
                    variant="secondary"
                    size="icon"
                    className="rounded-md"
                    onClick={handleClearTweet}
                    disabled={selectionMode}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Clear tweet</span>
                  </DuolingoButton>

                  <div className="w-px h-4 bg-stone-300 mx-2" />

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
                </div>
                <div className="flex items-center gap-2">
                  <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                    <DialogTrigger asChild>
                      <DuolingoButton
                        variant="secondary"
                        size="icon"
                        className="aspect-square h-11 w-11"
                        disabled={selectionMode}
                        onClick={() => {
                          const defaultDateTime = getDefaultScheduleDateTime()
                          setScheduleDate(defaultDateTime.date)
                          setScheduleTime(defaultDateTime.time)
                        }}
                      >
                        <Calendar className="size-4" />
                        <span className="sr-only">Schedule tweet</span>
                      </DuolingoButton>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Schedule Tweet</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label
                            htmlFor="date"
                            className="text-right text-sm font-medium"
                          >
                            Date
                          </label>
                          <input
                            id="date"
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <label
                            htmlFor="time"
                            className="text-right text-sm font-medium"
                          >
                            Time
                          </label>
                          <input
                            id="time"
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <DuolingoButton
                            variant="secondary"
                            onClick={() => setScheduleDialogOpen(false)}
                          >
                            Cancel
                          </DuolingoButton>
                          <DuolingoButton
                            onClick={handleScheduleTweet}
                            disabled={scheduleTweetMutation.isPending}
                          >
                            {scheduleTweetMutation.isPending
                              ? 'Scheduling...'
                              : 'Schedule Tweet'}
                          </DuolingoButton>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <DuolingoButton
                    className="h-11"
                    onClick={handlePostTweet}
                    disabled={selectionMode || postTweetMutation.isPending}
                  >
                    <Icons.twitter className="size-4 mr-2" />
                    <span className="text-sm">
                      {postTweetMutation.isPending ? 'Posting...' : 'Post'}
                    </span>
                    <span className="sr-only">Post to Twitter</span>
                  </DuolingoButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Drawer
          modal={false}
          open={imageDrawerOpen && !selectionMode}
          onOpenChange={setImageDrawerOpen}
        >
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
                  onUpload={async (file) => {
                    setImageDrawerOpen(false)
                    await handleFiles([file])
                  }}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </Drawer>

      <Dialog open={showPostConfirmModal} onOpenChange={setShowPostConfirmModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Post to Twitter</DialogTitle>
          </DialogHeader>
          <div className="">
            <p className="text-base text-muted-foreground mb-4">
              This will post to Twitter. Continue?
            </p>
            <DuolingoCheckbox
              id="dont-show-again"
              label="Don't show this again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <DuolingoButton
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowPostConfirmModal(false)
                setDontShowAgain(false)
              }}
            >
              Cancel
            </DuolingoButton>
            <DuolingoButton
              size="sm"
              onClick={handleConfirmPost}
              disabled={postTweetMutation.isPending}
            >
              <Icons.twitter className="size-4 mr-2" />
              {postTweetMutation.isPending ? 'Posting...' : 'Post Now'}
            </DuolingoButton>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
