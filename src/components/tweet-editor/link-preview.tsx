'use client'

import { X, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LinkPreviewProps {
  url: string
  onDismiss: () => void
  className?: string
}

interface OGData {
  image: string | null
  title: string | null
  description: string | null
  siteName: string | null
}

function toOGData(value: unknown): OGData | null {
  if (typeof value !== 'object' || value === null) return null
  const obj = value as Record<string, unknown>

  const image = typeof obj.image === 'string' ? obj.image : null
  const title = typeof obj.title === 'string' ? obj.title : null
  const description = typeof obj.description === 'string' ? obj.description : null
  const siteName = typeof obj.siteName === 'string' ? obj.siteName : null

  return { image, title, description, siteName }
}

export default function LinkPreview({ url, onDismiss, className }: LinkPreviewProps) {
  const [ogData, setOgData] = useState<OGData | null>(null)
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const fetchOGData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/tweet/getOpenGraph?url=${encodeURIComponent(url)}`)
        if (response.ok) {
          const raw = (await response.json()) as unknown
          setOgData(toOGData(raw))
        }
      } catch (error) {
        console.error('Error fetching OG data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOGData()
  }, [url])

  if (!loading && (!ogData?.image || imageError)) {
    return null
  }

  if (loading) {
    return (
      <div className={cn('mt-3 rounded-2xl border border-stone-200 overflow-hidden', className)}>
        <div className="animate-pulse bg-stone-100 h-48" />
      </div>
    )
  }

  return (
    <div className={cn('mt-3 relative group', className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-300 transition-colors"
      >
        {ogData?.image && (
          <div className="relative">
            <img
              src={ogData.image}
              alt={ogData?.title || 'Link preview'}
              className="w-full h-auto max-h-[280px] object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center gap-1.5 text-white/90">
                <span className="text-xs font-medium truncate">
                  {ogData?.siteName || new URL(url).hostname}
                </span>
                <ExternalLink className="size-3 shrink-0" />
              </div>
              {ogData?.title && (
                <p className="text-sm font-semibold text-white mt-1 line-clamp-2">
                  {ogData.title}
                </p>
              )}
            </div>
          </div>
        )}
      </a>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDismiss()
        }}
        className="absolute -top-2 -right-2 size-6 bg-white border border-stone-200 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-stone-50"
        aria-label="Remove link preview"
      >
        <X className="size-3 text-stone-600" />
      </button>
    </div>
  )
}
