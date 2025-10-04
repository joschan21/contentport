import { Loader } from '@/components/ui/loader'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { useRealtime } from '@upstash/realtime/client'
import { type RealtimeEvents } from '@/lib/realtime'
import { useQuery } from '@tanstack/react-query'
import { useRef } from 'react'
import { Feed } from '../topic-monitor/topic-monitor'
import { mapToConnectedAccount } from '@/hooks/account-ctx'

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

  useRealtime<RealtimeEvents>({
    channel: session?.user.id,
    enabled: Boolean(session?.user.id) && Boolean(!data?.length) && Boolean(isFetched),
    events: { index_tweets: { status: () => refetch() } },
  })

  if (!data?.length && isFetched) {
    return (
      <div className="flex items-center gap-2.5">
        <Loader variant="classic" size="sm" />
        <p className="text-gray-500">Indexing your tweets, please wait...</p>
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
