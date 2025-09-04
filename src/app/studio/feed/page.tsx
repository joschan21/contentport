'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

import { RefreshCcwIcon } from 'lucide-react'

import { InfoModal } from '@/app/studio/feed/info-modal'
import DuolingoButton from '@/components/ui/duolingo-button'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { EmptyState } from './empty-state'
import { Feed } from './feed'
import { FeedSettingsModal } from './feed-settings-modal'
import { Loader } from '@/components/ui/loader'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const Page = () => {
  const queryClient = useQueryClient()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [newIds, setNewIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [excludedKeywords, setExcludedKeywords] = useState<Set<string>>(new Set())
  const { data: authData } = authClient.useSession()
  const router = useRouter()

  const { data: keywordData, isFetched: isKeywordsFetched } = useQuery({
    queryKey: ['get-keywords'],
    queryFn: async () => {
      const res = await client.feed.get_keywords.$get()
      return await res.json()
    },
    initialData: { keywords: [] },
  })

  useEffect(() => {
    if (isKeywordsFetched && keywordData.keywords.length === 0) {
      setIsInfoModalOpen(true)
    }
  }, [isKeywordsFetched, keywordData.keywords])

  const toggleKeywordExclusion = (keyword: string) => {
    setExcludedKeywords((prev) => {
      const set = new Set(prev)
      if (set.has(keyword)) {
        set.delete(keyword)
      } else {
        set.add(keyword)
      }
      return set
    })
  }

  const { data, isPending, isLoading, isFetched } = useQuery({
    queryKey: ['get-feed', sortBy, Array.from(excludedKeywords).sort()],
    queryFn: async () => {
      const res = await client.feed.get_tweets.$get({
        sortBy,
        exclude: Array.from(excludedKeywords),
      })
      const data = await res.json()

      return data
    },
    refetchOnWindowFocus: false,
  })

  const { mutate: refreshFeed, isPending: isRefreshing } = useMutation({
    mutationFn: async () => {
      const res = await client.feed.refresh.$post()
      const data = await res.json()

      setNewIds(data.newIds)

      return data
    },
    onMutate: (variables) => {
      return toast.loading(
        <div>
          <p className="inline-flex flex-col text-sm space-y-1 text-gray-900">
            <strong className="font-semibold">Getting latest tweets</strong>
            <span className="text-gray-700 leading-[18px]">
              This can take a few seconds. You can leave this page meanwhile.
            </span>
          </p>
        </div>,
        {
          duration: Infinity,
        },
      )
    },
    onSuccess: (data, _, toastId) => {
      queryClient.invalidateQueries({ queryKey: ['get-feed'] })

      toast.dismiss(toastId)

      if (data?.newIds.length) {
        toast.success(
          `Found ${data?.newIds.length} new tweet${data?.newIds.length > 1 ? 's' : ''}`,
        )
      } else {
        toast.success(`You're up to date! No new tweets`)
      }
    },
    onError: (error, _, toastId) => {
      toast.dismiss(toastId)
      toast.error(`Failed to refresh feed`)
    },
  })

  return (
    <div ref={containerRef} className="h-full">
      {isInfoModalOpen && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-10 flex justify-center overflow-y-auto p-8 backdrop-blur-sm"
        >
          <div className="relative mx-4 my-auto w-full max-w-md">
            <InfoModal onContinue={() => setIsInfoModalOpen(false)} />
          </div>
        </motion.div>
      )}
      <div className="relative max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Topic monitor</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-500 text-sm">Showing relevant tweets for:</p>
              <TooltipProvider>
                {keywordData.keywords.map((keyword) => {
                  const isExcluded = excludedKeywords.has(keyword)
                  return (
                    <Tooltip key={keyword}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleKeywordExclusion(keyword)}
                          className={cn(
                            'inline-flex group items-center gap-x-1 rounded-md px-2 py-1 text-xs font-medium inset-ring',
                          )}
                        >
                          <svg
                            viewBox="0 0 6 6"
                            aria-hidden="true"
                            className={cn(
                              'size-1.5',
                              isExcluded ? 'fill-red-500' : 'fill-green-500',
                            )}
                          >
                            <circle r={3} cx={3} cy={3} />
                          </svg>
                          <span className="group-hover:underline">{keyword}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to filter</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </TooltipProvider>

              {authData?.user.plan === 'free' && isKeywordsFetched && (
                <button
                  onClick={() => router.push('/studio/settings')}
                  className="text-xs text-gray-600 underline"
                >
                  Upgrade to add more &rarr;
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-500 text-sm">Sort by:</p>
              <p
                onClick={() => setSortBy('recent')}
                className={cn('text-gray-500 text-xs hover:underline', {
                  'font-medium text-gray-900': sortBy === 'recent',
                })}
              >
                Recent
              </p>
              <p className="text-gray-500 text-xs hover:underline">/</p>
              <p
                onClick={() => setSortBy('popular')}
                className={cn('text-gray-500 text-xs hover:underline', {
                  'font-medium text-gray-900': sortBy === 'popular',
                })}
              >
                Popular
              </p>
            </div>
          </div>

          {/* SETTINGS */}
          <div className="flex  items-center gap-2">
            <DuolingoButton
              variant="secondary"
              className="h-10"
              loading={isRefreshing}
              onClick={() => refreshFeed()}
            >
              <RefreshCcwIcon className="size-3.5 mr-2" />
              <span className="text-sm">Refresh</span>
            </DuolingoButton>
            <FeedSettingsModal
              isOpen={isSettingsModalOpen}
              setIsOpen={setIsSettingsModalOpen}
              onSave={refreshFeed}
            />
          </div>
        </div>

        {isPending ? (
          <div className="flex items-center gap-2.5">
            <Loader variant="classic" size="sm" />
            <p className="text-sm text-gray-800">Curating feed...</p>
          </div>
        ) : isFetched && data?.length === 0 ? (
          <EmptyState onAddKeywords={() => setIsSettingsModalOpen(true)} />
        ) : data ? (
          <Feed
            keywords={
              keywordData.keywords.filter((keyword) => !excludedKeywords.has(keyword)) ??
              []
            }
            data={data}
            containerRef={containerRef}
          />
        ) : null}
      </div>
    </div>
  )
}

export default Page
