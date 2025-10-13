'use client'

import { Container } from '@/components/container'
import TweetQueue from '@/components/tweet-queue'
import { QueueSettingsModal } from '@/components/queue-settings-modal'
import { Button } from '@/components/ui/button'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { GearIcon } from '@phosphor-icons/react'
import DuolingoButton from '@/components/ui/duolingo-button'

export default function ScheduledTweetsPage() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleSettingsUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['queue-slots'] })
    queryClient.invalidateQueries({ queryKey: ['next-queue-slot'] })
  }

  return (
    <>
      <Container
        title="Tweet Queue"
        description="Your queue automatically publishes tweets to peak activity times."
        className="pb-24"
      >
        <div className="flex items-center justify-end mb-4">
          <DuolingoButton className='w-fit' onClick={() => setSettingsOpen(true)}>
            <GearIcon weight='bold' className="size-4 mr-2" />
            Queue Settings
          </DuolingoButton>
        </div>
        <div className="mt-6">
          <TweetQueue />
        </div>
      </Container>
      <QueueSettingsModal
        open={settingsOpen}
        setOpen={setSettingsOpen}
        onSettingsUpdated={handleSettingsUpdated}
      />
    </>
  )
}
