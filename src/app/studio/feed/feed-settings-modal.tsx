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
import { GearIcon } from '@phosphor-icons/react'
import { authClient } from '@/lib/auth-client'
import { HTTPException } from 'hono/http-exception'
import toast from 'react-hot-toast'

interface FeedSettingsModalProps {
  isOpen: boolean
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onSave: () => void
  existingTopicsCount?: number
}

export function FeedSettingsModal({ onSave, isOpen, setIsOpen }: FeedSettingsModalProps) {
  const queryClient = useQueryClient()
  const { data: userData } = authClient.useSession()

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
        <div className="p-8 pb-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-semibold text-gray-900 tracking-tight">
                  Feed Settings
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

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Keywords to Monitor ({keywords.length}/
                {userData?.user.plan === 'pro' ? '5' : '1'})
              </label>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a keyword..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="flex-1 h-12 px-4 text-base border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-indigo-500/20 transition-all duration-200"
                  disabled={isAtLimit}
                />
                <DuolingoButton
                  onClick={addKeyword}
                  disabled={!input.trim() || isAtLimit}
                  variant="icon"
                  size="icon"
                  className="h-12 w-12 rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </DuolingoButton>
              </div>

              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-lg border border-indigo-200"
                    >
                      <Hash className="w-3 h-3" />
                      {keyword}
                      <button
                        onClick={() => removeKeyword(index)}
                        className="ml-1 w-4 h-4 flex items-center justify-center text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-2">
                Press Enter or click + to add keywords
              </p>
            </div>
          </div>
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
            onClick={() => saveKeywords(keywords)}
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
