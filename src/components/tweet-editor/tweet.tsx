'use client'

import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TweetItem } from './tweet-item'
import { useRef, useState } from 'react'
import { Card } from '../ui/card'

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

      <Card
        className={cn('p-3 gap-0', {
          'border border-indigo-300': editMode,
        })}
      >
        {tweets.map((tweet, index) => {
          return (
            <div
              key={tweet.id}
              className={cn('relative z-50', {
                'pb-0': index > 0 && index < tweets.length - 1,
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
      </Card>

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
