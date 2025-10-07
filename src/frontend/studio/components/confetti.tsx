'use client'

import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'

export interface ConfettiRef {
  fire: (options?: confetti.Options) => void
}

type ConfettiProps = {
  className?: string
  [key: string]: any
}

const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  ({ className, ...props }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas || isInitialized) return

      const updateCanvasSize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }

      updateCanvasSize()

      confettiInstanceRef.current = confetti.create(canvas, {
        resize: true,
        useWorker: false,
      })

      setIsInitialized(true)

      const handleResize = () => {
        updateCanvasSize()
      }

      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [isInitialized])

    useImperativeHandle(ref, () => ({
      fire: (options) => {
        if (!confettiInstanceRef.current) return

        confettiInstanceRef.current({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          ...options,
        })
      },
    }), [])

    if (typeof window === 'undefined') return null

    return createPortal(
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-[1000] pointer-events-none w-full h-full',
          className,
        )}
        {...props}
      />,
      document.body,
    )
  },
)

Confetti.displayName = 'Confetti'

export default Confetti
