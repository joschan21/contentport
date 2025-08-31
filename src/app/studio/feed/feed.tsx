import { useVirtualizer } from '@tanstack/react-virtual'
import throttle from 'lodash.throttle'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EnrichedTweet } from 'react-tweet'
import { TweetCard } from './tweet-card'

interface FeedProps {
  data: { tweets: EnrichedTweet[] }
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const Feed = ({ data, containerRef }: FeedProps) => {
  const parentRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1245)

  const calculateLanes = useCallback((containerWidth: number) => {
    const minCardWidth = 410 // 384
    const gap = 0
    const maxLanes = Math.floor((containerWidth + gap) / (minCardWidth + gap))
    return Math.max(1, Math.min(maxLanes, 4))
  }, [])

  const lanes = calculateLanes(containerWidth)

  const virtualizer = useVirtualizer({
    count: data.tweets.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => {
      const tweet = data.tweets[i]
      return tweet ? estimateTweetHeight(tweet) : 300
    },
    overscan: 5,
    lanes,
  })

  useEffect(() => {
    const updateWidth = throttle(() => {
      if (parentRef.current) {
        setContainerWidth(parentRef.current.offsetWidth)
      }
    }, 25)

    updateWidth()

    const resizeObserver = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef])

  return (
    <div ref={parentRef} className="relative max-h-[75vh] overflow-auto">
      <div
        className="relative w-full"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const tweet = data.tweets[item.index]

          if (tweet) {
            return (
              <div
                key={item.key}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  willChange: 'transform',
                  paddingTop: item.index >= lanes ? 16 : 0,
                  top: 0,
                  left: '50%',
                  width: '415px', //   width: '384px',
                  transform: `translateX(calc(-50% + ${(item.lane - (lanes - 1) / 2) * 400}px)) translateY(${item.start}px)`,
                }}
              >
                <TweetCard isNew={false} tweet={tweet} />
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}

function estimateTweetHeight(tweet: EnrichedTweet) {
  let height = 120

  const textLines = Math.ceil(tweet.text.length / 50)
  height += textLines * 24

  if (tweet.mediaDetails?.length) height += 200

  if (tweet.quoted_tweet) height += 100

  if (tweet.in_reply_to_status_id_str) height += 30

  return height + 20
}
