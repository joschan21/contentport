'use client'

import React, { createContext, useContext, useRef, PropsWithChildren, useState, useCallback } from 'react'
import confetti from 'canvas-confetti'
import dynamic from 'next/dynamic'

const Confetti = dynamic(() => import('@/frontend/studio/components/confetti'), {
  ssr: false,
})

interface ConfettiContextType {
  fire: (options?: confetti.Options) => void
  isReady: boolean
}

const ConfettiContext = createContext<ConfettiContextType | null>(null)

export const ConfettiProvider = ({ children }: PropsWithChildren) => {
  const confettiRef = useRef<any>(null)
  const [isReady, setIsReady] = useState(false)
  const pendingFiresRef = useRef<confetti.Options[]>([])

  const fire = useCallback((options?: confetti.Options) => {
    if (!confettiRef.current) {
      pendingFiresRef.current.push(options || {})
      return
    }

    confettiRef.current?.fire(options)
  }, [])

  const handleConfettiRef = useCallback((ref: any) => {
    confettiRef.current = ref
    if (ref) {
      setIsReady(true)
      pendingFiresRef.current.forEach(options => ref.fire(options))
      pendingFiresRef.current = []
    }
  }, [])

  return (
    <ConfettiContext.Provider value={{ fire, isReady }}>
      {children}
      <Confetti ref={handleConfettiRef} />
    </ConfettiContext.Provider>
  )
}

export const useConfetti = () => {
  const context = useContext(ConfettiContext)
  if (!context) {
    throw new Error('useConfetti must be used within a ConfettiProvider')
  }
  return context
}
