'use client'

import TweetEditor, { DEFAULT_CONNECTED_ACCOUNT } from '@/components/tweet-editor/tweet-editor'
import { OnboardingModal } from '@/frontend/studio/components/onboarding-modal'
import { client } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

const initialEditorString = JSON.stringify({
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
            text: '',
            type: 'text',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'paragraph',
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
})

const Page = () => {
  const [isOpen, setIsOpen] = useState(false)

  const { data: account, isSuccess } = useQuery({
    queryKey: ['get-connected-account'],
    queryFn: async () => {
      const res = await client.settings.connected_account.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
  })

  useEffect(() => {
    // TODO: check for bugs
    if ((isSuccess && !account) || (isSuccess && account.name === 'contentport')) {
      setIsOpen(true)
    }
  }, [account, isSuccess])

  return (
    <>
      {isOpen ? <OnboardingModal onOpenChange={setIsOpen} /> : null}
      <div className="max-w-xl w-full mx-auto">
        <TweetEditor initialEditorString={initialEditorString} tweetId={null} />
      </div>
    </>
  )
}

export default Page
