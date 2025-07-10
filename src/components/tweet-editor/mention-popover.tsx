import { client } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import React, { forwardRef, useImperativeHandle, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { ChevronRight } from 'lucide-react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export interface MentionPopoverRef {
  show: (x: number, y: number, text: string) => void
  hide: () => void
  updateText: (text: string) => void
}

export const MentionPopover = forwardRef<MentionPopoverRef>((props, ref) => {
  const [state, setState] = useState({
    isVisible: false,
    x: 0,
    y: 0,
    text: '',
  })

  const { data, isPending } = useQuery({
    queryKey: ['handle', state.text],
    queryFn: async () => {
      if (!state.text) return null

      const res = await client.tweet.getHandles.$get({
        query: state.text.replaceAll('@', ''),
      })
      const { data } = await res.json()
      return data
    },
    initialData: null,
  })

  useImperativeHandle(ref, () => ({
    show: (x: number, y: number, text: string) => {
      setState({ isVisible: true, x, y, text })
    },
    hide: () => {
      setState((prev) => ({ ...prev, isVisible: false }))
    },
    updateText: (text: string) => {
      setState((prev) => ({ ...prev, text }))
    },
  }))

  if (!state.isVisible) return null

  return (
    <div
      className="mention-popover fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-1 text-sm pointer-events-none min-w-56 min-h-14 flex items-center"
      style={{
        left: state.x,
        top: state.y + 3,
      }}
    >
      <div className="w-full flex items-center justify-between gap-2 hover:bg-gray-500 transition-all">
        <TooltipPrimitive.Arrow className="bg-gray-800 fill-gray-800 z-50 size-3.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
        <div className="flex gap-2 items-center">
          <Avatar>
            <AvatarImage src={data?.profile_image_url} />
          </Avatar>
          <div className="flex flex-col">
            <p className="font-medium">{data?.name}</p>
            <p className="text-xs opacity-80 leading-snug">@{data?.username}</p>
          </div>
        </div>
      </div>

      <ChevronRight className="size-4 opacity-80" />
    </div>
  )
})

MentionPopover.displayName = 'MentionPopover'
