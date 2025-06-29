'use client'

import { useState, useEffect } from 'react'
import {
  format,
  isAfter,
  isPast,
  isToday,
  isTomorrow,
  isYesterday,
  isThisWeek,
  differenceInDays,
} from 'date-fns'
import {
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { client } from '@/lib/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import MediaDisplay from '@/components/media-display'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import { AccountAvatar } from '@/hooks/account-ctx'

interface MediaFile {
  url: string
  type: 'image' | 'gif' | 'video'
  uploading: boolean
  uploaded: boolean
  error?: string
}

interface ScheduledTweet {
  id: string
  content: string
  scheduledFor: Date | null
  createdAt: Date
  updatedAt: Date
  isScheduled: boolean
  isPublished: boolean
  mediaFiles: MediaFile[]
}

const getStatusBadge = (tweet: ScheduledTweet) => {
  if (!tweet.scheduledFor || tweet.isPublished) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle2 className="size-3 mr-1" />
        Published
      </Badge>
    )
  }

  const scheduledDate = new Date(tweet.scheduledFor)

  if (isPast(scheduledDate) && tweet.isScheduled && !tweet.isPublished) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
        <AlertCircle className="size-3 mr-1" />
        Error
      </Badge>
    )
  }

  if (tweet.isScheduled) {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
        <Clock className="size-3 mr-1" />
        Scheduled
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
      <AlertCircle className="size-3 mr-1" />
      Draft
    </Badge>
  )
}

export default function ScheduledTweetsPage() {
  const queryClient = useQueryClient()

  const { data: scheduledTweets, isLoading } = useQuery({
    queryKey: ['scheduled-and-published-tweets'],
    queryFn: async () => {
      const res = await client.tweet.getScheduledAndPublished.$get()
      const { tweets } = await res.json()
      return tweets.map((tweet: any) => ({
        ...tweet,
        mediaFiles: tweet.mediaUrls.map((url: string) => ({
          url,
          type: 'image', // Assuming all mediaUrls are images for simplicity
          uploading: false,
          uploaded: true,
        })),
      })) as ScheduledTweet[]
    },
  })

  const { mutate: deleteTweet, isPending: isDeleting, variables } = useMutation({
    mutationFn: async ({tweetId}: {tweetId: string}) => {
      await client.tweet.delete.$post({ id: tweetId })
    },
    onSuccess: () => {
      toast.success('Deleted & un-scheduled')
      queryClient.invalidateQueries({ queryKey: ['scheduled-and-published-tweets'] })
    },
    onError: () => {
      toast.error('Failed to delete tweet')
    },
  })

  const handleDeleteScheduled = (id: string) => {
    deleteTweet({ tweetId: id })
  }

  const groupedTweets = (scheduledTweets || []).reduce(
    (groups, tweet) => {
      let date: string

      if (tweet.isPublished && tweet.updatedAt) {
        date = format(new Date(tweet.updatedAt), 'yyyy-MM-dd')
      } else if (tweet.scheduledFor) {
        date = format(new Date(tweet.scheduledFor), 'yyyy-MM-dd')
      } else {
        date = format(new Date(tweet.createdAt), 'yyyy-MM-dd')
      }

      if (!groups[date]) {
        groups[date] = []
      }
      groups[date]?.push(tweet)

      return groups
    },
    {} as Record<string, ScheduledTweet[]>,
  )

  Object.keys(groupedTweets).forEach(date => {
    groupedTweets[date]?.sort((a, b) => {
      const timeA = a.scheduledFor ? new Date(a.scheduledFor) : new Date(a.createdAt)
      const timeB = b.scheduledFor ? new Date(b.scheduledFor) : new Date(b.createdAt)
      return timeA.getTime() - timeB.getTime()
    })
  })

  const getDateLabel = (dateString: string) => {
    const date = new Date(dateString)

    if (isToday(date)) {
      return 'Today'
    }

    if (isTomorrow(date)) {
      return 'Tomorrow'
    }

    if (isYesterday(date)) {
      return 'Yesterday'
    }

    if (isThisWeek(date)) {
      return format(date, 'EEEE')
    }

    return format(date, 'MMMM d')
  }

  const sortedDateEntries = Object.entries(groupedTweets).sort((a, b) => {
    const dateA = new Date(a[0])
    const dateB = new Date(b[0])

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)

    const isDateAToday = isToday(dateA)
    const isDateBToday = isToday(dateB)

    if (isDateAToday && !isDateBToday) return -1
    if (!isDateAToday && isDateBToday) return 1

    return dateA.getTime() - dateB.getTime()
  })

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <AccountAvatar className="size-12" />
            <div>
              <h1 className="text-2xl font-bold text-stone-800">Scheduled Posts</h1>
              <p className="text-stone-600">Loading schedule...</p>
            </div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-stone-100 h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 container max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <AccountAvatar className="size-12" />
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Scheduled Posts</h1>
            <p className="text-stone-600">
              {Object.keys(groupedTweets).reduce(
                (acc, key) => acc + (groupedTweets[key]?.length || 0),
                0,
              )}{' '}
              total
            </p>
          </div>
        </div>

        {Object.keys(groupedTweets).length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="size-12 text-stone-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-800 mb-2">No tweets found</h3>
            <p className="text-stone-600">Schedule your first tweet to see it here.</p>
          </Card>
        ) : (
          <div className="space-y-8">
            {sortedDateEntries.map(([date, tweets]) => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 text-stone-600">
                  <Calendar className="size-4" />
                  <span className="font-medium">{getDateLabel(date)}</span>
                </div>

                <div className="space-y-3">
                  {tweets.map((tweet: ScheduledTweet) => (
                    <Card
                      key={tweet.id}
                      className="pl-6 pr-3 py-3 group hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1 text-sm text-stone-600">
                                <Clock className="size-3" />
                                <p className="text-xs text-gray-700">
                                  {tweet.scheduledFor
                                    ? format(new Date(tweet.scheduledFor), 'HH:mm')
                                    : 'No time set'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {tweet.isPublished && (
                                <DuolingoButton
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    window.open(
                                      `https://twitter.com/search?q=from:@YourUsername&src=typed_query&f=live`,
                                      '_blank',
                                    )
                                  }
                                >
                                  <ExternalLink className="size-4 mr-1" />
                                  View on X
                                </DuolingoButton>
                              )}

                              {!tweet.isPublished ? (
                                <DuolingoButton
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteScheduled(tweet.id)}
                                  disabled={isDeleting && variables?.tweetId === tweet.id}
                                  className=""
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Delete scheduled tweet</span>
                                </DuolingoButton>
                              ) : null}
                            </div>
                          </div>

                          <p className="text-stone-800 leading-relaxed mb-3">
                            {tweet.content}
                          </p>

                          <MediaDisplay
                            mediaFiles={tweet.mediaFiles}
                            removeMediaFile={() => {}}
                          />

                          {/* <div className="flex items-center justify-between text-xs text-stone-500">
                              <span>
                                Created {format(tweet.createdAt, 'MMM d, h:mm a')}
                              </span>
                              {tweet.updatedAt &&
                                tweet.updatedAt.getTime() !==
                                  tweet.createdAt.getTime() && (
                                  <span>
                                    Updated {format(tweet.updatedAt, 'MMM d, h:mm a')}
                                  </span>
                                )}
                            </div> */}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
