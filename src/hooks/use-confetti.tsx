'use client'

import React, { createContext, useContext, useRef, PropsWithChildren } from 'react'
import Confetti, { ConfettiRef } from '@/frontend/studio/components/confetti'
import confetti from 'canvas-confetti'

interface ConfettiContextType {
  fire: (options?: confetti.Options) => void
}

const ConfettiContext = createContext<ConfettiContextType | null>(null)

export const ConfettiProvider = ({ children }: PropsWithChildren) => {
  const confettiRef = useRef<ConfettiRef>(null)

  const fire = (options?: confetti.Options) => {
    confettiRef.current?.fire(options)
  }

  return (
    <ConfettiContext.Provider value={{ fire }}>
      {children}
      {/* <Confetti ref={confettiRef} /> */}
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
