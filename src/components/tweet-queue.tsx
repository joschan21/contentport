'use client'

import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  format,
  isThisWeek,
  isToday,
  isTomorrow,
  differenceInDays,
  isWeekend,
  startOfDay,
} from 'date-fns'
import { ArrowRight, Clock, Edit, MoreHorizontal, Send, Trash2 } from 'lucide-react'

import { useConfetti } from '@/hooks/use-confetti'

import { Tweet } from '@/db/schema'
import { AccountHandle, AccountName } from '@/hooks/account-ctx'
import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Icons } from './icons'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import DuolingoBadge from './ui/duolingo-badge'
import DuolingoButton from './ui/duolingo-button'
import { Separator } from './ui/separator'
import { Loader } from './ai-elements/loader'

export default function TweetQueue() {
  const queryClient = useQueryClient()
  const { fire } = useConfetti()
  const [pendingPostId, setPendingPostId] = useState<string | null>(null)
  const { loadThread } = useTweetsV2()

  const router = useRouter()

  const userNow = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { data, isPending } = useQuery({
    queryKey: ['queue-slots'],
    queryFn: async () => {
      const res = await client.tweet.get_queue.$get({ timezone, userNow })
      return await res.json()
    },
  })

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
    mutationFn: async ({ tweetId }: { tweetId: string }) => {
      const res = await client.tweet.postImmediateFromQueue.$post({
        baseTweetId: tweetId,
      })
      const { messageId, accountUsername, hasExpiredMedia } = await res.json()

      return { messageId, accountUsername, hasExpiredMedia }
    },
    onMutate: async () => {
      toastRef.current = toast.loading('Preparing tweet...')
      return { toastId: toastRef.current }
    },
    onSuccess: (data, variables, context) => {
      if (toastRef.current) {
        toast.dismiss(toastRef.current)
        toastRef.current = null
      }

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
              href="/studio/posted"
              className="text-sm text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 transition-colors"
            >
              Check status in Posted Tweets <ArrowRight className="size-3.5" />
            </Link>
          </div>,
          { duration: 8000 },
        )
      } else {
        toast.success(
          <div className="flex flex-col gap-3">
            <div>
              <p className="font-medium">Tweet is being posted!</p>
            </div>
            <Link
              href="/studio/posted"
              className="text-sm text-indigo-600 decoration-2 underline-offset-2 flex items-center gap-1 underline shrink-0 bg-white/10 hover:bg-white/20 transition-colors"
            >
              Check status in Posted Tweets <ArrowRight className="size-3.5" />
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
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900">Today</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">
            {weekday}, {monthDay}
          </span>
        </div>
      )
    }

    if (isTomorrow(unix)) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900">Tomorrow</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">
            {weekday}, {monthDay}
          </span>
        </div>
      )
    }

    if (daysAway <= 6) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900">{weekday}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">{monthDay}</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">
            in {daysAway} day{daysAway === 1 ? '' : 's'}
          </span>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-gray-900">{weekday}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{monthDay}</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {data?.results.map((result) => {
          const [day, threads] = Object.entries(result)[0]!

          const dayUnix = Number(day)

          if (threads.length === 0) {
            const emptyDayMessage = isToday(dayUnix)
              ? `No more open slots`
              : 'No slots set'

            return (
              <Card key={day} className={cn('overflow-hidden opacity-50')}>
                <CardHeader className="pb-0 block">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {renderDay(dayUnix)}{' '}
                    <p className="text-gray-500">- {emptyDayMessage}</p>
                  </CardTitle>
                </CardHeader>
              </Card>
            )
          }

          return (
            <Card key={day} className={cn('overflow-hidden')}>
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {renderDay(dayUnix)}
                  {/* {isWeekendDay && (
                    <DuolingoBadge variant="gray" className="text-xs">
                      Weekend
                    </DuolingoBadge>
                  )} */}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: 'auto 1fr auto' }}
                >
                  {threads.map(({ unix, thread, isQueued }, i) => {
                    const baseTweet = thread?.[0]
                    const threadLength = thread?.length || 0

                    return (
                      <Fragment key={i}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-2 w-[100px]">
                              <Clock className="size-4 text-stone-500" />
                              <span className="font-medium text-sm text-stone-700">
                                {format(unix, "hh:mmaaaaa'm'")}
                              </span>
                            </div>
                            <div className="flex w-[65px] items-start justify-center gap-2">
                              {isQueued ? (
                                <DuolingoBadge
                                  variant={baseTweet ? 'achievement' : 'gray'}
                                  className="text-xs"
                                >
                                  {baseTweet ? 'Queued' : 'Empty'}
                                </DuolingoBadge>
                              ) : baseTweet ? (
                                <DuolingoBadge variant="amber" className="text-xs">
                                  Manual
                                </DuolingoBadge>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div
                          className={cn(
                            'px-4 py-3 rounded-lg border',
                            baseTweet
                              ? 'bg-white border-stone-200 shadow-sm'
                              : 'bg-stone-50 border-dashed border-stone-300',
                          )}
                        >
                          {baseTweet ? (
                            <div className="space-y-3">
                              {thread.map((tweet, index) => (
                                <div
                                  key={index}
                                  className={cn(
                                    'space-y-2',
                                    index > 0 && 'border-l-2 border-stone-200 pl-3',
                                  )}
                                >
                                  {index > 0 && (
                                    <div className="text-xs text-stone-500 font-medium">
                                      Tweet {index + 1}
                                    </div>
                                  )}
                                  <p className="text-stone-900 whitespace-pre-line text-sm leading-relaxed">
                                    {tweet.content || 'No content'}
                                  </p>
                                  {tweet.media && tweet.media.length > 0 && (
                                    <div className="text-xs text-stone-500">
                                      📎 {tweet.media.length} media file
                                      {tweet.media.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-stone-500">
                              <span className="text-sm">Empty slot</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center">
                          {baseTweet && (
                            <Dialog
                              open={pendingPostId === baseTweet.id}
                              onOpenChange={(open) => {
                                setPendingPostId(open ? baseTweet.id : null)
                              }}
                            >
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
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
                                      <p className="text-xs text-stone-500">
                                        Open this {threadLength > 1 ? 'thread' : 'tweet'}{' '}
                                        in the editor.
                                      </p>
                                    </div>
                                  </DropdownMenuItem>

                                  <Separator />

                                  <DropdownMenuItem asChild className="my-1 w-full">
                                    <DialogTrigger>
                                      <Send className="size-4 mr-1" />
                                      <div className="flex items-start flex-col">
                                        <p>Post Now</p>
                                        <p className="text-xs text-stone-500">
                                          A confirmation model will open.
                                        </p>
                                      </div>
                                    </DialogTrigger>
                                  </DropdownMenuItem>

                                  <Separator />

                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="mt-1 w-full"
                                    onClick={() => deleteTweet(baseTweet!.id)}
                                  >
                                    <Trash2 className="size-4 mr-1 text-red-600" />
                                    <div className="flex text-red-600  flex-col">
                                      <p>Delete</p>
                                      <p className="text-xs text-red-600">
                                        Delete this{' '}
                                        {threadLength > 1 ? 'thread' : 'tweet'} from the
                                        queue.
                                      </p>
                                    </div>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>

                              <DialogContent className="bg-white rounded-2xl p-6">
                                <div className="size-12 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Icons.twitter className="size-6" />
                                </div>
                                <DialogHeader className="py-2">
                                  <DialogTitle className="text-lg font-semibold">
                                    Post to Twitter
                                  </DialogTitle>
                                  <DialogDescription>
                                    This {threadLength > 1 ? 'thread' : 'tweet'} will be
                                    posted and removed from your queue immediately. Would
                                    you like to continue?
                                  </DialogDescription>
                                  <DialogDescription>
                                    <span className="font-medium text-gray-900">
                                      Posting as:
                                    </span>{' '}
                                    <AccountName className="font-normal text-gray-600" />{' '}
                                    (
                                    <AccountHandle className="text-gray-600" />)
                                  </DialogDescription>
                                </DialogHeader>

                                <DialogFooter>
                                  <DialogClose asChild>
                                    <DuolingoButton
                                      variant="secondary"
                                      size="sm"
                                      className="h-11"
                                    >
                                      Cancel
                                    </DuolingoButton>
                                  </DialogClose>
                                  <DuolingoButton
                                    loading={isPosting}
                                    size="sm"
                                    className="h-11"
                                    onClick={(e) => {
                                      e.preventDefault()

                                      postImmediateFromQueue({ tweetId: baseTweet.id })
                                    }}
                                  >
                                    <Icons.twitter className="size-4 mr-2" />
                                    {isPosting ? 'Posting...' : 'Post Now'}
                                  </DuolingoButton>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </Fragment>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
