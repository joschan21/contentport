import { Icons } from '@/components/icons'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { highlightText } from '@/lib/highlight-utils'
import { cn } from '@/lib/utils'
import { InferOutput } from '@/server'
import { ChatCircleIcon, HeartIcon, XLogoIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { EnrichedTweet, TweetMedia } from 'react-tweet'
import { QuotedTweet } from './quoted-tweet'
import { TweetBody } from './tweet-body'
import { Keyword } from '../topic-monitor/feed-settings-modal'

interface TweetCardProps {
  keywords: Keyword[]
  isNew: boolean
  threadGroup?: InferOutput['feed']['get_tweets'][number]
}

export const TweetCard = ({ keywords, isNew, threadGroup }: TweetCardProps) => {
  if (!threadGroup) return null

  const { main, replyChains } = threadGroup

  const renderTweet = (tweet: EnrichedTweet) => (
    <article>
      <div className="flex items-center gap-1.5 mb-3">
        <div className="flex flex-col gap-px">
          <span className="font-semibold truncate inline-flex items-center gap-1.5 text-gray-900 leading-none">
            <div className="text-sm truncate">
              {keywords.length > 0 
                ? highlightText(tweet.user.name.slice(0, 20), keywords).map((content, idx) => 
                    typeof content === 'string' ? (
                      <span key={`name-${idx}`}>{content}</span>
                    ) : (
                      content
                    )
                  )
                : tweet.user.name.slice(0, 20)
              }
              {tweet.user.name.length > 20 ? '...' : ''}
            </div>
            {tweet.user.is_blue_verified ? (
              <Icons.verificationBadge className="size-3.5" />
            ) : null}
            <span className="font-normal inline-flex items-center gap-1.5">
              <span className="text-gray-400">·</span>
              <span className="text-gray-500 text-sm">
                {formatTimeAgo(new Date(tweet.created_at))}
              </span>
            </span>
          </span>
          <span className="text-gray-500 text-sm leading-none">
            {keywords.length > 0 
              ? highlightText(`@${tweet.user.screen_name}`, keywords).map((content, idx) => 
                  typeof content === 'string' ? (
                    <span key={`screen-${idx}`}>{content}</span>
                  ) : (
                    content
                  )
                )
              : `@${tweet.user.screen_name}`
            }
          </span>
        </div>
      </div>

      <TweetBody highlights={keywords} tweet={tweet} />

      {tweet.mediaDetails?.length ? <TweetMedia tweet={tweet} /> : null}

      {tweet.quoted_tweet && (
        <QuotedTweet
          isNestedQuote={Boolean(tweet.in_reply_to_status_id_str)}
          tweet={tweet.quoted_tweet}
        />
      )}

      <div className="flex gap-4 mt-4">
        <div
          className={cn(
            'flex items-center gap-2 text-gray-500 text-sm p-2 -m-2 hover:bg-gray-50 rounded-lg',
            {
              'hover:bg-gray-100': Boolean(tweet.in_reply_to_status_id_str),
            },
          )}
        >
          <div className="flex items-center gap-1">
            <HeartIcon className="size-4" />
            <span>{tweet.favorite_count}</span>
          </div>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 text-gray-500 text-sm p-2 -m-2 hover:bg-gray-50 rounded-lg',
            {
              'hover:bg-gray-100': Boolean(tweet.in_reply_to_status_id_str),
            },
          )}
        >
          <div className="flex items-center gap-1">
            <ChatCircleIcon className="size-4" />
            <span>{tweet.conversation_count}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Link
            href={`https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1 p-2 -m-2 hover:bg-gray-50 rounded-lg',
              {
                'hover:bg-gray-100': Boolean(tweet.in_reply_to_status_id_str),
              },
            )}
          >
            <XLogoIcon className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  )

  return (
    <>
      <div
        className={cn(
          'relative bg-white h-fit origin-center rounded-lg overflow-hidden w-96 pt-5 pb-2 px-2 transition-all border border-black border-opacity-5 bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]',
        )}
      >
        <ul role="list" className="space-y-2">
          {/* Main Tweet */}
          <li className="relative flex gap-x-3 px-2.5 pb-4">
            {replyChains.length > 0 && (
              <div className="absolute top-5 left-[18px] flex w-6 justify-center -bottom-6">
                <div className="w-px bg-gray-200" />
              </div>
            )}
            <Avatar className="relative size-9 flex-none">
              <AvatarImage src={main.user.profile_image_url_https} />
            </Avatar>
            {renderTweet(main)}
          </li>

          {/* Reply Chains */}
          {replyChains.map((chain, chainIndex) => (
            <div
              key={`chain-${chainIndex}`}
              className="relative mt-6 last:mt-0 py-5 pt-3 px-3 bg-gray-50 rounded-lg border border-black/5"
            >
              <p className="mb-3 text-xs text-gray-500">
                Reply to @{main.user.screen_name}
              </p>

              {chain.map((tweet, tweetIndex) => (
                <li key={tweet.id_str} className="relative flex gap-x-3 mb-4 last:mb-0">
                  {tweetIndex !== chain.length - 1 && (
                    <div className="absolute top-0 left-0 flex w-8 justify-center -bottom-6">
                      <div className="w-px bg-gray-200" />
                    </div>
                  )}

                  <Avatar className="relative size-8 flex-none">
                    <AvatarImage src={tweet.user.profile_image_url_https} />
                  </Avatar>

                  {renderTweet(tweet)}
                </li>
              ))}
            </div>
          ))}
        </ul>
      </div>
    </>
  )
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks}w`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths}mo`

  const diffInYears = Math.floor(diffInDays / 365)
  return `${diffInYears}y`
}
