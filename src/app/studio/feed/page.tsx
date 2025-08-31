'use client'

import { motion } from 'framer-motion'
import { useRef, useState } from 'react'

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

const Page = () => {
  const queryClient = useQueryClient()
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [newIds, setNewIds] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: keywordData } = useQuery({
    queryKey: ['get-keywords'],
    queryFn: async () => {
      const res = await client.feed.get_keywords.$get()
      return await res.json()
    },
    initialData: { keywords: [] },
  })

  const { data, isPending, isLoading, isFetched } = useQuery({
    queryKey: ['get-feed', sortBy],
    queryFn: async () => {
      const res = await client.feed.get_tweets.$get({ sortBy })
      const data = await res.json()

      return data
    },
    initialData: { tweets: [] },
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
      return toast.loading(`Getting latest tweets...`, {
        duration: Infinity,
      })
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      ref={containerRef}
      className="relative h-full"
    >
      {keywordData.keywords.length === 0 && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="absolute -mt-12 inset-0 z-50 flex justify-center overflow-y-auto p-8 backdrop-blur-sm"
        >
          <div className="relative mx-4 my-auto w-full max-w-md">
            <InfoModal onContinue={() => refreshFeed()} />
          </div>
        </motion.div>
      )}
      <div className="relative max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Topic monitor</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-500 text-sm">Monitoring:</p>
              {keywordData.keywords.map((keyword) => (
                <div
                  key={keyword}
                  className={cn(
                    'inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-900 inset-ring inset-ring-gray-200',
                  )}
                >
                  <svg
                    viewBox="0 0 6 6"
                    aria-hidden="true"
                    className="size-1.5 fill-green-500"
                  >
                    <circle r={3} cx={3} cy={3} />
                  </svg>
                  {keyword}
                </div>
              ))}
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

        {isLoading ? (
          <p>loading feed...</p>
        ) : isFetched && data.tweets.length === 0 ? (
          <EmptyState onAddKeywords={() => setIsSettingsModalOpen(true)} />
        ) : (
          <Feed data={data} containerRef={containerRef} />
        )}
      </div>
    </motion.div>
  )
}

export default Page
