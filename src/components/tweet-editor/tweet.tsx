'use client'

import { useConfetti } from '@/hooks/use-confetti'

import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { TweetItem } from './tweet-item'

interface TweetProps {
  onDelete?: () => void
  onAdd?: () => void
  editMode?: boolean
  editTweetId?: string | null
}

export default function Tweet({ editMode = false, editTweetId }: TweetProps) {
  const { tweets, addTweet, loadThread } = useTweetsV2()

  const { fire } = useConfetti()
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)

  // const { data: editTweetData } = useQuery({
  //   queryKey: ['edit-tweet', editTweetId],
  //   queryFn: async () => {
  //     if (!editTweetId) return null
  //     const res = await client.tweet.getTweet.$get({ tweetId: editTweetId })
  //     return await res.json()
  //   },
  //   enabled: editMode && Boolean(editTweetId),
  // })

  // useEffect(() => {
  //   const loadEditData = async () => {
  //     if (editTweetData?.thread && editTweetData.thread.length > 0) {
  //       await loadThread(editTweetData.thread)
  //     }
  //   }

  //   if (editMode && editTweetData) {
  //     loadEditData()
  //   }
  // }, [editTweetData, editMode, loadThread])

  // const updateTweetMutation = useMutation({
  //   mutationFn: async ({
  //     tweetId,
  //     content,
  //     scheduledUnix,
  //     media,
  //   }: {
  //     tweetId: string
  //     content: string
  //     scheduledUnix: number
  //     media: { s3Key: string; media_id: string }[]
  //   }) => {
  //     if (!scheduledUnix) {
  //       toast.error('Something went wrong, please reload the page.')
  //       return
  //     }

  //     const res = await client.tweet.update.$post({
  //       tweetId,
  //       content,
  //       scheduledUnix,
  //       media,
  //     })
  //     return await res.json()
  //   },
  //   onSuccess: () => {
  //     toast.success('Tweet updated successfully!')

  //     queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
  //     queryClient.invalidateQueries({ queryKey: ['edit-tweet', editTweetId] })
  //     router.push('/studio/scheduled')
  //   },
  //   onError: () => {
  //     toast.error('Failed to update tweet')
  //   },
  // })

  // const scheduleTweetMutation = useMutation({
  //   mutationFn: async ({
  //     tweet,
  //     content,
  //     scheduledUnix,
  //     media,
  //     showToast = true,
  //   }: {
  //     tweet: MemoryTweet
  //     content: string
  //     scheduledUnix: number
  //     media: { s3Key: string; media_id: string }[]
  //     showToast?: boolean
  //   }) => {
  //     const promise = client.tweet.schedule.$post({
  //       content,
  //       scheduledUnix,
  //       media,
  //     })

  //     if (showToast) {
  //       const schedulePromiseToast = toast.promise(promise, {
  //         loading: 'Scheduling...',
  //         success: (
  //           <div className="flex gap-1.5 items-center">
  //             <p>Tweet scheduled!</p>
  //             <Link
  //               href="/studio/scheduled"
  //               className="text-base text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 rounded py-0.5 transition-colors"
  //             >
  //               See schedule
  //             </Link>
  //           </div>
  //         ),
  //       })

  //       return (await schedulePromiseToast).json()
  //     }

  //     return (await promise).json()
  //   },
  //   onSuccess: (data, variables) => {
  //     posthog.capture('tweet_scheduled', {
  //       tweetId: data.tweetId,
  //       accountId: data.accountId,
  //       accountName: data.accountName,
  //       content: variables.content,
  //       scheduledUnix: variables.scheduledUnix,
  //       media: variables.media,
  //     })

  //     queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })

  //     // variables.tweet.editor.update(
  //     //   () => {
  //     //     const root = $getRoot()
  //     //     root.clear()
  //     //     root.append($createParagraphNode())
  //     //   },
  //     //   { tag: 'force-sync' },
  //     // )

  //     // clearMediaFiles(variables.tweet.id)
  //   },
  //   onError: (error: HTTPException) => {
  //     if (error.status === 402) {
  //       toast(`🔒 ${error.message}`)
  //     } else {
  //       toast.error(error.message)
  //     }
  //   },
  // })

  // const handleScheduleTweet = (date: Date, time: string) => {
  //   const [hours, minutes] = time.split(':').map(Number)
  //   const scheduledDateTime = new Date(date)
  //   scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0)

  //   const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

  //   const now = new Date()

  //   if (scheduledDateTime <= now) {
  //     toast.error('Scheduled time must be in the future')
  //     return
  //   }

  //   if (!content.trim()) {
  //     toast.error('Tweet cannot be empty')
  //     return
  //   }

  //   const scheduledUnix = Math.floor(scheduledDateTime.getTime() / 1000)

  //   const media = mediaFiles
  //     .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
  //     .map((f) => ({
  //       s3Key: f.s3Key!,
  //       media_id: f.media_id!,
  //     }))

  //   if (editTweetId) {
  //     updateTweetMutation.mutate({
  //       tweetId: editTweetId,
  //       content,
  //       scheduledUnix,
  //       media,
  //     })
  //   } else {
  //     scheduleTweetMutation.mutate({
  //       content,
  //       scheduledUnix,
  //       media,
  //     })
  //   }
  // }

  // const handlePostTweet = () => {
  //   if (tweets.some((t) => t.editor.read(() => $getRoot().getTextContent()) === '')) {
  //     toast.error('Tweet cannot be empty')
  //     return
  //   }

  //   if (mediaFiles.some((f) => f.uploading)) {
  //     toast.error('Please wait for media uploads to complete')
  //     return
  //   }

  //   if (mediaFiles.some((f) => f.error)) {
  //     toast.error('Please remove failed media uploads')
  //     return
  //   }

  //   if (skipPostConfirmation) {
  //     performPostTweet()
  //   } else {
  //     setShowPostConfirmModal(true)
  //   }
  // }

  // const performPostTweet = () => {
  //   const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

  //   const media = mediaFiles
  //     .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
  //     .map((f) => ({
  //       s3Key: f.s3Key!,
  //       media_id: f.media_id!,
  //     }))

  //   // postTweetMutation.mutate({
  //   //   content,
  //   //   media,
  //   // })
  // }

  // const handleConfirmPost = () => {
  //   setShowPostConfirmModal(false)
  //   performPostTweet()
  // }

  // const handleUpdateTweet = () => {
  //   if (!editTweetId) return

  //   const content = shadowEditor?.read(() => $getRoot().getTextContent()) || ''

  //   if (!content.trim() && mediaFiles.length === 0) {
  //     toast.error('Tweet cannot be empty')
  //     return
  //   }

  //   if (mediaFiles.some((f) => f.uploading)) {
  //     toast.error('Please wait for media uploads to complete')
  //     return
  //   }

  //   if (mediaFiles.some((f) => f.error)) {
  //     toast.error('Please remove failed media uploads')
  //     return
  //   }

  //   let scheduledUnix: number | undefined

  //   if (editTweetData?.tweet?.scheduledFor) {
  //     scheduledUnix = Math.floor(
  //       new Date(editTweetData.tweet.scheduledFor).getTime() / 1000,
  //     )
  //   }

  //   if (!scheduledUnix) {
  //     toast.error('Scheduled time is required')
  //     return
  //   }

  //   const media = mediaFiles
  //     .filter((f) => Boolean(f.s3Key) && Boolean(f.media_id))
  //     .map((f) => ({
  //       s3Key: f.s3Key!,
  //       media_id: f.media_id!,
  //     }))

  //   updateTweetMutation.mutate({
  //     tweetId: editTweetId,
  //     content,
  //     scheduledUnix,
  //     media,
  //   })
  // }

  // const handleClearTweet = () => {
  //   abortControllersRef.current.forEach((controller) => {
  //     controller.abort('Tweet cleared')
  //   })

  //   abortControllersRef.current.clear()

  //   shadowEditor.update(
  //     () => {
  //       const root = $getRoot()
  //       root.clear()
  //       root.append($createParagraphNode())
  //     },
  //     { tag: 'force-sync' },
  //   )

  //   setMediaFiles([])
  // }

  const handleCancelEdit = () => {
    router.push('/studio/scheduled')
  }

  return (
    <div className="mt-2">
      {/* Thread container with connection logic like messages.tsx */}
      {Boolean(editMode) && (
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-indigo-600 rounded-full" />
            <p className="text-xs uppercase leading-8 text-indigo-600 font-medium">
              EDITING
            </p>
          </div>

          <button
            onClick={handleCancelEdit}
            className="text-xs hover:underline uppercase leading-8 text-red-500 font-medium flex items-center gap-1"
          >
            <X className="size-3" />
            Cancel Edit
          </button>
        </div>
      )}

      <div
        className={cn('relative w-full min-w-0 rounded-2xl', {
          'border p-6 border-black border-opacity-[0.01] bg-clip-padding group bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]':
            tweets.length > 1,
          'border border-indigo-300': editMode,
        })}
      >
        <div className={cn('relative z-50')}>
          {tweets.map((tweet, index) => {
            return (
              <div
                key={tweet.id}
                className={cn('relative z-50', {
                  'pt-6': index > 0,
                })}
              >
                <TweetItem
                  tweet={tweet}
                  index={index}
                  isDragging={isDragging}
                  isConnectedAfter={tweets.length > 1 && index < tweets.length - 1}
                  isConnectedBefore={index > 0}
                />

                {tweets.length > 1 && index < tweets.length - 1 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute z-10 left-5 top-[44px] w-0.5 bg-gray-200/75 h-[calc(100%+100px)]"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={() => addTweet({ initialContent: '' })}
        className="border border-dashed border-gray-300 bg-white rounded-lg px-3 py-1 flex items-center text-xs text-gray-600 mt-3 mx-auto"
      >
        <Plus className="size-3 mr-1" />
        Thread
      </button>
    </div>
  )
}
