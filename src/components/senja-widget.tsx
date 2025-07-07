'use client'

import { cn } from '@/lib/utils'
import { useEffect } from 'react'

export const SenjaWidget = ({ className }: { className?: string }) => {
  useEffect(() => {
    const script = document.createElement('script')
    script.src =
      'https://widget.senja.io/widget/80f6bf95-1c4d-42b3-b4a7-0b0c8c0d7a38/platform.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div
      data-id="80f6bf95-1c4d-42b3-b4a7-0b0c8c0d7a38"
      data-mode="shadow"
      data-lazyload="false"
      className={cn('senja-embed block w-full', className)}
    />
  )
}
