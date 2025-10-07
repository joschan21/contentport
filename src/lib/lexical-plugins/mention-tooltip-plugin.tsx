'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronRightIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function MentionTooltipPlugin() {
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null)
  const [mentionText, setMentionText] = useState<string | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (target?.classList.contains('mention2-node')) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current)
        }

        clickTimeoutRef.current = setTimeout(() => {
          const selection = window.getSelection()
          if (!selection || selection.toString().length === 0) {
            setTargetEl(target)
            setMentionText(target.dataset.mention ?? '')
          }
        }, 75)
      } else {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current)
        }
        setTargetEl(null)
        setMentionText(null)
      }
    }

    const doubleClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target?.classList.contains('mention2-node')) {
        if (clickTimeoutRef.current) {
          clearTimeout(clickTimeoutRef.current)
        }
        setTargetEl(null)
        setMentionText(null)
      }
    }

    document.addEventListener('click', clickHandler)
    document.addEventListener('dblclick', doubleClickHandler)

    return () => {
      document.removeEventListener('click', clickHandler)
      document.removeEventListener('dblclick', doubleClickHandler)
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
      }
    }
  }, [])

  if (!targetEl || !mentionText) return null

  const rect = targetEl.getBoundingClientRect()
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.bottom + window.scrollY + 4,
    left: rect.left + window.scrollX,
    transform: 'translateY(-100%)',
    zIndex: 9999,
  }

  const renderContent = () => {
    return (
      <a
        href={`https://x.com/${mentionText.replace('@', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2 px-2 flex items-center justify-between gap-2 transition-colors hover:bg-gray-700 rounded-sm"
      >
        <div className="flex justify-start items-center gap-2">
          <div className="text-start">
            {/* <p className="text-sm font-medium leading-none">{handle.name}</p> */}
            <p className="text-xs leading-none">
              <span className="opacity-60">You're tagging </span>
              <span className="font-medium opacity-100">
                @{mentionText.replace('@', '')}
              </span>
            </p>
          </div>
        </div>

        <ChevronRightIcon className="size-3.5 opacity-60" />
      </a>
    )
  }

  return (
    <div style={style} ref={triggerRef}>
      <Tooltip open>
        <TooltipTrigger asChild>
          <span className="pointer-events-none invisible">{mentionText}</span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="translate-y-1.5 px-2 py-2 flex gap-2 items-center justify-between min-w-60"
        >
          {renderContent()}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
