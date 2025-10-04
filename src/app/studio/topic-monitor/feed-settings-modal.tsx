'use client'

import type React from 'react'
import { useState, useEffect, SetStateAction, Dispatch } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { Modal } from '@/components/ui/modal'
import { GearIcon, PlusIcon, SketchLogoIcon, TrashIcon } from '@phosphor-icons/react'
import { authClient } from '@/lib/auth-client'
import { HTTPException } from 'hono/http-exception'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export interface Keyword {
  text: string
  excludeNameMatches: boolean
  excludeLinkMatches: boolean
}

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
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set())

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
    mutationFn: async (keywords: Keyword[]) => {
      const res = await client.feed.save_keywords.$post({
        keywords,
      })
      return await res.json()
    },
    onSuccess: async ({ keywords }, variables) => {
      queryClient.setQueryData(['get-keywords'], { keywords })
      queryClient.invalidateQueries({ queryKey: ['get-feed'] })
      setIsOpen(false)

      toast.success("Settings saved")

      // trigger onSave only if at least one keyword text changed (not just settings)
      if (
        variables.some(
          (keyword) =>
            keyword.text !== keywords.find((k) => k.text === keyword.text)?.text,
        )
      ) {
        onSave()
      }
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
    if (!input.trim()) return
    const newKeyword: Keyword = {
      text: input.trim(),
      excludeNameMatches: false,
      excludeLinkMatches: false,
    }
    setKeywords((prev) => [...prev, newKeyword])
    setInput('')
  }

  const removeKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index))
    setExpandedKeywords((prev) => {
      const newSet = new Set(prev)
      newSet.delete(index)
      return newSet
    })
  }

  const updateKeyword = (index: number, updates: Partial<Keyword>) => {
    setKeywords((prev) =>
      prev.map((keyword, i) => (i === index ? { ...keyword, ...updates } : keyword)),
    )
  }

  const toggleExpanded = (index: number) => {
    setExpandedKeywords((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
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
    <>
      <DuolingoButton className="whitespace-nowrap" onClick={() => setIsOpen(true)}>
        <PlusIcon className="size-4 mr-1.5" weight="bold" />
        New Keyword
      </DuolingoButton>

      <Modal
        showModal={isOpen}
        setShowModal={setIsOpen}
        onClose={() => setExpandedKeywords(new Set())}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-0"
      >
        <div className="p-8 space-y-4 pb-2">
          <div className="mb-4 space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
              Keywords
            </h2>
            <p className="text-gray-500">
              Currently monitoring ({keywords.length}/
              {userData?.user.plan === 'pro' ? '5' : '1'})
            </p>
          </div>

          <div className="space-y-4  bg-gray-50 rounded-md">
            {keywords.length > 0 && (
              <div className="space-y-2">
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {keywords.map((keyword, i) => {
                    const isExpanded = expandedKeywords.has(i)
                    return (
                      <div key={i} className="overflow-hidden">
                        <div className="px-3 py-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex-none rounded-full bg-green-100 p-0.5 text-green-500">
                                <div className="size-1.5 rounded-full bg-current" />
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {keyword.text}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleExpanded(i)}
                                className="text-gray-500 hover:text-gray-600 py-1.5 px-3 rounded-md hover:bg-gray-200 transition-colors"
                              >
                                {isExpanded ? (
                                  <p className="inline-flex items-center text-sm gap-1">
                                    Settings
                                    <ChevronUp className="size-4" />
                                  </p>
                                ) : (
                                  <p className="inline-flex items-center text-sm gap-1">
                                    Settings
                                    <ChevronDown className="size-4" />
                                  </p>
                                )}
                              </button>
                              <button
                                onClick={() => removeKeyword(i)}
                                className="text-sm text-red-500 hover:text-red-600 rounded-md p-3 hover:bg-red-50 hover:underline"
                              >
                                <TrashIcon className='size-4' weight='bold' />
                              </button>
                            </div>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 bg-gray-50 border-t border-gray-200">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">
                                    Exclude username matches
                                  </label>
                                  <p className="text-sm pr-6 text-gray-500">
                                    Don't show tweets where keyword only appears in
                                    usernames or handles
                                  </p>
                                </div>
                                <Switch
                                  checked={keyword.excludeNameMatches}
                                  onCheckedChange={(checked) =>
                                    updateKeyword(i, { excludeNameMatches: checked })
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <label className="text-sm font-medium text-gray-700">
                                    Exclude link matches
                                  </label>
                                  <p className="text-sm pr-6 text-gray-500">
                                    Don't show tweets where keyword only appears in URLs
                                  </p>
                                </div>
                                <Switch
                                  checked={keyword.excludeLinkMatches}
                                  onCheckedChange={(checked) =>
                                    updateKeyword(i, { excludeLinkMatches: checked })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Add a keyword..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                
                disabled={isAtLimit}
              />
            </div>
            <p className="text-xs text-gray-500">Press Enter to add</p>
          </div>

          {userData?.user.plan !== 'pro' && (
            <div className="border-l-4 border-indigo-400 bg-indigo-50 p-4 rounded-r-xl">
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

        <div className="flex gap-3 p-8">
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
      </Modal>
    </>
  )
}
