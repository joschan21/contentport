'use client'

import TweetList from '@/components/tweet-list'
import { CheckCircle2, TrendingUp, Calendar } from 'lucide-react'
import { AccountAvatar } from '@/hooks/account-ctx'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { format, subDays } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'

export default function PostedTweetsPage() {
  const { data: stats } = useQuery({
    queryKey: ['posted-tweet-stats'],
    queryFn: async () => {
      const res = await client.tweet.getPosted.$get()
      const { tweets } = await res.json()

      const total = tweets.length
      const last7Days = tweets.filter(
        (tweet) => new Date(tweet.updatedAt || tweet.createdAt) >= subDays(new Date(), 7),
      ).length
      const lastTweet = tweets.length > 0 ? tweets[0] : null

      return { total, last7Days, lastTweet }
    },
  })

  return (
    <div className="space-y-6 relative z-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <AccountAvatar className="size-10" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-stone-900">Posted Tweets</h1>
          <p className="text-sm text-stone-600">
            Your published tweets and their performance.
          </p>
        </div>
      </div>

      <TweetList
        mode="posted"
        title=""
        emptyStateTitle="No posted tweets yet"
        emptyStateDescription="Your published tweets will appear here once you start posting."
        emptyStateIcon={<CheckCircle2 className="size-12 text-stone-400 mx-auto" />}
      />
    </div>
  )
}
