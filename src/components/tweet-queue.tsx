'use client'

import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, format, isToday, isTomorrow, startOfDay } from 'date-fns'
import { motion } from 'framer-motion'
import { ArrowRight, Edit, MoreHorizontal, Send, Trash2 } from 'lucide-react'

import { useConfetti } from '@/hooks/use-confetti'

import { Tweet, user } from '@/db/schema'
import {
  AccountAvatar,
  AccountHandle,
  AccountName,
  mapToConnectedAccount,
} from '@/hooks/account-ctx'
import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { CaretRightIcon, EyeIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Loader } from './ai-elements/loader'
import MediaDisplay from './media-display'
import TweetPostConfirmationDialog from './tweet-post-confirmation-dialog'
import { Card } from './ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import DuolingoButton from './ui/duolingo-button'
import { Separator } from './ui/separator'
import { useRealtime } from '@upstash/realtime/client'
import { RealtimeEvents } from '@/lib/realtime'
import { authClient } from '@/lib/auth-client'

export default function TweetQueue({
  setSettingsOpen,
}: {
  setSettingsOpen: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const { fire } = useConfetti()
  const [pendingPostId, setPendingPostId] = useState<string | null>(null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null)
  const { loadThread } = useTweetsV2()
  const { data: session } = authClient.useSession()

  // realtime stuff
  const [channels, setChannels] = useState<string[]>([])
  const [statusMap, setStatusMap] = useState<
    Record<
      // base tweet id
      string,
      {
        status: string
        timestamp?: number
        twitterTweetId?: string
        databaseTweetId?: string
      }
    >
  >({})

  const [, setTick] = useState(0)

  const router = useRouter()

  const userNow = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  useRealtime<RealtimeEvents>({
    channels: channels.map((channel) => session?.user.id + '-' + channel),
    enabled: Boolean(session?.user.id) && Boolean(channels.length),
    event: 'tweet.status',
    history: true,
    onData: ({ databaseTweetId, twitterTweetId, status, timestamp }) => {
      setStatusMap((prev) => {
        return {
          ...prev,
          [databaseTweetId]: { status, timestamp, twitterTweetId, databaseTweetId },
        }
      })

      if (status === 'success' || status === 'error') {
        const allThreads = data?.results.flatMap((result) => {
          const [day, threads] = Object.entries(result)[0]!
          return threads.map((slot) => slot.thread)
        })

        const hasBeenProcessed = allThreads?.some((thread) =>
          thread.some(
            (tweet) =>
              tweet.id === databaseTweetId && (tweet.isPublished || tweet.isError),
          ),
        )

        if (hasBeenProcessed) {
          return
        }

        queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
      }
    },
  })

  useEffect(() => {
    const hasWaitingStatus = Object.values(statusMap).some((s) => s.status === 'waiting')

    if (!hasWaitingStatus) return

    const interval = setInterval(() => {
      setTick((t) => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [statusMap])

  const { data: activeAccount } = useQuery({
    queryKey: ['get-active-account'],
    queryFn: async () => {
      const res = await client.settings.active_account.$get()
      const { account } = await res.json()
      return account ? mapToConnectedAccount(account) : null
    },
  })

  const { data, isPending } = useQuery({
    queryKey: ['queue-slots', activeAccount?.id],
    queryFn: async () => {
      const res = await client.tweet.get_queue.$get({ timezone, userNow })
      return await res.json()
    },
  })

  // useEffect(() => {
  //   if (!data?.results) return

  //   const allThreads = data.results.flatMap((result) => {
  //     const [day, threads] = Object.entries(result)[0]!
  //     return threads.map((slot) => slot.thread)
  //   })

  //   setChannels((currentChannels) => {
  //     const channelsToRemove = currentChannels.filter((baseTweetId) => {
  //       const thread = allThreads.find((t) => t?.[0]?.id === baseTweetId)
  //       if (!thread || thread.length === 0) return false

  //       const allPublished = thread.every((tweet) => tweet.isPublished)
  //       const allHaveSuccessStatus = thread.every(
  //         (tweet) => statusMap[tweet.id]?.status === 'success',
  //       )

  //       return allPublished || allHaveSuccessStatus
  //     })

  //     if (channelsToRemove.length === 0) return currentChannels

  //     return currentChannels.filter((c) => !channelsToRemove.includes(c))
  //   })
  // }, [data, statusMap])

  // if any tweets are being posted, subscribe
  useEffect(() => {
    const allThreads = data?.results.flatMap((result) => {
      const [day, threads] = Object.entries(result)[0]!
      const dayUnix = Number(day)
      return threads.map((slot) => ({ dayUnix, ...slot }))
    })

    const processingIds = new Set<string>()

    allThreads?.forEach(({ thread }) => {
      const hasPublished = thread?.some((tweet) => tweet.isPublished)
      const hasUnpublished = thread?.some((tweet) => !tweet.isPublished)
      const hasProcessing = hasPublished && hasUnpublished
      const hasAnyProcessingTweet = thread?.some((tweet) => tweet.isProcessing)

      if (!hasProcessing && !hasAnyProcessingTweet) return

      const baseTweetId = thread?.[0]?.id
      if (!baseTweetId) return

      processingIds.add(baseTweetId)
    })

    const newChannels = Array.from(processingIds)
    setChannels((prev) => {
      const combined = [...new Set([...prev, ...newChannels])]
      return combined
    })
  }, [data])

  const { mutate: deleteTweet } = useMutation({
    mutationFn: async (tweetId: string) => {
      const promise = client.tweet.delete.$post({ id: tweetId })

      toast.promise(promise, {
        loading: 'Deleting...',
        success: '🗑️ Tweet deleted & unscheduled',
        error: 'Unable to delete tweet',
      })

      const res = await promise
      return await res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
      queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
    },
  })

  const toastRef = useRef<string | null>(null)

  const { mutate: postImmediateFromQueue, isPending: isPosting } = useMutation({
    mutationFn: async ({
      baseTweetId,
      useAutoDelay,
    }: {
      baseTweetId: string
      useAutoDelay?: boolean
    }) => {
      const res = await client.tweet.postImmediateFromQueue.$post({
        baseTweetId,
        useAutoDelay,
      })
      const { messageId, accountUsername, hasExpiredMedia } = await res.json()

      return { baseTweetId, messageId, accountUsername, hasExpiredMedia }
    },
    onMutate: async ({ baseTweetId }) => {
      toastRef.current = toast.loading('Preparing tweet...')

      setStatusMap((prev) => {
        return { ...prev, [baseTweetId]: { status: 'started', timestamp: Date.now() } }
      })

      return { toastId: toastRef.current }
    },
    onSuccess: (data, variables, context) => {
      if (toastRef.current) {
        toast.dismiss(toastRef.current)
        toastRef.current = null
      }

      setChannels((prev) => [...prev, data.baseTweetId])

      setPendingPostId(null)

      queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
      queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })

      if (data.hasExpiredMedia) {
        toast.success(
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-medium">Tweet is being prepared!</p>
              <p className="text-sm text-gray-600">
                We're uploading your media to Twitter now.
              </p>
            </div>
            <Link
              href="/studio/scheduled"
              className="text-sm text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 transition-colors"
            >
              See status <ArrowRight className="size-3.5" />
            </Link>
          </div>,
          { duration: 8000 },
        )
      } else {
        toast.success(
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-medium">Tweet is being prepared!</p>
            </div>
            <Link
              href="/studio/scheduled"
              className="text-sm text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 transition-colors"
            >
              See status <ArrowRight className="size-3.5" />
            </Link>
          </div>,
          { duration: 6000 },
        )
      }

      fire({
        particleCount: 200,
        spread: 160,
      })
    },
    onError: (error, variables, context) => {
      if (toastRef.current) {
        toast.dismiss(toastRef.current)
        toastRef.current = null
      }

      console.error('Failed to post tweet:', error)
      toast.error('Failed to post tweet')
    },
  })

  if (isPending) {
    return (
      <div className="flex items-center justify-center text-center py-12 gap-2">
        <Loader />
        <p className="text-stone-500">Loading your queue...</p>
      </div>
    )
  }

  const renderDay = (unix: number) => {
    const date = new Date(unix)
    const weekday = format(date, 'EEEE')
    const monthDay = format(date, 'MMM d')
    const daysAway = differenceInDays(startOfDay(date), startOfDay(userNow))

    if (isToday(unix)) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">Today</span>
          <span className="text-gray-400">{weekday}</span>
        </div>
      )
    }

    if (isTomorrow(unix)) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">Tomorrow</span>
          <span className="text-gray-400">{weekday}</span>
        </div>
      )
    }

    if (daysAway <= 6) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{weekday}</span>

          <span className="text-gray-400">
            in {daysAway} day{daysAway === 1 ? '' : 's'}
          </span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">{weekday}</span>
        <span className="text-gray-400">{monthDay}</span>
      </div>
    )
  }

  const allThreads = data?.results.flatMap((result) => {
    const [day, threads] = Object.entries(result)[0]!
    const dayUnix = Number(day)
    return threads.map((slot) => ({ dayUnix, ...slot }))
  })

  const pendingThread =
    allThreads?.find((t) => t.thread?.[0]?.id === pendingPostId)?.thread || []
  const pendingThreadLength = pendingThread.length

  return (
    <>
      <TweetPostConfirmationDialog
        open={Boolean(pendingPostId)}
        onOpenChange={(open) => setPendingPostId(open ? pendingPostId : null)}
        onConfirm={(useAutoDelay) => {
          if (pendingPostId) {
            postImmediateFromQueue({ baseTweetId: pendingPostId, useAutoDelay })
          }
        }}
        isPosting={isPosting}
        threadLength={pendingThreadLength}
      />

      <p className="text-gray-500 mb-3">
        All times in{' '}
        <span
          onClick={() => {
            setSettingsOpen(true)
          }}
          className="bg-gray-100 font-medium text-gray-700 px-1.5 py-0.5 cursor-pointer rounded-md"
        >
          Europe &gt; Berlin
        </span>{' '}
        timezone.
      </p>

      <Card className="overflow-hidden p-0">
        <div className="flow-root">
          <div className="">
            <table className="min-w-full">
              <thead className="bg-gray-100 hidden">
                <tr>
                  <th
                    scope="col"
                    className="py-3.5 min-w-[150px] pr-3 pl-4 text-left text-base font-semibold text-gray-500 sm:pl-3"
                  >
                    Time
                  </th>
                  <th
                    scope="col"
                    className="px-3 min-w-[150px] py-3.5 text-left text-base font-semibold text-gray-500"
                  >
                    Status
                  </th>

                  <th
                    scope="col"
                    className="px-3 py-3.5 w-full text-left text-base font-semibold text-gray-500"
                  >
                    Content
                  </th>
                  <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {data?.results.map((result) => {
                  const [day, threads] = Object.entries(result)[0]!
                  const dayUnix = Number(day)

                  return (
                    <Fragment key={day}>
                      <tr className="w-full border-t border-gray-200">
                        <th
                          scope="colgroup"
                          colSpan={5}
                          className="bg-gray-100 px-4 py-2.5 w-full text-left text-base font-semibold text-gray-900"
                        >
                          {renderDay(dayUnix)}
                        </th>
                      </tr>
                      {threads.length === 0 ? (
                        <tr className="border-t border-gray-300 bg-gray-50 opacity-50 bg-[image:repeating-linear-gradient(315deg,rgba(209,213,219,0.2)_0,rgba(209,213,219,0.2)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px]">
                          <td
                            colSpan={5}
                            className="py-2.5 pr-3 pl-4 text-sm font-medium text-gray-500 sm:pl-3"
                          >
                            {isToday(dayUnix) ? 'No more open slots' : 'No slots set'}
                          </td>
                        </tr>
                      ) : (
                        threads.map(({ unix, thread, isQueued }, slotIdx) => {
                          const baseTweet = thread?.[0]
                          const threadLength = thread?.length || 0

                          const hasPublished = thread?.some((tweet) => tweet.isPublished)
                          const hasUnpublished = thread?.some(
                            (tweet) => !tweet.isPublished,
                          )
                          const isThreadProcessing = hasPublished && hasUnpublished
                          const isAnyTweetActivelyPosting = thread?.some((tweet) => {
                            const status = statusMap[tweet.id]?.status
                            return (
                              status === 'started' ||
                              status === 'waiting' ||
                              status === 'pending'
                            )
                          })

                          return (
                            <tr
                              key={slotIdx}
                              className={cn(
                                'relative group transition-opacity',
                                slotIdx === 0 ? 'border-gray-300' : 'border-gray-200',
                                'border-t',
                                !baseTweet && [
                                  'bg-[image:repeating-linear-gradient(315deg,rgba(209,213,219,0.2)_0,rgba(209,213,219,0.2)_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px]',
                                  'bg-gray-50 opacity-50',
                                ],
                              )}
                            >
                              <td
                                className={cn(
                                  'min-w-[150px] pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 align-top',
                                  baseTweet ? 'py-4' : 'py-2.5',
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span>
                                    {format(unix, 'hh:mm')}
                                    <span className="ml-1 uppercase">
                                      {format(unix, "aaaaa'm'")}
                                    </span>
                                  </span>
                                </div>
                              </td>
                              <td
                                className={cn(
                                  'min-w-[150px] px-3 text-sm whitespace-nowrap align-top',
                                  baseTweet ? 'py-4' : 'py-2.5',
                                )}
                              >
                                {baseTweet?.isError ? (
                                  <span className="text-sm font-medium text-red-600">
                                    Error
                                  </span>
                                ) : isThreadProcessing || isAnyTweetActivelyPosting ? (
                                  <span className="text-sm inline-flex items-center gap-1.5 font-medium text-gray-500">
                                    <Loader className="size-3.5" /> Posting
                                  </span>
                                ) : baseTweet?.isProcessing ? (
                                  <span className="text-sm inline-flex items-center gap-1.5 font-medium text-gray-500">
                                    <Loader className="size-3.5" /> Processing
                                  </span>
                                ) : baseTweet?.isPublished && baseTweet.twitterId ? (
                                  <Link
                                    href={`https://x.com/${activeAccount?.username}/status/${baseTweet?.twitterId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm underline inline-flex items-center gap-1.5 font-medium text-emerald-500"
                                  >
                                    Posted <EyeIcon weight="bold" className="size-3.5" />
                                  </Link>
                                ) : baseTweet?.isQueued ? (
                                  <span className="text-sm font-medium text-indigo-500">
                                    Queued
                                  </span>
                                ) : baseTweet ? (
                                  <span className="text-sm font-medium text-indigo-500">
                                    Scheduled
                                  </span>
                                ) : (
                                  <span className="text-sm font-medium text-gray-500">
                                    Empty
                                  </span>
                                )}
                              </td>

                              <td
                                className={cn(
                                  'px-3 w-full text-sm text-gray-900 align-top',
                                  baseTweet ? 'py-4' : 'py-2.5',
                                )}
                              >
                                {baseTweet ? (
                                  <div className="space-y-3">
                                    {thread.map((tweet, index) => {
                                      const hasMedia =
                                        tweet.media && tweet.media.length > 0
                                      const mediaTypes = hasMedia
                                        ? tweet.media.reduce(
                                            (acc, m) => {
                                              if (m.type === 'video') acc.videos++
                                              else acc.images++
                                              return acc
                                            },
                                            { images: 0, videos: 0 },
                                          )
                                        : null

                                      const statusInfo = statusMap[tweet.id]
                                      const status = statusInfo?.status

                                      const getRemainingSeconds = () => {
                                        if (
                                          status !== 'waiting' ||
                                          !statusInfo?.timestamp
                                        )
                                          return null
                                        const elapsed = Math.floor(
                                          (Date.now() - statusInfo.timestamp) / 1000,
                                        )
                                        const remaining = Math.max(0, 60 - elapsed)
                                        return remaining
                                      }

                                      const remainingSeconds = getRemainingSeconds()

                                      return (
                                        <div
                                          key={index}
                                          className={cn('relative', index > 0 && 'pt-3')}
                                        >
                                          {index === 0 && tweet.properties?.length ? (
                                            <div
                                              className={cn('flex gap-2', {
                                                'mb-3':
                                                  tweet.properties?.includes('natural') ||
                                                  (tweet.properties?.includes(
                                                    'auto-delay',
                                                  ) &&
                                                    thread.length > 1),
                                              })}
                                            >
                                              {tweet.properties?.includes('natural') && (
                                                <span className="inline-flex items-center gap-x-1.5 rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                                                  <svg
                                                    viewBox="0 0 6 6"
                                                    aria-hidden="true"
                                                    className="size-1.5 fill-emerald-500"
                                                  >
                                                    <circle r={3} cx={3} cy={3} />
                                                  </svg>
                                                  Natural time
                                                </span>
                                              )}

                                              {tweet.properties?.includes('auto-delay') &&
                                                thread.length > 1 && (
                                                  <span className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                                    <svg
                                                      viewBox="0 0 6 6"
                                                      aria-hidden="true"
                                                      className="size-1.5 fill-blue-500"
                                                    >
                                                      <circle r={3} cx={3} cy={3} />
                                                    </svg>
                                                    Auto-delay
                                                  </span>
                                                )}
                                            </div>
                                          ) : null}

                                          <div className="flex gap-3">
                                            <div
                                              className={cn(
                                                'relative z-10 flex-none bg-white h-fit',
                                                {
                                                  'pb-2': index < thread.length - 1,
                                                  'pt-2':
                                                    index > 0 &&
                                                    index <= thread.length - 1,
                                                },
                                              )}
                                            >
                                              <AccountAvatar className="size-8 shrink-0" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 mb-0.5">
                                                <AccountName className="text-sm font-medium text-gray-800" />
                                                <AccountHandle className="text-sm text-stone-400 truncate" />
                                                {status === 'pending' ||
                                                status === 'started' ? (
                                                  <div className="text-sm inline-flex items-center gap-1.5 font-medium text-gray-500">
                                                    <Loader className="size-3.5" />{' '}
                                                    Posting
                                                  </div>
                                                ) : status === 'waiting' ||
                                                  tweet.isProcessing ? (
                                                  <div className="text-sm inline-flex items-center gap-1.5 font-medium text-gray-500">
                                                    <Loader className="size-3.5" />{' '}
                                                    Waiting{' '}
                                                    {remainingSeconds !== null &&
                                                    remainingSeconds > 0
                                                      ? `${remainingSeconds}s`
                                                      : '...'}
                                                  </div>
                                                ) : status === 'success' ||
                                                  (tweet.isPublished &&
                                                    tweet.twitterId) ? (
                                                  <Link
                                                    href={`https://x.com/${activeAccount?.username}/status/${baseTweet?.twitterId || tweet.twitterId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm underline inline-flex items-center gap-1.5 font-medium text-emerald-500"
                                                  >
                                                    Posted
                                                    <EyeIcon
                                                      weight="bold"
                                                      className="size-3.5"
                                                    />
                                                  </Link>
                                                ) : null}
                                              </div>
                                              <p className="text-gray-900 whitespace-pre-line text-sm leading-relaxed">
                                                {tweet.content || 'No content'}
                                              </p>
                                              {hasMedia && mediaTypes && (
                                                <Collapsible>
                                                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors py-1 group mt-2">
                                                    <CaretRightIcon
                                                      weight="bold"
                                                      className="size-3 transition-transform group-data-[state=open]:rotate-90"
                                                    />

                                                    <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                                                      {mediaTypes.images > 0 && (
                                                        <div className="flex items-center gap-1">
                                                          <p>
                                                            Show image
                                                            {mediaTypes.images > 1
                                                              ? 's'
                                                              : ''}
                                                          </p>
                                                          <span>
                                                            ({mediaTypes.images})
                                                          </span>
                                                        </div>
                                                      )}
                                                      {mediaTypes.videos > 0 && (
                                                        <div className="flex items-center gap-1">
                                                          <p>
                                                            Show video
                                                            {mediaTypes.videos > 1
                                                              ? 's'
                                                              : ''}
                                                          </p>
                                                          <span>{mediaTypes.videos}</span>
                                                        </div>
                                                      )}
                                                    </div>
                                                  </CollapsibleTrigger>
                                                  <CollapsibleContent className="mt-2">
                                                    <MediaDisplay
                                                      mediaFiles={tweet.media}
                                                    />
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              )}
                                            </div>
                                          </div>
                                          {thread.length > 1 &&
                                            index < thread.length - 1 && (
                                              <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: '100%' }}
                                                transition={{ duration: 0.3 }}
                                                className={cn(
                                                  'absolute z-0 left-4 top-8 w-0.5 bg-gray-200/75 h-full',
                                                  {
                                                    // offset badges
                                                    'top-11':
                                                      tweet.properties?.includes(
                                                        'natural',
                                                      ) ||
                                                      tweet.properties?.includes(
                                                        'auto-delay',
                                                      ),
                                                  },
                                                )}
                                              />
                                            )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : null}
                              </td>
                              <td
                                className={cn(
                                  'pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-3 align-top',
                                  baseTweet ? 'py-4' : 'py-2.5',
                                )}
                              >
                                {baseTweet && (
                                  <>
                                    <DropdownMenu
                                      open={openDropdownId === baseTweet.id}
                                      onOpenChange={(open) =>
                                        setOpenDropdownId(open ? baseTweet.id : null)
                                      }
                                    >
                                      <DropdownMenuTrigger
                                        disabled={
                                          baseTweet.isProcessing || baseTweet.isPublished
                                        }
                                        className={cn(
                                          baseTweet.isProcessing || baseTweet.isPublished
                                            ? 'opacity-50 cursor-not-allowed'
                                            : '',
                                        )}
                                        asChild
                                      >
                                        <DuolingoButton
                                          variant="secondary"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <MoreHorizontal className="size-4" />
                                          <span className="sr-only">Tweet options</span>
                                        </DuolingoButton>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          className="mb-1 w-full"
                                          onClick={() => {
                                            if (baseTweet) {
                                              router.push(`/studio?edit=${baseTweet.id}`)

                                              loadThread(thread)

                                              queryClient.setQueryData<{
                                                thread: Partial<Tweet>[]
                                              }>(['edit-tweet', baseTweet.id], {
                                                thread,
                                              })
                                            }
                                          }}
                                        >
                                          <Edit className="size-4 mr-1" />
                                          <div className="flex flex-col">
                                            <p>Edit</p>
                                            <p className="text-xs text-gray-500">
                                              Open this{' '}
                                              {threadLength > 1 ? 'thread' : 'tweet'} in
                                              the editor.
                                            </p>
                                          </div>
                                        </DropdownMenuItem>

                                        <Separator />

                                        <DropdownMenuItem
                                          className="my-1 w-full"
                                          onClick={() => setPendingPostId(baseTweet.id)}
                                        >
                                          <Send className="size-4 mr-1" />
                                          <div className="flex items-start flex-col">
                                            <p>Post Now</p>
                                            <p className="text-xs text-gray-500">
                                              A confirmation model will open.
                                            </p>
                                          </div>
                                        </DropdownMenuItem>

                                        <Separator />

                                        <DropdownMenuItem
                                          variant="destructive"
                                          className="mt-1 w-full"
                                          onClick={() => deleteTweet(baseTweet!.id)}
                                        >
                                          <Trash2 className="size-4 mr-1 text-red-600" />
                                          <div className="flex text-red-600 flex-col">
                                            <p>Delete</p>
                                            <p className="text-xs text-red-600">
                                              Delete this{' '}
                                              {threadLength > 1 ? 'thread' : 'tweet'} from
                                              the queue.
                                            </p>
                                          </div>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </>
  )
}
