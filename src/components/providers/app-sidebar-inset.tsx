'use client'

import { SidebarInset } from '../ui/sidebar'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ArrowLeftFromLine,
  ArrowRight,
  ArrowRightFromLine,
  CalendarIcon,
  PanelLeft,
} from 'lucide-react'
import DuolingoButton from '../ui/duolingo-button'
import { useSidebar } from '../ui/sidebar'
import TweetPostConfirmationDialog from '../tweet-post-confirmation-dialog'
import { useState } from 'react'
import { MemoryTweet, PayloadTweet, useTweetsV2 } from '@/hooks/use-tweets-v2'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useConfetti } from '@/hooks/use-confetti'
import { $getRoot } from 'lexical'
import posthog from 'posthog-js'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Modal } from '../ui/modal'
import { Calendar20 } from '../tweet-editor/date-picker'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { HTTPException } from 'hono/http-exception'
import { Tweet } from '@/db/schema'
import { pollTweetStatus } from '@/lib/poll-tweet-status'
import { AccountSwitcher } from '../account-switcher'

export function AppSidebarInset({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { state, toggleSidebar } = useSidebar()

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false)
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)

  const [rescheduledTime, setRescheduledTime] = useState<number | null>(null)
  const isCollapsed = state === 'collapsed'
  const { tweets, toPayloadTweet, reset } = useTweetsV2()
  const { fire } = useConfetti()
  const searchParams = useSearchParams()
  const editTweetId = searchParams?.get('edit')
  const pathname = usePathname()
  const router = useRouter()

  const editMode = Boolean(editTweetId)

  const { data: editTweetData } = useQuery<{ thread: Tweet[] }>({
    queryKey: ['edit-tweet', editTweetId],
    queryFn: async () => {
      if (!editTweetId) return { thread: [] }
      const res = await client.tweet.getThread.$get({ baseTweetId: editTweetId })
      return await res.json()
    },
    enabled: editMode && Boolean(editTweetId),
  })

  const { data: nextQueueSlot, isPending: isPendingQueueSlot } = useQuery({
    queryKey: ['next-queue-slot'],
    queryFn: async () => {
      const userNow = new Date()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      const res = await client.tweet.getNextQueueSlotV2.$get({
        userNow,
        timezone,
      })
      return await res.json()
    },
  })

  const { mutate: enqueueTweet, isPending: isQueueing } = useMutation({
    mutationFn: async ({ tweets }: { tweets: MemoryTweet[] }) => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const userNow = new Date()
      // temporarily disabled
      // const useNaturalTime = localStorage.getItem('useNaturalPostingTime') === 'true'

      const thread: PayloadTweet[] = tweets.map(toPayloadTweet)

      const res = await client.tweet.enqueue_tweet.$post({
        thread,
        timezone,
        userNow,
      })

      return await res.json()
    },
    onSuccess({ scheduledUnix }) {
      reset()
      queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
      queryClient.invalidateQueries({ queryKey: ['get-scheduled-tweet-count'] })

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
    onError: (err) => {
      if (err instanceof HTTPException) {
        toast.error(err.message)
        return
      }
      toast.error('Something went wrong. Please try again!')
    },
  })

  const scheduleTweetMutation = useMutation({
    mutationFn: async ({
      scheduledUnix,
      thread,
      showToast = true,
      useNaturalTime = false,
    }: {
      scheduledUnix: number
      thread: PayloadTweet[]
      showToast?: boolean
      useNaturalTime?: boolean
    }) => {
      const promise = client.tweet.schedule.$post({
        scheduledUnix,
        thread,
        useNaturalTime,
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
      reset()
      setIsScheduleDialogOpen(false)

      fire({
        particleCount: 200,
        spread: 160,
      })

      posthog.capture('tweet_scheduled', {
        tweetId: data.tweetId,
        accountId: data.accountId,
        accountName: data.accountName,
        scheduledUnix: variables.scheduledUnix,
      })

      queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
      queryClient.invalidateQueries({ queryKey: ['get-scheduled-tweet-count'] })
    },
    onError: (error: HTTPException) => {
      if (error.status === 402) {
        toast(`🔒 ${error.message}`)
      } else {
        toast.error(error.message)
      }
    },
  })

  const updateTweetMutation = useMutation({
    mutationFn: async ({
      scheduledUnix,
      thread,
      useNaturalTime = false,
    }: {
      scheduledUnix: number
      thread: PayloadTweet[]
      useNaturalTime?: boolean
    }) => {
      if (!scheduledUnix) {
        toast.error('Something went wrong, please reload the page.')
        return
      }

      if (!editTweetData || !editTweetData.thread?.[0]?.id) {
        toast.error('Something went wrong, please reload the page.')
        return
      }

      const res = await client.tweet.update.$post({
        baseTweetId: editTweetData?.thread?.[0]?.id,
        scheduledUnix,
        thread,
        useNaturalTime,
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

  const handleUpdateTweet = () => {
    if (!editTweetId) return

    if (
      tweets.some(
        (t) => t.editor?.read(() => $getRoot().getTextContent().trim()).trim() === '',
      )
    ) {
      toast.error('Tweet cannot be empty')
      return
    }

    if (tweets.some((t) => t.mediaFiles.some((f) => f.uploading))) {
      toast.error('Please wait for media uploads to complete')
      return
    }

    if (tweets.some((t) => t.mediaFiles.some((f) => f.error))) {
      toast.error('Please remove failed media uploads')
      return
    }

    let scheduledUnix: number | undefined

    if (rescheduledTime) {
      scheduledUnix = rescheduledTime
    } else if (editTweetData?.thread?.[0]?.scheduledUnix) {
      scheduledUnix = editTweetData.thread[0].scheduledUnix
    }

    if (!scheduledUnix) {
      toast.error('Scheduled time is required')
      return
    }

    updateTweetMutation.mutate({
      thread: tweets.map(toPayloadTweet),
      scheduledUnix,
    })
  }

  const handleScheduleTweet = (date: Date, time: string, useNaturalTime?: boolean) => {
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledDateTime = new Date(date)
    scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0)

    const now = new Date()

    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future')
      return
    }

    if (
      tweets.some(
        (f) => f.editor?.read(() => $getRoot().getTextContent().trim()).trim() === '',
      )
    ) {
      toast.error('Tweet cannot be empty')
      return
    }

    const scheduledUnix = scheduledDateTime.getTime()

    const thread = tweets.map(toPayloadTweet)

    scheduleTweetMutation.mutate({
      thread,
      scheduledUnix,
      useNaturalTime: useNaturalTime ?? false,
    })
  }

  const handleRescheduleTweet = (date: Date, time: string, useNaturalTime?: boolean) => {
    const [hours, minutes] = time.split(':').map(Number)
    const scheduledDateTime = new Date(date)
    scheduledDateTime.setHours(hours || 0, minutes || 0, 0, 0)

    const now = new Date()

    if (scheduledDateTime <= now) {
      toast.error('Scheduled time must be in the future')
      return
    }

    const scheduledUnix = Math.floor(scheduledDateTime.getTime())
    setRescheduledTime(scheduledUnix)
    setIsRescheduleDialogOpen(false)

    toast.success('New schedule time selected. Click Save to apply changes.')
  }

  const { mutate: postTweetImmediate, isPending: isPosting } = useMutation({
    mutationFn: async ({ tweets }: { tweets: MemoryTweet[] }) => {
      const thread: PayloadTweet[] = tweets.map(toPayloadTweet)

      const res = await client.tweet.postImmediate.$post({ thread })
      const { messageId, accountUsername } = await res.json()

      // Poll for completion
      const { twitterId } = await pollTweetStatus(messageId, {
        timeout: 10000,
        interval: 250,
      })

      return { accountUsername, tweetId: twitterId }
    },
    onMutate: () => {
      const toastId = toast.loading('Posting...')
      return { toastId }
    },
    onSuccess: (data, variables, context) => {
      if (context?.toastId) {
        toast.dismiss(context.toastId)
      }

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

      reset()
      fire({
        particleCount: 200,
        spread: 160,
      })

      // Analytics (uncomment when ready)
      // posthog.capture('tweet_posted', {
      //   tweetId: data.tweetId,
      //   accountUsername: data.accountUsername,
      // });
    },
    onError: (error: HTTPException, variables, context) => {
      if (context?.toastId) {
        toast.dismiss(context.toastId)
      }

      console.error('Failed to post tweet:', error)
      toast.error(error.message || 'Failed to post tweet')
    },
  })

  const handlePostImmediate = async () => {
    if (
      tweets.some(
        (f) => f.editor?.read(() => $getRoot().getTextContent().trim()).trim() === '',
      )
    ) {
      toast.error('Tweet cannot be empty')
      return
    }

    if (tweets.some((f) => f.mediaFiles.some((f) => f.uploading))) {
      toast.error('Please wait for media uploads to complete')
      return
    }

    if (tweets.some((f) => f.mediaFiles.some((f) => f.error))) {
      toast.error('Please remove failed media uploads')
      return
    }

    postTweetImmediate({ tweets })
  }

  const handleAddToQueue = async () => {
    if (
      tweets.some(
        (f) => f.editor?.read(() => $getRoot().getTextContent().trim()).trim() === '',
      )
    ) {
      toast.error('Tweet cannot be empty')
      return
    }

    if (tweets.some((f) => f.mediaFiles.some((f) => f.uploading))) {
      toast.error('Please wait for media uploads to complete')
      return
    }

    if (tweets.some((f) => f.mediaFiles.some((f) => f.error))) {
      toast.error('Please remove failed media uploads')
      return
    }

    enqueueTweet({ tweets })
  }

  const formatQueueSlot = (unix: number) => {
    const date = new Date(unix)
    if (isToday(date)) {
      return formatDistanceToNow(date, {
        addSuffix: true,
        includeSeconds: false,
      })
    }

    if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`
    }

    return format(date, 'MMM d h:mm a')
  }

  return (
    <>
      <TweetPostConfirmationDialog
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        onConfirm={handlePostImmediate}
        isPosting={isPosting}
      />

      <Modal
        showModal={isScheduleDialogOpen}
        setShowModal={setIsScheduleDialogOpen}
        className="max-w-2xl"
      >
        <div className="p-6 space-y-4">
          <div className="">
            <h2 className="text-lg font-semibold">Schedule</h2>
            {/* <p className="text-gray-500">All times in <span className="font-medium">Europe / Berlin</span> timezone</p> */}
          </div>

          <Calendar20
            editMode={editMode}
            onSchedule={handleScheduleTweet}
            isPending={scheduleTweetMutation.isPending}
            initialScheduledTime={
              editTweetData?.thread?.[0]?.scheduledUnix
                ? new Date(editTweetData.thread[0].scheduledUnix)
                : undefined
            }
          />
        </div>
      </Modal>

      <Modal
        showModal={isRescheduleDialogOpen}
        setShowModal={setIsRescheduleDialogOpen}
        className="max-w-2xl"
      >
        <div className="p-6 space-y-4">
          <div className="size-12 bg-gray-100 rounded-full flex items-center justify-center">
            <CalendarIcon className="size-6" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Reschedule Post</h2>
          </div>

          <Calendar20
            editMode={editMode}
            onSchedule={handleRescheduleTweet}
            isPending={updateTweetMutation.isPending}
            initialScheduledTime={
              editTweetData?.thread?.[0]?.scheduledUnix
                ? new Date(editTweetData.thread[0].scheduledUnix)
                : undefined
            }
          />
        </div>
      </Modal>

      <SidebarInset className="w-full flex-1 overflow-x-hidden bg-stone-100">
        {/* Dot Pattern Background */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.03)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)`,
              backgroundSize: '20px 20px',
              opacity: 0.5,
            }}
          />
        </div>

        <header className="relative z-20 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between">
          <div className="flex w-full justify-end items-center gap-2 px-4">
            <div className="flex items-center gap-2">
              {/* post & queue buttons */}
              {pathname === '/studio' && (
                <div>
                  {Boolean(editMode) ? (
                    <div className="flex items-center gap-2">
                      <DuolingoButton
                        onClick={() => setIsRescheduleDialogOpen(true)}
                        size="sm"
                        variant="secondary"
                        className="group/toggle-button"
                      >
                        <CalendarIcon className="size-3.5 mr-1.5" /> Reschedule
                      </DuolingoButton>
                      <DuolingoButton
                        onClick={handleUpdateTweet}
                        loading={updateTweetMutation.isPending}
                        size="sm"
                        className="group/toggle-button"
                      >
                        Save
                      </DuolingoButton>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DuolingoButton
                                onClick={() => setIsScheduleDialogOpen(true)}
                                size="sm"
                                className="group/toggle-button rounded-r-none h-10"
                              >
                                Schedule
                              </DuolingoButton>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="bg-stone-800 text-white p-2.5"
                            >
                              <div className="text-left">
                                <div className="">Schedule</div>
                                <div className="text-xs opacity-70">
                                  Pick a time for this post
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DuolingoButton
                                loading={isQueueing}
                                size="icon"
                                onClick={handleAddToQueue}
                                className="group/toggle-button rounded-l-none px-4"
                              >
                                <ArrowRight className="size-4 shrink-0" />
                              </DuolingoButton>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="bg-stone-800 text-white p-2.5"
                            >
                              <div className="text-left">
                                <div className="">Next free slot</div>
                                <div className="text-xs opacity-70">
                                  {isPendingQueueSlot
                                    ? 'Checking...'
                                    : nextQueueSlot?.scheduledDate
                                      ? formatQueueSlot(nextQueueSlot.scheduledUnix)
                                      : 'No slots available'}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DuolingoButton
                              size="sm"
                              onClick={() => setIsPostDialogOpen(true)}
                              className="group/toggle-button h-10"
                            >
                              Post
                            </DuolingoButton>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            className="bg-stone-800 text-white p-2.5"
                          >
                            <div className="text-left">
                              <div className="">Review & post</div>
                              <div className="text-xs opacity-70">
                                A confirmation modal will open
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
              )}
            </div>

           
                  <AccountSwitcher />
               

            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DuolingoButton
                    variant="secondary"
                    size="icon"
                    onClick={toggleSidebar}
                    className="group/toggle-button shrink-0 h-10"
                  >
                    <PanelLeft className="h-4 w-4 transition-all duration-200 group-hover/toggle-button:opacity-0 group-hover/toggle-button:scale-75" />
                    <div className="absolute transition-all duration-200 opacity-0 scale-75 group-hover/toggle-button:opacity-100 group-hover/toggle-button:scale-100">
                      {isCollapsed ? (
                        <ArrowLeftFromLine className="h-4 w-4" />
                      ) : (
                        <ArrowRightFromLine className="h-4 w-4" />
                      )}
                    </div>
                  </DuolingoButton>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-stone-800 text-white ">
                  Toggle Sidebar
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </header>
        {children}
      </SidebarInset>
    </>
  )
}
