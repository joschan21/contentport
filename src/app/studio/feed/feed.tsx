import { cn } from '@/lib/utils'
import { InferOutput } from '@/server'
import { useVirtualizer } from '@tanstack/react-virtual'
import throttle from 'lodash.throttle'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TweetCard } from './tweet-card'
import { Keyword } from '../topic-monitor/feed-settings-modal'

interface FeedProps {
  keywords: Keyword[]
  data: InferOutput['feed']['get_tweets']
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const Feed = ({ keywords, data, containerRef }: FeedProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const [lanes, setLanes] = useState(3)
  const [gap, setGap] = useState(16)

  const calculateResponsiveLayout = useCallback(
    throttle((width: number) => {
      let newLanes: number
      let newGap: number
      let newCardWidth: number

      if (width >= 1200) {
        newLanes = 3
        newGap = 16
        newCardWidth = Math.min(384, (width - (newLanes - 1) * newGap) / newLanes)
      } else if (width >= 768) {
        newLanes = 2
        newGap = 12
        newCardWidth = Math.min(384, (width - (newLanes - 1) * newGap) / newLanes)
      } else {
        newLanes = 1
        newGap = 8
        newCardWidth = Math.min(384, width - 2 * newGap)
      }

      return { lanes: newLanes, gap: newGap, cardWidth: newCardWidth }
    }, 50),
    [],
  )

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        return 300
      },
      [data],
    ),
    overscan: 5,
    lanes,
  })

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(
      throttle((entries) => {
        for (const entry of entries) {
          const { width } = entry.contentRect

          const {
            lanes: newLanes,
            gap: newGap,
            cardWidth: newCardWidth,
          } = calculateResponsiveLayout(width)

          setLanes(newLanes)
          setGap(newGap)
        }
      }, 100),
    )

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef, calculateResponsiveLayout])

  const getJustifyClass = (lane: number) => {
    if (lanes === 1) return 'justify-center'
    if (lanes === 2) {
      return lane === 0 ? 'justify-end' : 'justify-start'
    }
    if (lanes === 3) {
      if (lane === 0) return 'justify-end'
      if (lane === 1) return 'justify-center'
      return 'justify-start'
    }
    if (lanes === 4) {
      if (lane === 0) return 'justify-end'
      if (lane === 1 || lane === 2) return 'justify-center'
      return 'justify-start'
    }
    return 'justify-center'
  }

  const getLaneWidth = () => {
    return `${100 / lanes}%`
  }

  const getLaneLeft = (lane: number) => {
    return `${(lane * 100) / lanes}%`
  }

  return (
    <div className="relative max-h-screen overflow-auto">
      <div
        className="relative w-full"
        ref={parentRef}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const threadGroup = data[item.index]

          if (threadGroup) {
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                className={cn('flex', getJustifyClass(item.lane))}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: getLaneLeft(item.lane),
                  width: getLaneWidth(),
                  willChange: 'transform',
                  paddingTop: item.index >= lanes ? gap : 0,
                  paddingLeft: item.lane === 0 ? 0 : gap / 2,
                  paddingRight: item.lane === lanes - 1 ? 0 : gap / 2,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <TweetCard isNew={false} threadGroup={threadGroup} keywords={keywords} />
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
