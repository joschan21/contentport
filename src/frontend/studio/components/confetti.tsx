import React, { forwardRef, useImperativeHandle, useRef } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"

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

    useImperativeHandle(ref, () => ({
      fire: (options) => {
        const canvas = canvasRef.current
        if (!canvas) return

        const myConfetti = confetti.create(canvas, {
          resize: true,
          useWorker: true,
        })

        myConfetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          ...options,
        })
      },
    }))

    if (typeof window === "undefined") return null

    return createPortal(
      <canvas
        ref={canvasRef}
        className={cn("fixed inset-0 z-[1000] pointer-events-none", className)}
        {...props}
      />,
      document.body
    )
  }
)

Confetti.displayName = "Confetti"

export default Confetti 