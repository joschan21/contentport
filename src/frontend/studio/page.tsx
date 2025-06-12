import TweetEditor, {
  DEFAULT_CONNECTED_ACCOUNT,
} from '@/components/tweet-editor/tweet-editor'
import { client } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { OnboardingModal } from './components/onboarding-modal'
import { useParams } from 'react-router'
import { useTweets } from '@/hooks/use-tweets'

export default function StudioPage() {
  const { tweetId } = useTweets()
  const [isOpen, setIsOpen] = useState(false)

  const { data: account, isSuccess } = useQuery({
    queryKey: ['get-connected-account'],
    queryFn: async () => {
      const res = await client.settings.connected_account.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    // TODO: check for bugs
    if ((isSuccess && !account) || (isSuccess && account.name === 'contentport')) {
      setIsOpen(true)
    }
  }, [account, isSuccess])

  // if (id === 'new') return <p>new tweet</p>

  return (
    <>
      {isOpen ? <OnboardingModal onOpenChange={setIsOpen} /> : null}
      <div className="max-w-xl w-full mx-auto">
        <TweetEditor tweetId={tweetId} />
      </div>
    </>
  )
}
