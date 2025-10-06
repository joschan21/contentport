import { Loader } from '@/components/ui/loader'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { useRealtime } from '@upstash/realtime/client'
import { type RealtimeEvents } from '@/lib/realtime'
import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { Feed } from '../topic-monitor/topic-monitor'
import { mapToConnectedAccount } from '@/hooks/account-ctx'
import Link from 'next/link'
import { XIcon } from '@phosphor-icons/react'

export const WritingStyleTab = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { data: session } = authClient.useSession()

  const { data: activeAccount } = useQuery({
    queryKey: ['get-active-account'],
    queryFn: async () => {
      const res = await client.settings.active_account.$get()
      const { account } = await res.json()
      return account ? mapToConnectedAccount(account) : null
    },
  })

  const { data, isPending, isFetched, refetch } = useQuery({
    queryKey: ['get-own-tweets', activeAccount?.id],
    queryFn: async () => {
      const res = await client.knowledge.get_own_tweets.$get()
      return await res.json()
    },
    refetchOnWindowFocus: false,
  })

  const { data: accounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await client.settings.list_accounts.$get()
      const { accounts } = await res.json()

      return accounts
    },
  })

  const { status } = useRealtime<RealtimeEvents>({
    channel: session?.user.id,
    enabled:
      Boolean(Boolean(session?.user.id)) &&
      Boolean(open) &&
      Boolean(
        accounts?.some(({ postIndexingStatus }) => postIndexingStatus === 'started'),
      ),
    events: {
      index_memories: { status: () => refetchAccounts() },
      index_tweets: { status: () => refetchAccounts() },
    },
  })

  if (status === 'connecting' || status === 'connected') {
    return (
      <div className="flex items-center gap-2.5">
        <Loader variant="classic" size="sm" />
        <p className="text-gray-500">Indexing your tweets, please wait...</p>
      </div>
    )
  }

  if (accounts?.some(({ postIndexingStatus }) => postIndexingStatus === 'error')) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <XIcon className="size-3" />
        <p className="">
          Something went wrong while indexing your tweets. Please{' '}
          <Link href="/studio/accounts" className="underline font-medium">
            visit this page
          </Link>{' '}
          to try again.
        </p>
      </div>
    )
  }

  return (
    <div>
      {isPending ? (
        <div className="flex items-center gap-2.5">
          <Loader variant="classic" size="sm" />
          <p className="text-sm text-gray-800">Loading tweets...</p>
        </div>
      ) : (
        <div ref={containerRef} className="h-full">
          {data && <Feed containerRef={containerRef} data={data} keywords={[]} />}
        </div>
      )}
    </div>
  )
}
