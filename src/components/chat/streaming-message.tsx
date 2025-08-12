import { useEffect, useRef, useState, memo, useCallback } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import { Markdown } from '../ui/markdown'

export const useStream = () => {
  const [parts, setParts] = useState<string[]>([])
  const [stream, setStream] = useState('')
  const frame = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const streamIndexRef = useRef<number>(0)
  const isAnimatingRef = useRef(false)

  const addPart = useCallback((part: string) => {
    if (part) {
      setParts((prev) => [...prev, part])
    }
  }, [])

  const reset = useCallback(() => {
    setParts([])
    setStream('')
    streamIndexRef.current = 0
    if (frame.current) {
      cancelAnimationFrame(frame.current)
    }
    frame.current = null
    lastTimeRef.current = 0
    isAnimatingRef.current = false
  }, [])

  useEffect(() => {
    if (isAnimatingRef.current) return

    const typewriterSpeed = 5
    const fullText = parts.join('')

    if (streamIndexRef.current >= fullText.length) {
      setStream(fullText)
      return
    }

    isAnimatingRef.current = true

    const animate = (time: number) => {
      if (streamIndexRef.current < fullText.length) {
        if (time - lastTimeRef.current > typewriterSpeed) {
          streamIndexRef.current++
          setStream(fullText.slice(0, streamIndexRef.current))
          lastTimeRef.current = time
        }
        frame.current = requestAnimationFrame(animate)
      } else {
        isAnimatingRef.current = false
      }
    }

    frame.current = requestAnimationFrame(animate)

    return () => {
      if (frame.current) {
        cancelAnimationFrame(frame.current)
      }
      isAnimatingRef.current = false
    }
  }, [parts])

  return { stream, addPart, reset }
}

export const StreamingMessage = memo(
  ({
    text,
    animate = false,
    markdown = false,
  }: {
    text: string
    animate?: boolean
    markdown?: boolean
  }) => {
    const contentRef = useRef('')
    const { stream, addPart } = useStream()

    useEffect(() => {
      if (!text || !animate) return

      if (contentRef.current !== text) {
        const delta = text.slice(contentRef.current.length)
        if (delta) {
          addPart(delta)
        }
        contentRef.current = text
      }
    }, [text, animate, addPart])

    const wrap = useCallback(
      (text: string) => {
        if (markdown) return <Markdown>{text}</Markdown>
        else return text
      },
      [markdown],
    )

    if (!animate) return wrap(text)

    return wrap(stream ?? text ?? '')
  },
)

StreamingMessage.displayName = 'StreamingMessage'
