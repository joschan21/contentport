'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { mapToConnectedAccount } from '@/hooks/account-ctx'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { type RealtimeEvents } from '@/lib/realtime'
import { TrashIcon } from '@phosphor-icons/react'
import { useRealtime } from '@upstash/realtime/client'

export const MemoriesTab = () => {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const { data: activeAccount } = useQuery({
    queryKey: ['get-active-account'],
    queryFn: async () => {
      const res = await client.settings.active_account.$get()
      const { account } = await res.json()
      return account ? mapToConnectedAccount(account) : null
    },
  })

  const {
    data: memories,
    isPending,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: ['memories', activeAccount?.id],
    queryFn: async () => {
      const res = await client.knowledge.get_memories.$get()
      const { memories } = await res.json()

      return memories
    },
  })

  useRealtime<RealtimeEvents>({
    channels: [session?.user.id],
    enabled: Boolean(!memories?.length) && Boolean(isFetched),
    event: 'index_memories.status',
    onData: () => refetch(),
  })

  const { mutate: deleteMemory } = useMutation({
    mutationFn: async (memory: string) => {
      const res = await client.knowledge.delete_memory.$post({ memory })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memories', activeAccount?.id] })
      toast.success('Memory deleted')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        {isPending ? (
          <p>Loading memories...</p>
        ) : (
          <p>Showing all {memories?.length || 0} memories</p>
        )}
      </div>

      <div className="grid gap-1 w-full">
        {memories?.map((memory, i) => (
          <div key={i} className="">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 leading-relaxed inline">- {memory}</p>

                <button
                  onClick={() => deleteMemory(memory)}
                  className="text-red-500  whitspace-nowrap ml-2 hover:text-red-600 transition-colors inline-block"
                >
                  <TrashIcon className="size-4" weight="bold" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
