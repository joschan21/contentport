'use client'

import { Container } from '@/components/container'
import TweetQueue from '@/components/tweet-queue'

export default function ScheduledTweetsPage() {
  return (
    <Container
      title="Tweet Queue"
      description="Your queue automatically publishes tweets to peak activity times."
      className="pb-24"
    >
      <div className="mt-6">
        <TweetQueue />
      </div>
    </Container>
  )
}
