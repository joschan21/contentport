'use client'

import TweetEditor from '@/components/tweet-editor/tweet-editor'
import { useAccount } from '@/hooks/account-ctx'
import { client } from '@/lib/client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { redirect, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

const Page = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const { account, isLoading } = useAccount()

  const editTweetId = searchParams?.get('edit')
  const isEditMode = Boolean(editTweetId)

  const { mutate: sendWelcomeEmail } = useMutation({
    mutationFn: async () => {
      const res = await client.email.send_welcome_email.$post()
      return await res.json()
    },
    onError: (error) => {
      console.error('Error sending welcome email:', error)
    },
  })

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
    if (searchParams?.get('onboarding') === 'true') {
      sendWelcomeEmail()
      router.replace('/studio', { scroll: false })
    }
  }, [searchParams, router, sendWelcomeEmail])

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
