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
  Pencil,
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
import { AccountAvatar, AccountName, AccountHandle } from '@/hooks/account-ctx'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { initialConfig, useTweets } from '@/hooks/use-tweets'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useRouter } from 'next/navigation'
import { InferOutput } from '@/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

function InitialContentPlugin({ content }: { content: string }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot()
      const p = $createParagraphNode()
      const text = $createTextNode(content)
      p.append(text)
      root.clear()
      root.append(p)
    })
  }, [editor, content])

  return null
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

type ScheduledTweet = InferOutput['tweet']['getScheduledAndPublished']['tweets'][number]

export default function ScheduledTweetsPage() {
  const queryClient = useQueryClient()
  const { shadowEditor, setMediaFiles } = useTweets()
  const router = useRouter()

  const { data: scheduledTweets, isLoading } = useQuery({
    queryKey: ['scheduled-and-published-tweets'],
    queryFn: async () => {
      const res = await client.tweet.getScheduledAndPublished.$get()
      const { tweets } = await res.json()
      return tweets
    },
  })

  const {
    mutate: deleteTweet,
    isPending: isDeleting,
    variables,
  } = useMutation({
    mutationFn: async ({ tweetId }: { tweetId: string }) => {
      await client.tweet.delete.$post({ id: tweetId })
    },
    onSuccess: () => {
      toast.success('Post deleted and unscheduled')
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

  Object.keys(groupedTweets).forEach((date) => {
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
      <div className="container max-w-xl mx-auto p-6">
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

  const handleEditTweet = (tweet: ScheduledTweet) => {
    console.log(tweet)

    shadowEditor.update(() => {
      const root = $getRoot()
      const p = $createParagraphNode()
      const text = $createTextNode(tweet.content)
      p.append(text)
      root.clear()
      root.append(p)
    })

    setMediaFiles(
      tweet.media.map((media) => ({
        ...media,
        file: null,
        media_id: media.media_id,
        s3Key: media.s3Key,
        type: media.type as 'image' | 'gif' | 'video',
        uploading: false,
        uploaded: true,
      })),
    )

    // setMediaFiles(
    //   tweet.mediaFiles.map((media) => ({
    //     ...media,
    //     file: null as unknown as File,
    //     media_id: media.media_id,
    //     s3Key: media.s3Key,
    //     type: media.type,
    //     uploading: false,
    //     uploaded: true,
    //   })),
    // )

    router.push(`/studio?edit=${tweet.id}`)
  }

  return (
    <div className="relative z-10 container max-w-4xl mx-auto p-6">
      <div className="space-y-6 max-w-xl">
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
            <div className="flex flex-col gap-2">
              <Calendar className="size-12 text-stone-400 mx-auto" />
              <h3 className="text-lg font-medium text-stone-800">
                No scheduled tweets yet
              </h3>
              <p className="text-stone-600">Schedule your first tweet to see it here.</p>
            </div>
            <DuolingoButton
              onClick={() => router.push('/studio')}
              className="w-fit mx-auto"
            >
              Start writing ✏️
            </DuolingoButton>
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
                      className="p-4 group hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3">
                        {/* <AccountAvatar className="size-10 flex-shrink-0" /> */}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1 text-sm">
                              <DuolingoBadge variant="streak" className="px-2">
                                <Clock className="size-3 mr-1.5" />
                                <span className="text-xs">
                                  {tweet.scheduledFor
                                    ? format(new Date(tweet.scheduledFor), 'HH:mm')
                                    : 'No time set'}
                                </span>
                              </DuolingoBadge>

                              <p>{tweet.scheduledFor?.getTime()}</p>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                  <ExternalLink className="size-3 mr-1" />
                                  View
                                </DuolingoButton>
                              )}

                              <DuolingoButton
                                variant="secondary"
                                size="icon"
                                onClick={() => handleEditTweet(tweet)}
                                disabled={isDeleting && variables?.tweetId === tweet.id}
                              >
                                <Pencil className="size-4" />
                                <span className="sr-only">Edit</span>
                              </DuolingoButton>

                              {!tweet.isPublished && (
                                <DuolingoButton
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => handleDeleteScheduled(tweet.id)}
                                  disabled={isDeleting && variables?.tweetId === tweet.id}
                                >
                                  <Trash2 className="size-4" />
                                  <span className="sr-only">Delete</span>
                                </DuolingoButton>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 text-stone-900 leading-relaxed">
                            <LexicalComposer
                              initialConfig={{ ...initialConfig, editable: false }}
                            >
                              <PlainTextPlugin
                                contentEditable={
                                  <ContentEditable className="w-full resize-none leading-relaxed text-stone-900 border-none p-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none pointer-events-none" />
                                }
                                ErrorBoundary={LexicalErrorBoundary}
                              />
                              <InitialContentPlugin content={tweet.content} />
                            </LexicalComposer>
                          </div>

                          {tweet.media.length > 0 && (
                            <div className="mt-3">
                              <MediaDisplay
                                mediaFiles={tweet.media.map((media) => ({
                                  ...media,
                                  uploading: false,
                                  media_id: media.media_id,
                                  s3Key: media.s3Key,
                                  type: media.type as 'image' | 'gif' | 'video',
                                }))}
                                removeMediaFile={() => {}}
                              />
                            </div>
                          )}
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
