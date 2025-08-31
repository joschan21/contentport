import { Icons } from '@/components/icons'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Heart, MessageCircleIcon } from 'lucide-react'
import Link from 'next/link'
import {
  EnrichedTweet,
  QuotedTweet,
  TweetBody,
  TweetInReplyTo,
  TweetMedia,
} from 'react-tweet'

export const TweetCard = ({ tweet, isNew }: { tweet: EnrichedTweet; isNew: boolean }) => {
  return (
    <>
      <div
        className={cn(
          'relative bg-white h-fit origin-center rounded-lg overflow-hidden w-96 border px-6 pt-6 pb-3 transition-all',
          {
            'bg-red-500': isNew,
          },
        )}
      >
        <article>
          <div className="flex items-center gap-1.5 mb-3">
            <Avatar className="size-10">
              <AvatarImage src={tweet.user.profile_image_url_https} />
            </Avatar>
            <div className="flex flex-col gap-1">
              <span className="font-semibold truncate inline-flex items-center gap-1.5 text-gray-900 leading-none">
                {tweet.user.name.slice(0, 20)}
                {tweet.user.is_blue_verified ? (
                  <Icons.verificationBadge className="size-4" />
                ) : null}
                {tweet.user.name.length > 20 ? '...' : ''}
                <span className="font-normal inline-flex items-center gap-1.5">
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500 text-sm">
                    {formatTimeAgo(new Date(tweet.created_at))}
                  </span>
                </span>
              </span>
              <span className="text-gray-500 text-sm leading-none">
                @{tweet.user.screen_name}
              </span>
            </div>

            <Link
              className="ml-auto"
              href={tweet.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              <Icons.twitter className="size-6" />
            </Link>
          </div>
          {tweet.in_reply_to_status_id_str && (
            <div className="text-gray-500 mb-1">
              <TweetInReplyTo tweet={tweet} />
            </div>
          )}
          <TweetBody tweet={tweet} />
          {tweet.mediaDetails?.length ? (
            <div className="relative overflow-hidden">
              <TweetMedia tweet={tweet} />
            </div>
          ) : null}

          <div className="mt-3 bg-gray-50 rounded-xl">
            {tweet.quoted_tweet && <QuotedTweet tweet={tweet.quoted_tweet} />}
          </div>

          <div className="flex gap-4">
            <div className="flex items-center gap-2 mt-3 text-gray-500 text-sm">
              <div className="flex items-center gap-1">
                <Heart className="size-4" />
                <span>{tweet.favorite_count}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 text-gray-500 text-sm">
              <div className="flex items-center gap-1">
                <MessageCircleIcon className="size-4" />
                <span>{tweet.conversation_count}</span>
              </div>
            </div>
          </div>
        </article>
      </div>
    </>
  )
}

function formatTimeAgo(date: Date): string {
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
