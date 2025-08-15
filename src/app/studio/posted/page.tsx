'use client'

import TweetList from '@/components/tweet-list'
import { AccountAvatar } from '@/hooks/account-ctx'
import { CheckCircle2 } from 'lucide-react'

export default function PostedTweetsPage() {


  return (
    <div className="space-y-6 relative z-10 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <AccountAvatar className="size-10 mb-1 mx-2" />
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-stone-900">Posted Tweets</h1>
          <p className="text-sm text-stone-600">
            Your published tweets and their performance.
          </p>
        </div>
      </div>

      <TweetList
        title="Posted Tweets"
        emptyStateTitle="No posted tweets yet"
        emptyStateDescription="Your published tweets will appear here once you start posting."
        emptyStateIcon={<CheckCircle2 className="size-12 text-stone-400 mx-auto" />}
      />
    </div>
  )
}
