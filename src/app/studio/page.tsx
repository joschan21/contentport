'use client'

import TweetEditor from '@/components/tweet-editor/tweet-editor'
import { OnboardingModal } from '@/frontend/studio/components/onboarding-modal'
import { useAccount } from '@/hooks/account-ctx'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const Page = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [oauthOnboarding, setOauthOnboarding] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const { account, isLoading } = useAccount()
  
  const editTweetId = searchParams?.get('edit')
  const isEditMode = Boolean(editTweetId)

  useEffect(() => {
    // Check for ?account_connected=true in URL
    if (searchParams?.get('account_connected') === 'true') {
      setOauthOnboarding(true)
      setIsOpen(true)
      setOnboardingLoading(true)
      // Optionally, you could poll or refetch until onboarding is complete
      const check = async () => {
        queryClient.invalidateQueries({ queryKey: ['get-active-account'] })
        setOnboardingLoading(false)
      }
      check()
      router.replace('/studio', { scroll: false })
    }
  }, [searchParams, queryClient, router])

  useEffect(() => {
    if (!Boolean(account) && !Boolean(isLoading) && !isEditMode) setIsOpen(true)
  }, [account, isLoading, isEditMode])

  return (
    <>
      {isOpen ? (
        <OnboardingModal
          onOpenChange={setIsOpen}
          oauthOnboarding={oauthOnboarding}
          loading={onboardingLoading}
        />
      ) : null}
      <div className="max-w-xl w-full mx-auto">
        <TweetEditor editMode={false} editTweetId={null} />
      </div>
    </>
  )
}

export default Page
