'use client'

import { Modal } from '@/components/ui/modal'
import DuolingoButton from '@/components/ui/duolingo-button'
import { client } from '@/lib/client'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { Dispatch, SetStateAction } from 'react'

interface WhatsNewModalProps {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
}

export function WhatsNewModal({ open, onOpenChange }: WhatsNewModalProps) {
  const { mutate: handleReindex, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.knowledge.reindex_all_accounts.$post()
      return await res.json()
    },
    onSuccess: () => {
      onOpenChange(false)
      toast.success('Indexing started! You can use the chat once indexing completes.')
    },
    onError: () => {
      toast.error('Failed to start indexing. Please try again.')
    },
  })

  return (
    <Modal
      showModal={open}
      setShowModal={onOpenChange}
      className="max-w-xl"
    >
      <div className="flex flex-col items-stretch gap-6 p-8">
        <div className="relative z-10 isolate flex items-center -space-x-1.5">
          <img
            alt=""
            src="/jo.jpg"
            className="relative rotate-3 ring-3 ring-neutral-100 shadow-lg z-30 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
          />
          <img
            alt=""
            src="/josh.jpg"
            className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
          />
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-3xl font-semibold">Welcome back! 👋</h3>
          <p className="text-base text-gray-500">
            We've rebuilt Contentport from the ground up with a much better understanding
            of who you are and how you write.{' '}
            <span className="font-medium text-gray-700">
              Just this one time, we need to reindex your tweets.
            </span>
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <ul className="list-disc list-inside text-gray-500">
            <li>We analyze your successful posts 📈</li>
            <li>We automatically learn your style ✏️</li>
            <li>We learn about you & your company 🔍</li>
          </ul>
        </div>

        <div className="h-full flex-1 flex items-end">
          <DuolingoButton loading={isPending} onClick={() => handleReindex()}>
            Start now &rarr;
          </DuolingoButton>
        </div>
      </div>
    </Modal>
  )
}
