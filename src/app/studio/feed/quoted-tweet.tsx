import { Icons } from '@/components/icons'
import type { EnrichedQuotedTweet } from 'react-tweet'
import { TweetMedia } from 'react-tweet'
import { formatTimeAgo } from './tweet-card'
import { cn } from '@/lib/utils'

type Props = { tweet: EnrichedQuotedTweet; isNestedQuote: boolean }

export const QuotedTweet = ({ tweet, isNestedQuote }: Props) => (
  <div
    className={cn(
      'relative mt-3 py-5 pt-3 px-3 bg-gray-50 rounded-lg border border-black/5',
      {
        'bg-gray-100': isNestedQuote,
      },
    )}
  >
    <div className="flex flex-col gap-px">
      <span className="font-semibold truncate inline-flex items-center gap-1.5 text-gray-900 leading-none">
        <p className="text-sm">{tweet.user.name.slice(0, 20).trim()}</p>
        {tweet.user.name.length > 20 ? '...' : ''}
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
        @{tweet.user.screen_name}
      </span>
    </div>

    <p className="text-sm mt-4" lang={tweet.lang} dir="auto">
      {tweet.entities.map((item, i) => (
        <span key={i} dangerouslySetInnerHTML={{ __html: item.text }} />
      ))}
    </p>

    {tweet.mediaDetails?.length ? <TweetMedia quoted tweet={tweet} /> : null}
  </div>
)
