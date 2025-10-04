import { PropsWithChildren, memo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Globe, ExternalLink, Copy } from 'lucide-react'
import DuolingoButton from '../ui/duolingo-button'

export const WebsiteMockup = memo(
  ({
    children,
    url,
    title,
    isLoading = false,
  }: PropsWithChildren<{
    isLoading?: boolean
    url?: string
    title?: string
  }>) => {
    const containerVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring' as const,
          duration: 0.6,
          bounce: 0.1,
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
      },
    }

    const getDomain = useCallback((url?: string) => {
      if (!url) return 'fetching...'
      try {
        return new URL(url).hostname
      } catch {
        return 'fetching...'
      }
    }, [])

    const openUrl = useCallback(() => {
      if (url) {
        window.open(url, '_blank')
      }
    }, [url])

    return (
      <motion.div
        variants={isLoading ? containerVariants : undefined}
        initial={isLoading ? 'hidden' : false}
        animate={isLoading ? 'visible' : false}
        className="w-full min-w-80 rounded-2xl border border-black border-opacity-[0.01] bg-clip-padding group isolate bg-white shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
              <div className="w-3 h-3 rounded-full bg-green-400/80" />
            </div>
          </div>

          <div className="flex-1 mx-4">
            <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-lg px-2 py-1.5 border border-gray-200/50">
              <Globe className="size-3.5 text-gray-400" />
              <span className="text-xs text-gray-600 font-mono truncate">
                {getDomain(url)}
              </span>
            </div>
          </div>

          {!isLoading && url && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <DuolingoButton
                onClick={openUrl}
                variant="secondary"
                size="sm"
                className="text-sm w-fit h-8 px-2"
              >
                <ExternalLink className="size-3 mr-1" /> Open
              </DuolingoButton>
            </motion.div>
          )}
        </div>

        <div className="p-4">
          {(title || isLoading) && (
            <div className="mb-4">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="h-6 bg-gray-200 rounded animate-pulse"
                  style={{ width: '70%' }}
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                  {title}
                </h3>
              )}
            </div>
          )}

          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{ width: '100%' }}
                />
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="h-4 bg-gray-200 rounded animate-pulse"
                  style={{ width: '95%' }}
                />
              </div>
            ) : (
              <div className="text-gray-700 text-[15px] leading-relaxed space-y-3">
                {children}
              </div>
            )}
          </div>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100"
            >
              <span className="text-xs text-gray-500 font-medium">
                Reading website content...
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
    )
  },
)

WebsiteMockup.displayName = 'WebsiteMockup'
