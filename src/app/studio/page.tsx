'use client'

import TweetEditor from '@/components/tweet-editor/tweet-editor'
import { OnboardingModal } from '@/frontend/studio/components/onboarding-modal'
import { useAccount } from '@/hooks/account-ctx'
import { useQueryClient } from '@tanstack/react-query'
import { redirect, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const Page = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const { account, isLoading } = useAccount()

  const editTweetId = searchParams?.get('edit')
  const isEditMode = Boolean(editTweetId)

  useEffect(() => {
    if (searchParams?.get('account_connected') === 'true') {
      const check = async () => {
        queryClient.invalidateQueries({ queryKey: ['get-active-account'] })
      }
      check()
      router.replace('/studio', { scroll: false })
    }
  }, [searchParams, queryClient, router])

  useEffect(() => {
    if (!Boolean(account) && !Boolean(isLoading)) {
      redirect('/onboarding')
    }
  }, [account, isLoading])

  return (
    <div className="max-w-xl w-full mx-auto">
      <TweetEditor editMode={isEditMode} />
    </div>
  )
}

export default Page
