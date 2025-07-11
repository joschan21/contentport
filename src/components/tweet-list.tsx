'use client'

import { useState, useEffect, Fragment } from 'react'
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
  Eye,
} from 'lucide-react'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { client } from '@/lib/client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import MediaDisplay from '@/components/media-display'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import {
  AccountAvatar,
  AccountName,
  AccountHandle,
  useAccount,
} from '@/hooks/account-ctx'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { initialConfig } from '@/hooks/use-tweets'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useRouter } from 'next/navigation'
import { InferOutput } from '@/server'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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

type TweetType = InferOutput['tweet']['getScheduledAndPublished']['tweets'][number]

interface TweetListProps {
  mode: 'scheduled' | 'posted'
  title: string
  emptyStateTitle: string
  emptyStateDescription: string
  emptyStateIcon: React.ReactNode
}

export default function TweetList({
  mode,
  title,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateIcon,
}: TweetListProps) {
  const queryClient = useQueryClient()
  const { account } = useAccount()
  const router = useRouter()

  const { data: tweetData, isLoading } = useQuery({
    queryKey: ['posted-tweets', account?.username],
    queryFn: async () => {
      const res = await client.tweet.getPosted.$get()
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
      queryClient.invalidateQueries({
        queryKey: ['posted-tweets', account?.username],
      })
    },
    onError: () => {
      toast.error('Failed to delete tweet')
    },
  })

  const handleDeleteScheduled = (id: string) => {
    deleteTweet({ tweetId: id })
  }

  const groupedTweets = (tweetData || []).reduce(
    (groups, tweet) => {
      let date: string

      if (mode === 'posted') {
        date = format(new Date(tweet.updatedAt || tweet.createdAt), 'yyyy-MM-dd')
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
    {} as Record<string, TweetType[]>,
  )

  Object.keys(groupedTweets).forEach((date) => {
    groupedTweets[date]?.sort((a, b) => {
      if (mode === 'posted') {
        const timeA = new Date(a.updatedAt || a.createdAt)
        const timeB = new Date(b.updatedAt || b.createdAt)
        return timeB.getTime() - timeA.getTime()
      } else {
        const timeA = a.scheduledFor ? new Date(a.scheduledFor) : new Date(a.createdAt)
        const timeB = b.scheduledFor ? new Date(b.scheduledFor) : new Date(b.createdAt)
        return timeA.getTime() - timeB.getTime()
      }
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

    if (mode === 'posted') {
      return dateB.getTime() - dateA.getTime()
    }

    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)

    const isDateAToday = isToday(dateA)
    const isDateBToday = isToday(dateB)

    if (isDateAToday && !isDateBToday) return -1
    if (!isDateAToday && isDateBToday) return 1

    return dateA.getTime() - dateB.getTime()
  })

  const totalTweets = Object.keys(groupedTweets).reduce(
    (acc, key) => acc + (groupedTweets[key]?.length || 0),
    0,
  )

  const getLastScheduledDate = () => {
    if (mode === 'posted') return null

    const scheduled = (tweetData || [])
      .filter((tweet) => !tweet.isPublished && tweet.scheduledFor)
      .sort(
        (a, b) =>
          new Date(b.scheduledFor!).getTime() - new Date(a.scheduledFor!).getTime(),
      )

    if (scheduled.length > 0 && scheduled[0]?.scheduledFor) {
      return format(new Date(scheduled[0].scheduledFor), 'EEEE MMMM do')
    }
    return null
  }

  const scheduledCount =
    mode === 'scheduled'
      ? (tweetData || []).filter((tweet) => !tweet.isPublished).length
      : 0

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
          </div>
          <div className="animate-pulse bg-stone-100 h-16 rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-stone-100 h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-800">{title}</h1>
        </div>

        {mode === 'scheduled' && scheduledCount > 0 && getLastScheduledDate() && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="size-4" />
              <span className="text-sm">
                You have {scheduledCount} tweets scheduled. The last one will be published
                on {getLastScheduledDate()}.
              </span>
            </div>
          </div>
        )}

        {Object.keys(groupedTweets).length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex flex-col gap-4">
              {emptyStateIcon}
              <h3 className="text-lg font-medium text-stone-800">{emptyStateTitle}</h3>
              <p className="text-stone-600">{emptyStateDescription}</p>
              <DuolingoButton
                onClick={() => router.push('/studio')}
                className="w-fit mx-auto"
              >
                Start writing ✏️
              </DuolingoButton>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDateEntries.map(([date, tweets]) => (
              <Card key={date} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span>
                      {(() => {
                        const relativeLabel = getDateLabel(date)
                        const absoluteDate = format(new Date(date), 'MMMM d')
                        return relativeLabel === absoluteDate
                          ? relativeLabel
                          : `${relativeLabel} | ${absoluteDate}`
                      })()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: 'auto 1fr auto' }}
                  >
                    {tweets.map((tweet: TweetType) => (
                      <Fragment key={tweet.id}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-2 w-[100px]">
                              <Clock className="size-4 text-stone-500" />
                              <span className="font-medium text-sm text-stone-700">
                                {tweet.updatedAt
                                  ? format(new Date(tweet.updatedAt), 'h:mm aaa')
                                  : '--:-- --'}
                              </span>
                            </div>
                            <div className="flex w-[80px] items-start justify-center gap-2">
                              <DuolingoBadge variant="green" className="text-xs px-2">
                                Published
                              </DuolingoBadge>
                            </div>
                          </div>
                        </div>

                        <div className="px-4 py-3 rounded-lg border bg-white border-stone-200 shadow-sm">
                          <div className="space-y-2">
                            <div className="text-stone-900 text-sm leading-relaxed">
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
                              <div className="mt-2">
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

                        <div className="flex items-center">
                          <Link
                            className={cn(
                              buttonVariants({
                                variant: 'outline',
                                size: 'icon',
                                className: 'size-8'
                              }),
                              {
                                'opacity-50 cursor-disabled pointer-events-none':
                                  !tweet.twitterId || !account?.username
                              }
                            )}
                            href={`https://x.com/${account?.username}/status/${tweet.twitterId}`}
                            target="_blank"
                          >
                            <Eye className="size-4" />
                            <span className="sr-only">View on Twitter</span>
                          </Link>
                          {/* <DuolingoButton
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const url = `https://x.com/${account?.username}/status/${tweet.twitterId}`
                              window.open(url, '_blank')
                              // const username = account?.username || 'username'
                              // const tweetDate = format(
                              //   new Date(tweet.updatedAt || tweet.createdAt),
                              //   'yyyy-MM-dd',
                              // )
                              // const searchQuery = encodeURIComponent(
                              //   tweet.content.slice(0, 50),
                              // )
                              // window.open(
                              //   `https://twitter.com/search?q=from%3A${username}%20${searchQuery}%20until%3A${tweetDate}&src=typed_query&f=live`,
                              //   '_blank',
                              // )
                            }}
                          >
                            <Eye className="size-4" />
                            <span className="sr-only">View on Twitter</span>
                          </DuolingoButton> */}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
