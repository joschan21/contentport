'use client'

import type React from 'react'
import { useState, useEffect, SetStateAction, Dispatch } from 'react'
import { X, Plus, Hash } from 'lucide-react'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Input } from '@/components/ui/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GearIcon, SketchLogoIcon } from '@phosphor-icons/react'
import { authClient } from '@/lib/auth-client'
import { HTTPException } from 'hono/http-exception'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface FeedSettingsModalProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onSave: () => void
  existingTopicsCount?: number
}

export function FeedSettingsModal({ onSave, isOpen, setIsOpen }: FeedSettingsModalProps) {
  const queryClient = useQueryClient()
  const { data: userData } = authClient.useSession()
  const router = useRouter()
  const [input, setInput] = useState<string>('')
  const [keywords, setKeywords] = useState<string[]>([])

  const { data } = useQuery({
    queryKey: ['get-keywords'],
    queryFn: async () => {
      const res = await client.feed.get_keywords.$get()
      const data = await res.json()

      return data
    },
    initialData: { keywords: [] },
  })

  useEffect(() => {
    setKeywords(data.keywords)
  }, [data.keywords])

  const { mutate: saveKeywords, isPending } = useMutation({
    mutationFn: async (keywords: string[]) => {
      const res = await client.feed.save_keywords.$post({
        keywords,
      })
      return await res.json()
    },
    onSuccess: async () => {
      queryClient.setQueryData(['get-keywords'], { keywords })
      setIsOpen(false)
      onSave()
    },
    onError: (err) => {
      if (err instanceof HTTPException) {
        toast.error(err.message)
      } else {
        toast.error('An error occurred')
      }
    },
  })

  const addKeyword = () => {
    setKeywords((prev) => [...prev, input.trim()])
    setInput('')
  }

  const removeKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index))
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addKeyword()
    }
  }

  const handleSave = () => {
    if (userData?.user.plan === 'pro') {
      saveKeywords(keywords)
    } else {
      setIsOpen(false)
    }
  }

  const isAtLimit = Boolean(
    userData?.user.plan === 'pro' ? keywords.length >= 5 : keywords.length >= 1,
  )
  const canSave = keywords.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <DuolingoButton variant="secondary" size="icon" className="aspect-square">
          <GearIcon className="size-4" />
        </DuolingoButton>
      </DialogTrigger>
      <DialogContent
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-0"
        noClose
      >
        <div className="p-8 pb-2">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Monitor Settings
                </DialogTitle>
                <DialogDescription className="sr-only text-sm text-gray-500 mt-1">
                  Customize your engagement feed preferences
                </DialogDescription>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </DialogHeader>

          {/* {isAtLimit && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 font-medium">
                You've reached the limit of 5 topics
              </p>
            </div>
          )} */}

          <div className="space-y-2">
            {keywords.length > 0 && (
              <ul
                role="list"
                className="divide-y space-y-2 divide-gray-100 bg-gray-50 border border-black border-opacity-5 bg-clip-padding rounded-xl p-4"
              >
                <p className="mb-3 text-xs text-gray-500">
                  Currently monitoring ({keywords.length}/
                  {userData?.user.plan === 'pro' ? '5' : '1'})
                </p>

                {keywords.map((keyword, i) => (
                  <li key={keyword} className="ml-2 relative flex items-center space-x-4">
                    <div className="min-w-0 flex-auto">
                      <div className="flex items-center gap-x-2">
                        <div className="flex-none rounded-full bg-green-100 p-0.5 text-green-500">
                          <div className="size-1.5 rounded-full bg-current" />
                        </div>

                        <div className="flex items-center gap-x-1">
                          <p className="min-w-0 text-xs text-gray-900">{keyword}</p>
                          <p className="text-xs text-gray-500">/</p>
                          <p
                            onClick={() => removeKeyword(i)}
                            className="text-xs hover:underline text-gray-500 cursor-pointer"
                          >
                            remove
                          </p>
                        </div>
                      </div>
                      {/* <div className="mt-3 flex items-center gap-x-2.5 text-xs/5 text-gray-500">
                        <p className="truncate">{deployment.description}</p>
                        <svg
                          viewBox="0 0 2 2"
                          className="size-0.5 flex-none fill-gray-500"
                        >
                          <circle r={1} cx={1} cy={1} />
                        </svg>
                        <p className="whitespace-nowrap">{deployment.statusText}</p>
                      </div> */}
                    </div>
                    {/* {deployment.environment === 'Preview' ? (
                      <div className="flex-none rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 inset-ring inset-ring-gray-500/10">
                        {deployment.environment}
                      </div>
                    ) : null}
                    {deployment.environment === 'Production' ? (
                      <div className="flex-none rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 inset-ring inset-ring-indigo-700/10">
                        {deployment.environment}
                      </div>
                    ) : null} */}
                    {/* <ChevronRightIcon
                      aria-hidden="true"
                      className="size-5 flex-none text-gray-400"
                    /> */}
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a keyword..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="flex-1 h-12 px-4 text-base border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
                  disabled={isAtLimit}
                />
              </div>

              <p className="text-xs text-gray-500 mb-2">Press Enter to add a keyword</p>
            </div>
          </div>

          {userData?.user.plan !== 'pro' && (
            <div className="border-l-4 mt-6 border-indigo-400 bg-indigo-50 p-4">
              <div className="flex">
                <div className="shrink-0">
                  <SketchLogoIcon aria-hidden="true" className="size-5 text-indigo-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-indigo-700">
                    This is a Pro feature.{' '}
                    <span
                      onClick={() => router.push('/studio/settings')}
                      className="font-medium cursor-pointer text-indigo-700 underline hover:text-indigo-600"
                    >
                      Upgrade your account to monitor multiple keywords.
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-8 pt-0">
          <DuolingoButton
            variant="secondary"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Cancel
          </DuolingoButton>
          <DuolingoButton
            onClick={handleSave}
            loading={isPending}
            disabled={!canSave}
            variant={canSave ? 'primary' : 'disabled'}
            className="flex-1"
          >
            Save
          </DuolingoButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}
