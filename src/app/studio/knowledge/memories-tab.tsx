'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { mapToConnectedAccount } from '@/hooks/account-ctx'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { type RealtimeEvents } from '@/lib/realtime'
import { TrashIcon } from '@phosphor-icons/react'
import { useRealtime } from '@upstash/realtime/client'

interface Memory {
  id: string
  content: string
  createdAt: Date
  relevanceScore?: number
}

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
    channel: session?.user.id,
    enabled:
      Boolean(session?.user.id) && Boolean(!memories?.length) && Boolean(isFetched),
    events: {
      index_memories: {
        status: () => refetch,
      },
    },
  })

  const { mutate: deleteMemory } = useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await client.knowledge.delete_memory.$post({ memoryId })
      return res.json()
    },
    onMutate: async (memoryId) => {
      await queryClient.cancelQueries({ queryKey: ['memories'] })

      const previousMemories = queryClient.getQueryData(['memories'])

      queryClient.setQueryData(['memories'], (prev: any) => {
        if (!prev?.data) return prev

        return {
          ...prev,
          data: prev.data.filter((memory: Memory) => memory.id !== memoryId),
        }
      })

      return { previousMemories }
    },
    onError: (error, memoryId, context) => {
      console.error('Error deleting memory:', error)
      toast.error('Failed to delete memory. Please try again.')

      if (context?.previousMemories) {
        queryClient.setQueryData(['memories'], context.previousMemories)
      }
    },
    onSuccess: () => {
      toast.success('Memory deleted')
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
        {memories?.map(({ id, memory }) => (
          <div key={id} className="">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 leading-relaxed inline">- {memory}</p>

                <button
                  onClick={() => deleteMemory(id)}
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
