"use client"

import TweetQueue from '@/components/tweet-queue'
import { AccountAvatar } from '@/hooks/account-ctx'

export default function ScheduledTweetsPage() {
  return (
    <div className="relative z-10 max-w-3xl mx-auto w-full">
      <div className="space-y-6 relative z-10 max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <AccountAvatar className="size-10" />
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold text-stone-900">Queued Tweets</h1>
            <p className="text-sm text-stone-600">
              Your queue automatically publishes tweets to peak activity times.
            </p>
          </div>
        </div>

        <TweetQueue />
      </div>
    </div>
  )
}
