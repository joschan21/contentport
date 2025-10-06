'use client'

import { useEffect, useRef, useState } from 'react'


import { Container } from '@/components/container'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Loader } from '@/components/ui/loader'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { ArrowClockwiseIcon } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { EmptyState } from './empty-state'
import { FeedSettingsModal } from './feed-settings-modal'
import { Feed } from './topic-monitor'

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
    <Container title="Topic Monitor" description="Monitor all keywords related to your brand or business.">
      <div className="mt-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-500 text-base">Showing relevant tweets for:</p>
              <TooltipProvider>
                {keywordData.keywords.map((keyword) => {
                  const isExcluded = excludedKeywords.has(keyword.text)
                  return (
                    <Tooltip key={keyword.text}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => toggleKeywordExclusion(keyword.text)}
                          className={cn(
                            'inline-flex group items-center gap-x-1 rounded-md px-2 py-1 font-medium inset-ring',
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
                          <span
                            className={cn('group-hover:underline ml-1', {
                              'opacity-60': isExcluded,
                            })}
                          >
                            {keyword.text}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to turn {isExcluded ? 'on' : 'off'}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </TooltipProvider>

              {/* {authData?.user.plan === 'free' && isKeywordsFetched && (
                <button
                  onClick={() => router.push('/studio/settings')}
                  className="text-xs text-gray-600 underline"
                >
                  Upgrade to add more &rarr;
                </button>
              )} */}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-gray-500">Sort by:</p>
              <button
                onClick={() => setSortBy('recent')}
                className={cn('text-gray-500 hover:underline', {
                  'font-medium text-gray-900': sortBy === 'recent',
                })}
              >
                Recent
              </button>
              <p className="text-gray-500 hover:underline">/</p>
              <button
                onClick={() => setSortBy('popular')}
                className={cn('text-gray-500 hover:underline', {
                  'font-medium text-gray-900': sortBy === 'popular',
                })}
              >
                Popular
              </button>
            </div>
          </div>

          {/* SETTINGS */}
          <div className="flex  items-center gap-2">
            <DuolingoButton
              variant="secondary"
              loading={isRefreshing}
              onClick={() => refreshFeed()}
            >
              <ArrowClockwiseIcon className="size-4 mr-1.5" weight="bold" />
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
            <p className="text-gray-800">Getting relevant tweets...</p>
          </div>
        ) : isFetched && data?.length === 0 ? (
          <EmptyState
            title="No tweets to show"
            description="Get started by adding keywords to monitor."
          />
        ) : data ? (
          <Feed
            keywords={
              keywordData.keywords.filter(
                (keyword) => !excludedKeywords.has(keyword.text),
              ) ?? []
            }
            data={data}
            containerRef={containerRef}
          />
        ) : null}
      </div>
    </Container>
  )
}

export default Page
