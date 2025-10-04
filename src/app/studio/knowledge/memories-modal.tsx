import DuolingoButton from '@/components/ui/duolingo-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { mapToConnectedAccount } from '@/hooks/account-ctx'
import { client } from '@/lib/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Dispatch, SetStateAction, useState } from 'react'
import toast from 'react-hot-toast'

interface MemoriesModalProps {
  isModalOpen: boolean
  setIsModalOpen: Dispatch<SetStateAction<boolean>>
}

export const MemoriesModal = ({ isModalOpen, setIsModalOpen }: MemoriesModalProps) => {
  const [input, setInput] = useState('')
  const queryClient = useQueryClient()

  const { data: activeAccount } = useQuery({
    queryKey: ['get-active-account'],
    queryFn: async () => {
      const res = await client.settings.active_account.$get()
      const { account } = await res.json()
      return account ? mapToConnectedAccount(account) : null
    },
  })

  const { mutate: addMemory, isPending: isAddingMemory } = useMutation({
    mutationKey: ['add-memory', activeAccount?.id],
    mutationFn: async (memory: string) => {
      const res = await client.knowledge.add_memory.$post({ memory })
      return res.json()
    },
    onSuccess: ({ memoryId }, memory) => {
      setInput('')
      setIsModalOpen(false)
      toast.success('Memory added')

      queryClient.setQueryData(['memories', activeAccount?.id], (prev: any) => {
        if (!prev?.data) return prev

        const newMemory = {
          id: memoryId,
          data: memory,
          createdAt: new Date(),
          relevanceScore: 1.0,
        }

        return {
          ...prev,
          data: [newMemory, ...prev.data],
        }
      })
    },
    onError: (error) => {
      console.error('Error adding memory:', error)
      toast.error('Failed to add memory. Please try again.')
    },
  })

  const handleAddMemory = () => {
    if (!input.trim()) {
      toast.error('Memory cannot be empty')
      return
    }

    addMemory(input.trim())
  }

  return (
    <Modal showModal={isModalOpen} setShowModal={setIsModalOpen}>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Add New Memory</h2>
          <p className="text-sm text-gray-600 pr-12">
            Store important context, preferences, and insights for personalized content.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-memory">Memory</Label>
            <Input
              id="new-memory"
              placeholder="Your preferences, insights, or observations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isAddingMemory}
              className="bg-white"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DuolingoButton
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isAddingMemory}
            >
              Cancel
            </DuolingoButton>
            <DuolingoButton
              type="button"
              onClick={handleAddMemory}
              loading={isAddingMemory}
              disabled={!input.trim()}
            >
              Add Memory
            </DuolingoButton>
          </div>
        </div>
      </div>
    </Modal>
  )
}
