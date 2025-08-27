'use client'

import MediaDisplay from '@/components/media-display'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import {
  AccountAvatar,
  AccountHandle,
  AccountName,
  useAccount,
} from '@/hooks/account-ctx'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { format, isToday, isYesterday } from 'date-fns'
import { Clock, Eye } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment } from 'react'

interface TweetListProps {
  title: string
  emptyStateTitle: string
  emptyStateDescription: string
  emptyStateIcon: React.ReactNode
}

export default function TweetList({
  title,
  emptyStateTitle,
  emptyStateDescription,
  emptyStateIcon,
}: TweetListProps) {
  const { account } = useAccount()
  const router = useRouter()

  const { data, isLoading } = useQuery({
    queryKey: ['posted-tweets', account?.username],
    queryFn: async () => {
      const res = await client.tweet.get_posted.$get()
      return await res.json()
    },
    enabled: !!account,
  })

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

  const renderDay = (unix: number) => {
    if (isToday(unix)) return `Today | ${format(unix, 'MMM d')}`
    if (isYesterday(unix)) return `Yesterday | ${format(unix, 'MMM d')}`
    return format(unix, 'MMM d')
  }

  const results = data?.results || []

  return (
    <div className="relative z-10 p-2">
      <div className="space-y-6">
        {results.length === 0 ? (
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
            {results.map((result) => {
              const [day, threads] = Object.entries(result)[0]!

              if (threads.length === 0) return null

              return (
                <Card key={day} className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {renderDay(Number(day))}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: 'auto 1fr' }}
                    >
                      {threads.map(({ unix, thread, isQueued }, i) => {
                        const baseTweet = thread?.[0]

                        return (
                          <Fragment key={i}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-2 w-[100px]">
                                  <Clock className="size-4 text-stone-500" />
                                  <span className="font-medium text-sm text-stone-700">
                                    {format(unix, 'h:mm aaa')}
                                  </span>
                                </div>
                                <div className="flex w-[120px] items-start justify-center gap-1 flex-wrap">
                                  {baseTweet ? (
                                    baseTweet.isError ? (
                                      <DuolingoBadge
                                        className="text-xs px-2"
                                        variant="error"
                                      >
                                        Error
                                      </DuolingoBadge>
                                    ) : baseTweet.isProcessing ? (
                                      <DuolingoBadge
                                        className="text-xs px-2"
                                        variant="gray"
                                      >
                                        Processing
                                      </DuolingoBadge>
                                    ) : (
                                      <DuolingoBadge
                                        variant="green"
                                        className="text-xs px-2"
                                      >
                                        Published
                                      </DuolingoBadge>
                                    )
                                  ) : (
                                    <DuolingoBadge
                                      variant="gray"
                                      className="text-xs px-2"
                                    >
                                      Empty
                                    </DuolingoBadge>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div
                                className={cn(
                                  'px-4 py-4 rounded-lg grid gap-4',
                                  baseTweet
                                    ? 'bg-stone-100 border border-black border-opacity-5'
                                    : 'bg-stone-50 border-dashed border-stone-300',
                                )}
                                style={{ gridTemplateColumns: 'auto 1fr' }}
                              >
                                <AccountAvatar className="size-10" />
                                {baseTweet ? (
                                  <div className="space-y-3">
                                    {thread.map((tweet, index) => (
                                      <div
                                        key={index}
                                        className={cn(
                                          'space-y-1',
                                          index > 0 && 'border-l-2 border-stone-200 pl-3',
                                        )}
                                      >
                                        {index > 0 && (
                                          <div className="text-xs text-stone-400 font-medium">
                                            Tweet {index + 1}
                                          </div>
                                        )}

                                        {index === 0 && (
                                          <div className="flex gap-2 items-center">
                                            <div className="flex gap-1.5 items-start">
                                              <AccountName className="leading-none text-sm" />
                                              <AccountHandle className="leading-none text-sm" />
                                            </div>
                                          </div>
                                        )}

                                        <p className="text-stone-900 whitespace-pre-line text-sm leading-relaxed">
                                          {tweet.content || 'No content'}
                                        </p>
                                        {tweet.media && tweet.media.length > 0 && (
                                          <div className="mt-2">
                                            <MediaDisplay
                                              mediaFiles={tweet.media.map((media) => ({
                                                ...media,
                                                url: `https://dtvhue6he2eeq.cloudfront.net/${media.s3Key}`,
                                                uploading: false,
                                                media_id: media.media_id,
                                                s3Key: media.s3Key,
                                                type: media.type as
                                                  | 'image'
                                                  | 'gif'
                                                  | 'video',
                                              }))}
                                              removeMediaFile={() => {}}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))}

                                    {!baseTweet.isError && (
                                      <Link
                                        href={`https://x.com/${account?.username}/status/${baseTweet.twitterId}`}
                                        className="inline-flex items-center gap-1.5 underline text-sm text-gray-500"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Eye className="size-3.5" />
                                        <p>See on twitter</p>
                                      </Link>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-stone-500">
                                    <span className="text-sm">Empty slot</span>
                                  </div>
                                )}
                              </div>

                              {thread
                                .filter((t) => t.isError && t.errorMessage)
                                .map((t, i) => {
                                  return (
                                    <p key={i} className="mt-1.5 text-xs text-red-500">
                                      Error: {t.errorMessage}
                                    </p>
                                  )
                                })}
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
        )}
      </div>
    </div>
  )
}
