'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ChevronRightIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function MentionTooltipPlugin() {
  const [targetEl, setTargetEl] = useState<HTMLElement | null>(null)
  const [mentionText, setMentionText] = useState<string | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  //   const { data: handle, isPending, isError } = useQuery({
  //     queryKey: ['mention-tooltip', mentionText],
  //     queryFn: async () => {
  //       if (!mentionText) return null

  //       try {
  //         const res = await client.tweet.getHandles.$get({
  //           query: mentionText.replaceAll('@', ''),
  //         })

  //         const { data } = await res.json()
  //         return data || null
  //       } catch (error) {
  //         return null
  //       }
  //     },
  //     enabled: !!mentionText,
  //   })

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
    // if (isPending) {
    //   return (
    //     <div className="flex items-center gap-2 py-2">
    //       <Skeleton className="h-10 w-10 rounded-full bg-muted/60" />
    //       <div className="space-y-1.5">
    //         <Skeleton className="h-4 w-24 bg-muted/60" />
    //         <Skeleton className="h-3 w-16 bg-muted/60" />
    //       </div>
    //     </div>
    //   )
    // }

    // if (!handle || isError) {
    //   return (
    //     <div className="flex items-center gap-2 py-2 px-2 text-muted-foreground">
    //       <AlertCircleIcon className="size-8 text-yellow-400" />
    //       <div className="space-y-0.5 text-start">
    //         <p className="font-medium text-yellow-400 leading-none">User not found</p>
    //         <p className="text-xs opacity-60 text-white leading-none">@{mentionText.replace('@', '')}</p>
    //       </div>
    //     </div>
    //   )
    // }

    return (
      <a
        href={`https://x.com/${mentionText.replace('@', '')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2 px-2 flex items-center justify-between gap-2 transition-colors hover:bg-gray-700 rounded-sm"
      >
        <div className="flex justify-start items-center gap-2">
          {/* <Avatar>
            <AvatarImage src={handle.profile_image_url} />
            <AvatarFallback>{handle.name?.charAt(0)}</AvatarFallback>
          </Avatar> */}
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
