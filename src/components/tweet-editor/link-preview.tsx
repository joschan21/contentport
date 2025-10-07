'use client'

import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, X } from 'lucide-react'
import { useState } from 'react'

interface LinkPreviewProps {
  url: string
  className?: string
}

export default function LinkPreview({ url, className }: LinkPreviewProps) {
  const [imageError, setImageError] = useState(false)
  const [isImageLoaded, setisImageLoaded] = useState(false)

  const { data, isPending } = useQuery({
    queryKey: ['og-image', url],
    queryFn: async () => {
      const res = await client.tweet.getOpenGraph.$get({ url })
      const data = await res.json()
      return data
    },
  })

  if (!isPending && (!data?.image || imageError)) {
    return null
  }

  const showLoadingState = isPending || !isImageLoaded

  return (
    <div className={cn('grid grid-cols-1 grid-rows-1 mt-3 relative group', className)}>
      {showLoadingState && (
        <div className="relative z-10 col-start-1 row-start-1 rounded-2xl border border-stone-200 aspect-video w-full overflow-hidden">
          <div className="animate-pulse bg-stone-100 w-full h-full" />
        </div>
      )}

      {data?.image && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'block col-start-1 row-start-1 rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-300 transition-colors',
            showLoadingState && 'absolute inset-0 opacity-0 pointer-events-none',
          )}
        >
          <div className="relative">
            <img
              src={data.image}
              alt={data?.title || 'Link preview'}
              className="w-full h-auto max-h-[280px] object-cover"
              onError={() => setImageError(true)}
              onLoad={() => setisImageLoaded(true)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center gap-1.5 text-white/90">
                <span className="text-xs font-medium truncate">
                  {data?.siteName || new URL(url).hostname}
                </span>
                <ExternalLink className="size-3 shrink-0" />
              </div>
              {data?.title && (
                <p className="text-sm font-semibold text-white mt-1 line-clamp-2">
                  {data.title}
                </p>
              )}
            </div>
          </div>
        </a>
      )}
    </div>
  )
}
