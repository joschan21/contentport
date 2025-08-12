'use client'

import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isThisWeek, isToday, isTomorrow } from 'date-fns'
import { Clock, Edit, MoreHorizontal, Send, Trash2 } from 'lucide-react'

import { useConfetti } from '@/hooks/use-confetti'

import { Tweet, TweetQuery } from '@/db/schema'
import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { Fragment, useState } from 'react'
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
import { Loader } from './ui/loader'
import { Separator } from './ui/separator'

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

  const { mutate: postImmediateFromQueue, isPending: isPosting } = useMutation({
    mutationFn: async ({ tweetId }: { tweetId: string }) => {
      const res = await client.tweet.postImmediateFromQueue.$post({ tweetId })
      const data = await res.json()
      return data
    },
    onSuccess: (data) => {
      setPendingPostId(null)

      queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
      queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })

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
    },
    onError: (error) => {
      console.error('Failed to post tweet:', error)
      toast.error('Failed to post tweet')
    },
  })

  if (isPending) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <Loader variant="classic" />
          <p className="text-sm text-stone-600 mt-4">Loading queue...</p>
        </div>
      </div>
    )
  }

  const renderDay = (unix: number) => {
    if (isToday(unix)) return `Today | ${format(unix, 'MMM d')}`
    if (isTomorrow(unix)) return `Tomorrow | ${format(unix, 'MMM d')}`
    if (isThisWeek(unix)) return `${format(unix, 'EEEE')} | ${format(unix, 'MMM d')}`
    return format(unix, 'MMM d')
  }

  return (
    <>
      <div className="space-y-2">
        {data?.results.map((result) => {
          const [day, threads] = Object.entries(result)[0]!

          if (threads.length === 0) return null

          return (
            <Card key={day} className={cn('overflow-hidden')}>
              <CardHeader className="">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {renderDay(Number(day))}
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
