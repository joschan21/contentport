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
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'

import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { useAttachments } from '@/hooks/use-attachments'
import { client } from '@/lib/client'
import MentionsPlugin from '@/lib/lexical-plugins/mention-plugin'
import { MentionTooltipPlugin } from '@/lib/lexical-plugins/mention-tooltip-plugin'
import { ShadowEditorSyncPlugin } from '@/lib/lexical-plugins/sync-plugin'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { HTTPException } from 'hono/http-exception'
import { $createParagraphNode, $getRoot } from 'lexical'
import {
  AlertCircle,
  CalendarCog,
  ChevronDown,
  Clock,
  Download,
  ImagePlus,
  MessageSquarePlus,
  Pen,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { PropsWithChildren, useCallback, useRef, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Icons } from '../icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer'
import { Loader } from '../ui/loader'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import ContentLengthIndicator from './content-length-indicator'
import { Calendar20 } from './date-picker'
import { ImageTool } from './image-tool'
import LinkPreview from './link-preview'
import { nanoid } from 'nanoid'

interface TweetProps {
  onDelete?: () => void
  onAdd?: () => void
  editMode?: boolean
  editTweetId?: string | null
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

export default function Tweet({ editMode = false, editTweetId }: TweetProps) {
  const { mediaFiles, setMediaFiles, setCurrentTweet, shadowEditor } = useTweets()
  const { addVideoAttachment, attachments } = useAttachments()

  const { fire } = useConfetti()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [imageDrawerOpen, setImageDrawerOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showPostConfirmModal, setShowPostConfirmModal] = useState(false)
  const [skipPostConfirmation, setSkipPostConfirmation] = useState(false)
  const [didTogglePostConfirmation, setDidTogglePostConfirmation] = useState(false)
  const [linkPreviewUrl, setLinkPreviewUrl] = useState<string | null>(null)
  const [dismissedUrls, setDismissedUrls] = useState<Record<string, true>>({})
  const urlCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastCandidateUrlRef = useRef<string | null>(null)

  useEffect(() => {
    setSkipPostConfirmation(localStorage.getItem('skipPostConfirmation') === 'true')
  }, [])

  useEffect(() => {
    const checkForUrls = () => {
      const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

      const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
      const urls = content.match(urlRegex)

      const clearShow = () => {
        if (previewShowTimeoutRef.current) clearTimeout(previewShowTimeoutRef.current)
        previewShowTimeoutRef.current = null
      }
      const clearHide = () => {
        if (previewHideTimeoutRef.current) clearTimeout(previewHideTimeoutRef.current)
        previewHideTimeoutRef.current = null
      }

      if (urls && urls.length > 0) {
        const candidate = urls[0]
        try {
          // eslint-disable-next-line no-new
          new URL(candidate)

          if (dismissedUrls[candidate] || candidate === linkPreviewUrl) {
            lastCandidateUrlRef.current = candidate
            clearShow()
            clearHide()
            return
          }

          lastCandidateUrlRef.current = candidate
          clearHide()
          clearShow()
          previewShowTimeoutRef.current = setTimeout(() => {
            if (lastCandidateUrlRef.current === candidate && !dismissedUrls[candidate]) {
              setLinkPreviewUrl(candidate)
            }
          }, 800)
        } catch {
          lastCandidateUrlRef.current = null
          clearShow()
          if (linkPreviewUrl) {
            clearHide()
            previewHideTimeoutRef.current = setTimeout(() => {
              if (!lastCandidateUrlRef.current) setLinkPreviewUrl(null)
            }, 800)
          }
        }
      } else {
        lastCandidateUrlRef.current = null
        if (linkPreviewUrl) {
          clearShow()
          clearHide()
          previewHideTimeoutRef.current = setTimeout(() => {
            if (!lastCandidateUrlRef.current) setLinkPreviewUrl(null)
          }, 800)
        }
      }
    }

    const unregister = shadowEditor?.registerUpdateListener(({ tags }) => {
      if (!tags.has('force-sync') && !tags.has('system-update')) {
        if (urlCheckTimeoutRef.current) clearTimeout(urlCheckTimeoutRef.current)
        urlCheckTimeoutRef.current = setTimeout(checkForUrls, 600)
      }
    })

    return () => {
      unregister?.()
      if (urlCheckTimeoutRef.current) clearTimeout(urlCheckTimeoutRef.current)
      if (previewShowTimeoutRef.current) clearTimeout(previewShowTimeoutRef.current)
      if (previewHideTimeoutRef.current) clearTimeout(previewHideTimeoutRef.current)
    }
  }, [shadowEditor, linkPreviewUrl, dismissedUrls])

  const toggleSkipConfirmation = (checked: boolean) => {
    setSkipPostConfirmation(checked)
    if (checked) {
      localStorage.setItem('skipPostConfirmation', 'true')
    } else {
      localStorage.removeItem('skipPostConfirmation')
    }
  }

  // Add video to chat attachments
  const handleAddVideoToChat = (mediaFile: MediaFile) => {
    if (mediaFile.type !== 'video' || !mediaFile.s3Key) {
      toast.error('Invalid video file')
      return
    }

    // Check if this video is already attached
    const existingAttachment = attachments.find(
      (att) => att.type === 'video' && att.fileKey === mediaFile.s3Key,
    )

    if (existingAttachment) {
      toast.error('Video already added to chat')
      return
    }

    const fileName = `Video transcript (${mediaFile.file?.name || 'uploaded video'})`
    addVideoAttachment(mediaFile.s3Key, fileName)
    toast.success('Video added to chat!')
  }

  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === 'Escape' && currentNodeRef.current !== null) {
  //       currentNodeRef.current = null
  //       popoverRef.current?.hide()
  //     }
  //   }

  //   document.addEventListener('keydown', handleKeyDown)
  //   return () => document.removeEventListener('keydown', handleKeyDown)
  // }, [])

  // const handleMentionClick = useCallback(
  //   (event: Event, eventEditor: LexicalEditor, key: NodeKey) => {
  //     justClickedRef.current = true

  //     if (currentNodeRef.current === key) {
  //       // Toggle off if clicking the same node
  //       currentNodeRef.current = null
  //       popoverRef.current?.hide()
  //       setTimeout(() => { justClickedRef.current = false }, 100)
  //       return
  //     }

  //     currentNodeRef.current = key

  //     const nodeText = eventEditor.read(() => {
  //       const node = eventEditor.getEditorState()._nodeMap.get(key)
  //       return node ? node.getTextContent() : ''
  //     })

  //     const nodeElement = eventEditor.getElementByKey(key)
  //     if (!nodeElement) return

  //     const rect = nodeElement.getBoundingClientRect()

  //     popoverRef.current?.show(
  //       rect.left + window.scrollX,
  //       rect.top + window.scrollY,
  //       nodeText
  //     )

  //     // Reset the flag after a brief delay
  //     setTimeout(() => { justClickedRef.current = false }, 100)
  //   },
  //   [],
  // )

  //   const checkSelectionInMention = useCallback((editor: LexicalEditor) => {
  //   // Don't interfere immediately after a click
  //   if (justClickedRef.current) return

  //   editor.read(() => {
  //     const selection = $getSelection()
  //     if (!$isRangeSelection(selection)) {
  //       if (currentNodeRef.current !== null) {
  //         currentNodeRef.current = null
  //         popoverRef.current?.hide()
  //       }
  //       return
  //     }

  //     const anchorNode = selection.anchor.getNode()
  //     if (anchorNode instanceof MentionNode2) {
  //       const nodeKey = anchorNode.getKey()
  //       const nodeElement = editor.getElementByKey(nodeKey)
  //       if (!nodeElement) return

  //       const nodeText = anchorNode.getTextContent()

  //       if (currentNodeRef.current === nodeKey) {
  //         // Update text when typing in the same node
  //         popoverRef.current?.updateText(nodeText)
  //       }
  //     } else {
  //       if (currentNodeRef.current !== null) {
  //         currentNodeRef.current = null
  //         popoverRef.current?.hide()
  //       }
  //     }
  //   })
  // }, [])

  const downloadMediaFile = (mediaFile: MediaFile) => {
    const link = document.createElement('a')
    link.href = mediaFile.url
    link.download = `media-${Date.now()}.${mediaFile.type === 'video' ? 'mp4' : 'jpg'}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

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

      <div className="absolute top-2 right-2 flex gap-1">
        {mediaFile.type === 'video' && (
          <DuolingoButton
            disabled={!Boolean(mediaFile.uploaded) || !Boolean(mediaFile.s3Key)}
            size="icon"
            variant="secondary"
            onClick={() => handleAddVideoToChat(mediaFile)}
            title="Add video transcript to chat"
          >
            <MessageSquarePlus className="size-4" />
          </DuolingoButton>
        )}
        <DuolingoButton
          size="icon"
          variant="secondary"
          onClick={() => downloadMediaFile(mediaFile)}
        >
          <Download className="size-4" />
        </DuolingoButton>
        <DuolingoButton
          size="icon"
          variant="destructive"
          onClick={() => removeMediaFile(mediaFile.url)}
        >
          <X className="h-4 w-4" />
        </DuolingoButton>
      </div>
    </>
  )

  // Single controller per file - much simpler!
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

      const res = await client.tweet.uploadMediaToTwitter.$post(
        {
          s3Key,
          mediaType,
        },
        { init: { signal: controller.signal } },
      )

      return await res.json()
    },
    onSuccess: ({ media_id }) => {
      setCurrentTweet((prev) => ({
        ...prev,
        mediaIds: [...prev.mediaIds, media_id],
      }))
    },
    onSettled: (data, error, variables) => {
      // Clean up controller after both uploads complete
      abortControllersRef.current.delete(variables.fileUrl)
    },
  })

  const postTweetMutation = useMutation({
    mutationFn: async ({
      content,
      media,
    }: {
      content: string
      media: { s3Key: string; media_id: string }[]
    }) => {
      const res = await client.tweet.postImmediate.$post({
        content,
        media,
      })

      return await res.json()
    },
    onSuccess: (data, variables) => {
      toast.success(
        <div className="flex items-center gap-2">
          <p>Tweet posted!</p>
          <Link
            target="_blank"
            rel="noreferrer"
            href={`https://x.com/${data.accountUsername}/status/${data.tweetId}`}
            className="text-base text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 rounded py-0.5 transition-colors"
          >
            See tweet
          </Link>
        </div>,
      )

      posthog.capture('tweet_posted', {
        tweetId: data.tweetId,
        accountId: data.accountId,
        accountName: data.accountName,
      })

      fire({
        particleCount: 200,
        spread: 160,
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
    },
    onError: (error) => {
      console.error('Failed to post tweet:', error)
      toast.error('Failed to post tweet')
    },
  })

  const queryClient = useQueryClient()

  const { data: editTweetData } = useQuery({
    queryKey: ['edit-tweet', editTweetId],
    queryFn: async () => {
      if (!editTweetId) return null
      const res = await client.tweet.getTweet.$get({ tweetId: editTweetId })
      return await res.json()
    },
    enabled: editMode && Boolean(editTweetId),
  })

  const updateTweetMutation = useMutation({
    mutationFn: async ({
      tweetId,
      content,
      scheduledUnix,
      media,
    }: {
      tweetId: string
      content: string
      scheduledUnix: number
      media: { s3Key: string; media_id: string }[]
    }) => {
      if (!scheduledUnix) {
        toast.error('Something went wrong, please reload the page.')
        return
      }

      const res = await client.tweet.update.$post({
        tweetId,
        content,
        scheduledUnix,
        media,
      })
      return await res.json()
    },
    onSuccess: () => {
      toast.success('Tweet updated successfully!')

      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
      queryClient.invalidateQueries({ queryKey: ['edit-tweet', editTweetId] })
      router.push('/studio/scheduled')
    },
    onError: () => {
      toast.error('Failed to update tweet')
    },
  })

  const scheduleTweetMutation = useMutation({
    mutationFn: async ({
      content,
      scheduledUnix,
      media,
      showToast = true,
    }: {
      content: string
      scheduledUnix: number
      media: { s3Key: string; media_id: string }[]
      showToast?: boolean
    }) => {
      const promise = client.tweet.schedule.$post({
        content,
        scheduledUnix,
        media,
      })

      if (showToast) {
        const schedulePromiseToast = toast.promise(promise, {
          loading: 'Scheduling...',
          success: (
            <div className="flex gap-1.5 items-center">
              <p>Tweet scheduled!</p>
              <Link
                href="/studio/scheduled"
                className="text-base text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 rounded py-0.5 transition-colors"
              >
                See schedule
              </Link>
            </div>
          ),
        })

        return (await schedulePromiseToast).json()
      }

      return (await promise).json()
    },
    onSuccess: (data, variables) => {
      posthog.capture('tweet_scheduled', {
        tweetId: data.tweetId,
        accountId: data.accountId,
        accountName: data.accountName,
        content: variables.content,
        scheduledUnix: variables.scheduledUnix,
        media: variables.media,
      })

      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })

      shadowEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          root.append($createParagraphNode())
        },
        { tag: 'force-sync' },
      )

      setMediaFiles([])
    },
    onError: (error: HTTPException) => {
      if (error.status === 402) {
        toast(`🔒 ${error.message}`)
      } else {
        toast.error(error.message)
      }
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
          fileUrl: url,
        })

        // Upload to Twitter
        const twitterResult = await uploadToTwitterMutation.mutateAsync({
          s3Key: s3Result.fileKey,
          mediaType: s3Result.mediaType,
          fileUrl: url,
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

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    const files: File[] = []
    let pastedText = ''
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (!item) continue
      
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
      
      if (item.kind === 'string' && item.type === 'text/plain') {
        pastedText = await new Promise<string>((resolve) => {
          item.getAsString(resolve)
        })
      }
    }
    
    if (files.length > 0) {
      e.preventDefault()
      await handleFiles(files)
      return
    }
    
    if (pastedText) {
      const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
      const urls = pastedText.match(urlRegex)

      if (urls && urls.length > 0) {
        const firstUrl = urls[0]
        try {
          new URL(firstUrl)
          if (previewHideTimeoutRef.current) clearTimeout(previewHideTimeoutRef.current)
          if (firstUrl && !dismissedUrls[firstUrl] && firstUrl !== linkPreviewUrl) {
            setLinkPreviewUrl(firstUrl)
          }
        } catch {
        }
      }
    }
  }

  const removeMediaFile = (url: string) => {
    // Get and abort the single controller
    const controller = abortControllersRef.current.get(url)

    if (controller) {
      controller.abort('Media file removed')
      abortControllersRef.current.delete(url)
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }

  interface EnqueuePostArgs {
    content: string
    media: {
      s3Key: string
      media_id: string
    }[]
  }

  const { mutate: enqueueTweet, isPending: isQueueing } = useMutation({
    mutationFn: async ({ content, media }: EnqueuePostArgs) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const userNow = new Date()

      const res = await client.tweet.enqueue_tweet.$post({
        content,
        media,
        timezone,
        userNow,
      })

      return await res.json()
    },
    onSuccess({ scheduledUnix }) {
      const scheduledDate = new Date(scheduledUnix)

      let timeText: string
      if (isToday(scheduledDate)) {
        timeText = formatDistanceToNow(scheduledDate, {
          addSuffix: true,
          includeSeconds: true,
        })
      } else {
        const formattedTime = format(scheduledDate, 'h:mm a')
        const formattedDate = isTomorrow(scheduledDate)
          ? 'tomorrow'
          : format(scheduledDate, 'MMM d')
        timeText = `${formattedTime} ${formattedDate}`
      }

      setMediaFiles([])

      shadowEditor.update(
        () => {
          const root = $getRoot()
          root.clear()
          root.append($createParagraphNode())
        },
        { tag: 'force-sync' },
      )

      toast.success(
        <div className="flex gap-1.5 items-center">
          <p>Queued {isToday(scheduledDate) ? timeText : `for ${timeText}`}!</p>
          <Link
            href="/studio/scheduled"
            className="text-base text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 rounded py-0.5 transition-colors"
          >
            See queue
          </Link>
        </div>,
      )

      fire({
        particleCount: 200,
        spread: 160,
      })
    },
  })

  const handleAddToQueue = async () => {
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

    const media = mediaFiles
      .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
      .map((f) => ({
        s3Key: f.s3Key!,
        media_id: f.media_id!,
      }))

    enqueueTweet({ content, media })
  }

  const handleScheduleTweet = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledDateTime = new Date(date)
    scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0)

    const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

    const now = new Date()

    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future')
      return
    }

    if (!content.trim()) {
      toast.error('Tweet cannot be empty')
      return
    }

    const scheduledUnix = Math.floor(scheduledDateTime.getTime() / 1000)

    const media = mediaFiles
      .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
      .map((f) => ({
        s3Key: f.s3Key!,
        media_id: f.media_id!,
      }))

    if (editTweetId) {
      updateTweetMutation.mutate({
        tweetId: editTweetId,
        content,
        scheduledUnix,
        media,
      })
    } else {
      scheduleTweetMutation.mutate({
        content,
        scheduledUnix,
        media,
      })
    }
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

    if (skipPostConfirmation) {
      performPostTweet()
    } else {
      setShowPostConfirmModal(true)
    }
  }

  const performPostTweet = () => {
    const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

    const media = mediaFiles
      .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
      .map((f) => ({
        s3Key: f.s3Key!,
        media_id: f.media_id!,
      }))

    postTweetMutation.mutate({
      content,
      media,
    })
  }

  const handleConfirmPost = () => {
    setShowPostConfirmModal(false)
    performPostTweet()
  }

  const handleUpdateTweet = () => {
    if (!editTweetId) return

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

    let scheduledUnix: number | undefined

    if (editTweetData?.tweet?.scheduledFor) {
      scheduledUnix = Math.floor(
        new Date(editTweetData.tweet.scheduledFor).getTime() / 1000,
      )
    }

    if (!scheduledUnix) {
      toast.error('Scheduled time is required')
      return
    }

    const media = mediaFiles
      .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
      .map((f) => ({
        s3Key: f.s3Key!,
        media_id: f.media_id!,
      }))

    updateTweetMutation.mutate({
      tweetId: editTweetId,
      content,
      scheduledUnix,
      media,
    })
  }

  const handleCancelEdit = () => {
    router.push('/studio/scheduled')
  }

  const handleClearTweet = () => {
    // Abort all pending uploads
    abortControllersRef.current.forEach((controller) => {
      controller.abort('Tweet cleared')
    })

    // Clear all controllers
    abortControllersRef.current.clear()

    shadowEditor.update(
      () => {
        const root = $getRoot()
        root.clear()
        root.append($createParagraphNode())
      },
      { tag: 'force-sync' },
    )

    setMediaFiles([])
    setLinkPreviewUrl(null)
    setDismissedUrls({})
    if (urlCheckTimeoutRef.current) clearTimeout(urlCheckTimeoutRef.current)
    if (previewShowTimeoutRef.current) clearTimeout(previewShowTimeoutRef.current)
    if (previewHideTimeoutRef.current) clearTimeout(previewHideTimeoutRef.current)
  }

  const EditModeWrapper = ({ children }: PropsWithChildren) => {
    if (!editMode) return children

    if (editMode)
      return (
        <div className="border-indigo-600 border-2 bg-clip-padding shadow rounded-[20px] overflow-hidden">
          <div className="py-1.5 px-6 bg-indigo-600 flex justify-between">
            <div className="flex items-center gap-2">
              <Pen className="size-4 text-white" />
              <p className="text-sm/6 font-semibold text-white uppercase">
                Editing scheduled tweet
              </p>
            </div>
            <DuolingoButton
              size="sm"
              className="h-fit w-fit"
              variant="destructive"
              onClick={handleCancelEdit}
            >
              Cancel
            </DuolingoButton>
          </div>

          {children}
        </div>
      )
  }

  return (
    <>
      <Drawer modal={false} open={open} onOpenChange={setOpen}>
        <EditModeWrapper>
          <div
            className={cn(
              'relative bg-white p-6 rounded-2xl w-full border border-black border-opacity-[0.01] bg-clip-padding group isolate shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]  transition-colors',
              isDragging && 'border-indigo-600 border-dashed',
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex gap-3 relative z-10">
              <AccountAvatar className="size-12" />

              <div className="flex-1">
                <div className="flex items-center gap-1">
                  <AccountName />
                  <AccountHandle />
                </div>

                <div className="text-stone-800 leading-relaxed">
                  <PlainTextPlugin
                    contentEditable={
                      <ContentEditable
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
                  {/* <OnChangePlugin onChange={onEditorChange} /> */}
                  <HistoryPlugin />
                  <ShadowEditorSyncPlugin />
                  <MentionsPlugin />
                  <MentionTooltipPlugin />
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

                {linkPreviewUrl && !mediaFiles.length && (
                  <LinkPreview
                    url={linkPreviewUrl}
                    onDismiss={() => {
                      if (linkPreviewUrl) {
                        setDismissedUrls((prev) => ({ ...prev, [linkPreviewUrl]: true }))
                      }
                      setLinkPreviewUrl(null)
                    }}
                  />
                )}

                <div className="mt-3 pt-3 border-t border-stone-200 flex items-center justify-between">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 bg-stone-100 p-1.5 rounded-lg',
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
                            onClick={() => setImageDrawerOpen(true)}
                          >
                            <ImagePlus className="size-4" />
                            <span className="sr-only">Screenshot editor</span>
                          </DuolingoButton>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Screenshot editor</p>
                        </TooltipContent>
                      </Tooltip>
                      <input
                        id="media-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFiles(e.target.files)
                          }
                          e.target.value = ''
                        }}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DuolingoButton
                            variant="secondary"
                            size="icon"
                            className="rounded-md"
                            onClick={handleClearTweet}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Clear tweet</span>
                          </DuolingoButton>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear tweet</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="w-px h-4 bg-stone-300 mx-2" />

                    <ContentLengthIndicator />
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <Popover>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <DuolingoButton
                                    loading={scheduleTweetMutation.isPending}
                                    disabled={
                                      updateTweetMutation.isPending ||
                                      scheduleTweetMutation.isPending
                                    }
                                    variant="secondary"
                                    size="icon"
                                    className="aspect-square h-11 w-11"
                                  >
                                    <CalendarCog className="size-5" />
                                    <span className="sr-only">Reschedule tweet</span>
                                  </DuolingoButton>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <PopoverContent className="max-w-3xl w-full">
                                <Calendar20
                                  editMode={editMode}
                                  onSchedule={handleScheduleTweet}
                                  isPending={scheduleTweetMutation.isPending}
                                  initialScheduledTime={
                                    editTweetData?.tweet?.scheduledFor
                                      ? new Date(editTweetData.tweet.scheduledFor)
                                      : undefined
                                  }
                                />
                              </PopoverContent>
                            </Popover>
                            <TooltipContent>
                              <p>Reschedule tweet</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DuolingoButton
                                className="h-11"
                                onClick={handleUpdateTweet}
                                disabled={
                                  updateTweetMutation.isPending ||
                                  scheduleTweetMutation.isPending
                                }
                              >
                                <Save className="size-5 mr-1.5" />
                                <span className="text-sm">
                                  {updateTweetMutation.isPending ? 'Saving...' : 'Save'}
                                </span>
                              </DuolingoButton>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Save tweet</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DuolingoButton
                                className="h-11"
                                variant="secondary"
                                onClick={handlePostTweet}
                                disabled={mediaFiles.some((f) => f.uploading)}
                              >
                                <span className="text-sm">
                                  {postTweetMutation.isPending ? 'Posting...' : 'Post'}
                                </span>
                                <span className="sr-only">Post to Twitter</span>
                              </DuolingoButton>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                {skipPostConfirmation
                                  ? 'The tweet will be posted immediately'
                                  : 'A confirmation modal will open'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <div className="flex">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DuolingoButton
                                  loading={isQueueing}
                                  disabled={mediaFiles.some((f) => f.uploading)}
                                  className="h-11 px-3 rounded-r-none border-r-0"
                                  onClick={handleAddToQueue}
                                >
                                  <Clock className="size-4 mr-2" />
                                  <span className="text-sm">Queue</span>
                                </DuolingoButton>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Add to next queue slot -{' '}
                                  <Link
                                    href="/studio/scheduled"
                                    className="underline decoration-2 underline-offset-2"
                                  >
                                    what is this?
                                  </Link>
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <Popover>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <DuolingoButton
                                      loading={scheduleTweetMutation.isPending}
                                      disabled={mediaFiles.some((f) => f.uploading)}
                                      size="icon"
                                      className="h-11 w-14 rounded-l-none border-l"
                                    >
                                      <ChevronDown className="size-4" />
                                      <span className="sr-only">Schedule manually</span>
                                    </DuolingoButton>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <PopoverContent className="max-w-3xl w-full">
                                  <Calendar20
                                    onSchedule={handleScheduleTweet}
                                    isPending={scheduleTweetMutation.isPending}
                                  />
                                </PopoverContent>
                              </Popover>
                              <TooltipContent>
                                <p>Schedule custom time</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </EditModeWrapper>

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

      <Dialog
        open={showPostConfirmModal}
        onOpenChange={(open) => {
          setShowPostConfirmModal(open)

          if (!open) {
            setDidTogglePostConfirmation(false)
          }
        }}
      >
        <DialogContent className="bg-white rounded-2xl p-6">
          <div className="size-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Icons.twitter className="size-6" />
          </div>
          <DialogHeader className="py-2">
            <DialogTitle className="text-lg font-semibold">Post to Twitter</DialogTitle>
            <DialogDescription>
              This tweet will be posted immediately. Would you like to continue?
            </DialogDescription>
            <div className="flex justify-center sm:justify-start pt-4">
              <DuolingoCheckbox
                className=""
                id="skip-post-confirmation"
                label="Don't show this again"
                checked={didTogglePostConfirmation}
                onChange={(e) => setDidTogglePostConfirmation(e.target.checked)}
              />
            </div>
          </DialogHeader>

          <DialogFooter>
            <DuolingoButton
              variant="secondary"
              size="sm"
              className="h-11"
              onClick={() => {
                setShowPostConfirmModal(false)
                setDidTogglePostConfirmation(false)
              }}
            >
              Cancel
            </DuolingoButton>
            <DuolingoButton
              loading={postTweetMutation.isPending}
              size="sm"
              className="h-11"
              onClick={(e) => {
                e.preventDefault()
                if (didTogglePostConfirmation) {
                  toggleSkipConfirmation(true)
                }
                handleConfirmPost()
              }}
            >
              <Icons.twitter className="size-4 mr-2" />
              {postTweetMutation.isPending ? 'Posting...' : 'Post Now'}
            </DuolingoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
