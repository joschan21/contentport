'use client'

import { Container } from '@/components/container'
import TweetList from '@/components/tweet-list'
import { AccountAvatar } from '@/hooks/account-ctx'
import { CheckCircle2 } from 'lucide-react'

export default function PostedTweetsPage() {
  return (
    <Container
      title="Posted Tweets"
      description="Contentport automatically learns from your posted tweets to improve itself over time."
    >
      <div className="mt-6">
        <TweetList />
      </div>
    </Container>
  )
}
