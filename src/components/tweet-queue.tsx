'use client'

import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, Edit, MoreHorizontal, Trash2 } from 'lucide-react'
import Link from 'next/link'
import {
  format,
  addDays,
  startOfDay,
  isAfter,
  isBefore,
  startOfToday,
  isToday,
  isTomorrow,
} from 'date-fns'
import DuolingoButton from './ui/duolingo-button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import DuolingoBadge from './ui/duolingo-badge'
import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { InferOutput } from '@/server'
import { useTweets } from '@/hooks/use-tweets'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'
import toast from 'react-hot-toast'
import { Loader } from './ui/loader'

// interface QueueSlot {
//   date: string
//   time: string
//   scheduledUnix: number
//   displayTime: string
//   tweet: any | null
//   isQueueSlot: boolean
// }

type QueueSlot = InferOutput['tweet']['getQueueSlots']['slots'][number]

export default function TweetQueue() {
  const queryClient = useQueryClient()

  const today = startOfDay(new Date())
  const endDate = addDays(today, 6)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { shadowEditor, setMediaFiles } = useTweets()
  const router = useRouter()

  const { data, isPending } = useQuery({
    queryKey: ['queue-slots', timezone],
    queryFn: async () => {
      const startDateStr = today.toISOString().split('T')[0]!
      const endDateStr = endDate.toISOString().split('T')[0]!

      const res = await client.tweet.getQueueSlots.$get({
        timezone,
        startDate: startDateStr,
        endDate: endDateStr,
      })
      return await res.json()
    },
    refetchInterval: 30000,
  })

  const deleteTweetMutation = useMutation({
    mutationFn: async (tweetId: string) => {
      const res = await client.tweet.delete.$post({ id: tweetId })
      return await res.json()
    },
    onSuccess: () => {
      toast.success('🗑️ Tweet deleted & unscheduled')
      queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
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

  const slots: QueueSlot[] = data?.slots || []
  const now = new Date()
  const todayStr = format(startOfToday(), 'yyyy-MM-dd')

  // Filter and organize slots
  const filteredSlots = slots.filter((slot: QueueSlot) => {
    const slotDate = new Date(slot.date)
    const isSlotToday = slot.date === todayStr

    // Skip dates before today
    if (isBefore(slotDate, startOfToday())) {
      return false
    }

    // For today, only include slots that haven't passed or manual bookings
    if (isSlotToday) {
      const slotTime = new Date(slot.scheduledUnix * 1000)
      const hasPassedToday = isBefore(slotTime, now)

      // Keep slot if it hasn't passed OR if it's a manual booking (not queue slot)
      return !hasPassedToday || !slot.isQueueSlot
    }

    // For future dates, include all slots
    return true
  })

  const slotsByDate = filteredSlots.reduce(
    (acc: Record<string, QueueSlot[]>, slot: QueueSlot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = []
      }
      acc[slot.date]!.push(slot)
      return acc
    },
    {} as Record<string, QueueSlot[]>,
  )

  const handleDeleteTweet = async (tweetId: string) => {
    await deleteTweetMutation.mutateAsync(tweetId)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AccountAvatar className="size-10" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-stone-900">Queued Tweets</h1>
          <p className="text-sm text-stone-600">
            Automatically queue posts to peak activity times.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {Object.entries(slotsByDate)
          .sort(
            ([a], [b]: [string, QueueSlot[]]) =>
              new Date(a).getTime() - new Date(b).getTime(),
          )
          .map(([date, dateSlots]: [string, QueueSlot[]]) => {
            const dateObj = new Date(date)
            const isTodayDate = isToday(dateObj)
            const isTomorrowDate = isTomorrow(dateObj)

            const sortedSlots = [...dateSlots].sort(
              (a, b) => a.scheduledUnix - b.scheduledUnix,
            )

            return (
              <Card key={date} className={cn('overflow-hidden')}>
                <CardHeader className="">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span>
                      {isTodayDate ? (
                        <span className="space-x-2">
                          <span className="text-stone-900">Today</span>
                          <span className="text-stone-900 opacity-50 text-sm">
                            {format(dateObj, 'MMM d')}
                          </span>
                        </span>
                      ) : isTomorrowDate ? (
                        <span className="space-x-2">
                          <span className="text-stone-900">Tomorrow</span>
                          <span className="text-stone-900 opacity-50 text-sm">
                            {format(dateObj, 'MMM d')}
                          </span>
                        </span>
                      ) : (
                        <span className="space-x-2">
                          <span className="text-stone-900">
                            {format(dateObj, 'EEEE')}
                          </span>
                          <span className="text-stone-900 opacity-50 text-sm">
                            {format(dateObj, 'MMM d')}
                          </span>
                        </span>
                      )}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'auto 1fr auto' }}
                  >
                    {sortedSlots.map((slot) => (
                      <Fragment key={slot.tweet?.id || `${slot.date}-${slot.time}-time`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-2 w-[100px]">
                              <Clock className="size-4 text-stone-500" />
                              <span className="font-medium text-sm text-stone-700">
                                {slot.displayTime}
                              </span>
                            </div>
                            <div className="flex w-[65px] items-start justify-center gap-2">
                              {slot.isQueueSlot ? (
                                <DuolingoBadge
                                  variant={slot.tweet ? 'achievement' : 'gray'}
                                  className="text-xs"
                                >
                                  {slot.tweet ? 'Queued' : 'Empty'}
                                </DuolingoBadge>
                              ) : slot.tweet ? (
                                <DuolingoBadge variant="amber" className="text-xs">
                                  Manual
                                </DuolingoBadge>
                              ) : null}
                            </div>{' '}
                          </div>
                        </div>

                        <div
                          key={`${slot.date}-${slot.time}-content`}
                          className={cn(
                            'px-4 py-3 rounded-lg border',
                            slot.tweet
                              ? 'bg-white border-stone-200 shadow-sm'
                              : 'bg-stone-50 border-dashed border-stone-300',
                          )}
                        >
                          {slot.tweet ? (
                            <div className="space-y-2">
                              <p className="text-stone-900 text-sm leading-relaxed">
                                {slot.tweet.content || 'No content'}
                              </p>
                              {slot.tweet.media && slot.tweet.media.length > 0 && (
                                <div className="text-xs text-stone-500">
                                  📎 {slot.tweet.media.length} media file
                                  {slot.tweet.media.length > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-stone-500">
                              <span className="text-sm">Empty slot</span>
                            </div>
                          )}
                        </div>

                        <div
                          key={`${slot.date}-${slot.time}-actions`}
                          className="flex items-center"
                        >
                          {slot.tweet && (
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
                                <DropdownMenuItem asChild>
                                  <button
                                    onClick={() => {
                                      const tweet = slot.tweet
                                      if (tweet) {
                                        shadowEditor.update(() => {
                                          const root = $getRoot()
                                          const p = $createParagraphNode()
                                          const text = $createTextNode(tweet.content)
                                          p.append(text)
                                          root.clear()
                                          root.append(p)
                                          root.selectEnd()
                                        })

                                        setMediaFiles(tweet.media || [])

                                        router.push(`/studio?edit=${tweet.id}`)
                                      }
                                    }}
                                    className="w-full flex items-center gap-2"
                                  >
                                    <Edit className="size-4" />
                                    Edit
                                  </button>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTweet(slot.tweet!.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="size-4 text-red-600" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
      </div>

      {Object.keys(slotsByDate).length === 0 && (
        <div className="text-center py-12">
          <Calendar className="size-12 text-stone-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">No scheduled tweets</h3>
          <p className="text-stone-600 mb-4">
            Your queue is empty. Schedule your first tweet to get started.
          </p>
          <Link href="/studio">
            <DuolingoButton>Create Tweet</DuolingoButton>
          </Link>
        </div>
      )}
    </div>
  )
}
