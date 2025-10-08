import { AccountAvatar, AccountHandle, AccountName } from '@/hooks/account-ctx'
import { useTweetsV2 } from '@/hooks/use-tweets-v2'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import { ChevronsLeft, Check } from 'lucide-react'
import { PropsWithChildren, memo, useState, useEffect } from 'react'
import DuolingoButton from '../ui/duolingo-button'
import { cn } from '@/lib/utils'

export const TweetMockup = memo(
  ({
    children,
    index,
    text,
    threads,
    isConnectedBefore,
    isConnectedAfter,
    isLoading = false,
  }: PropsWithChildren<{
    isLoading?: boolean
    text?: string
    threads?: string[]
    isConnectedBefore?: boolean
    isConnectedAfter?: boolean
    index: number
  }>) => {
    const { tweets, addTweet, updateTweet } = useTweetsV2()
    const [isApplied, setIsApplied] = useState(false)

    useEffect(() => {
      if (isApplied) {
        const timeout = setTimeout(() => {
          setIsApplied(false)
        }, 2000)
        
        return () => clearTimeout(timeout)
      }
    }, [isApplied])

    const containerVariants: Variants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          duration: 0.6,
          bounce: 0.1,
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    }

    const apply = async () => {
      if (threads && threads.length > 1) {
        for (let i = 0; i < threads.length; i++) {
          const initialContent = threads[i]?.trim() as string

          if (tweets[i]) {
            updateTweet(tweets[i]!.id, initialContent)
          } else {
            addTweet({ initialContent, index: i })
          }
        }
      } else {
        const tweet = tweets[index]
        const shadowEditor = tweet?.editor

        shadowEditor?.update(
          () => {
            const root = $getRoot()
            const paragraph = $createParagraphNode()
            const textNode = $createTextNode(text)

            root.clear()

            paragraph.append(textNode)
            root.append(paragraph)
          },
          { tag: 'force-sync' },
        )
      }
      
      setIsApplied(true)
    }

    return (
      <motion.div
        variants={isLoading ? containerVariants : undefined}
        initial={isLoading ? 'hidden' : false}
        animate={isLoading ? 'visible' : false}
        className={cn(
          'relative w-full grid grid-cols-[40px,1fr] gap-3 min-w-0 py-3 px-4 rounded-2xl',
          {
            'p-6': threads?.length === 1 || isLoading,
            'border border-black border-opacity-[0.01] bg-clip-padding group bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]':
              !isConnectedAfter && !isConnectedBefore,
          },
        )}
      >
        <div className="relative z-50 w-10 h-14 bg-white flex -top-2.5 items-center justify-center">
          <AccountAvatar className="relative !z-50 size-10" />
        </div>

        <div className="w-full flex flex-col items-start">
          <div className="w-full flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <AccountName animate className="leading-[1.2] text-sm" />
              <AccountHandle className="text-sm leading-[1.2]" />
            </div>

            {!isLoading && !isConnectedBefore && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                }}
                className={cn(
                  'absolute right-4 flex items-center gap-2',
                  {
                    'top-4': threads?.length === 1 || isLoading,
                    'top-1': threads && threads.length > 1,
                  },
                )}
              >
                <DuolingoButton
                  onClick={apply}
                  variant="secondary"
                  size="sm"
                  className="text-sm w-fit h-8 px-2"
                >
                  {isApplied ? (
                    <>
                      <Check className="size-4 mr-1" /> Applied
                    </>
                  ) : (
                    <>
                      <ChevronsLeft className="size-4 mr-1" /> Apply
                    </>
                  )}
                </DuolingoButton>
              </motion.div>
            )}
          </div>

          <div className="w-full flex-1 pt-0.5">
            <div
              className={'mt-1 text-slate-800 text-[15px] space-y-3 whitespace-pre-wrap'}
            >
              {isLoading ? (
                <div className="space-y-2">
                  <motion.div
                    initial={{ opacity: 0, y: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '85%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '92%' }}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="h-4 bg-gray-200 rounded animate-pulse"
                    style={{ width: '78%' }}
                  />
                </div>
              ) : (
                children
              )}
            </div>
          </div>
        </div>
      </motion.div>
    )
  },
)

TweetMockup.displayName = 'TweetMockup'
