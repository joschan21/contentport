'use client'

import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TweetItem } from './tweet-item'

interface TweetProps {
  editMode?: boolean
}

export default function Tweet({ editMode = false }: TweetProps) {
  const { tweets, addTweet } = useTweetsV2()
  const router = useRouter()

  const handleCancelEdit = () => {
    router.push('/studio/scheduled')
  }

  return (
    <div className="mt-2">
      {/* Thread container with connection logic like messages.tsx */}
      {Boolean(editMode) && (
        <div className="flex w-full justify-between">
          <div className="flex items-center gap-2">
            <div className="size-1.5 bg-indigo-600 rounded-full" />
            <p className="text-xs uppercase leading-8 text-indigo-600 font-medium">
              EDITING
            </p>
          </div>

          <button
            onClick={handleCancelEdit}
            className="text-xs hover:underline uppercase leading-8 text-red-500 font-medium flex items-center gap-1"
          >
            <X className="size-3" />
            Cancel Edit
          </button>
        </div>
      )}

      <div
        className={cn(
          'relative w-full min-w-0 rounded-2xl border p-3 border-black border-opacity-[0.01] bg-clip-padding group bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]',
          {
            'border border-indigo-300': editMode,
          },
        )}
      >
        <div className={cn('relative z-50')}>
          {tweets.map((tweet, index) => {
            return (
              <div
                key={tweet.id}
                className={cn('relative z-50', {
                  'pt-6': index > 0,
                })}
              >
                <TweetItem tweet={tweet} index={index} />

                {tweets.length > 1 && index < tweets.length - 1 && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute z-10 left-8 top-[44px] w-0.5 bg-gray-200/75 h-[calc(100%+100px)]"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={() => addTweet({ initialContent: '' })}
        className="border border-dashed border-gray-300 bg-white rounded-lg px-3 py-1 flex items-center text-xs text-gray-600 mt-3 mx-auto"
      >
        <Plus className="size-3 mr-1" />
        Thread
      </button>
    </div>
  )
}
