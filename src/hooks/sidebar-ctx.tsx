import React, { createContext, useContext, useRef } from 'react'
import { useTweetContext } from './tweet-ctx'
import { useChat } from './chat-ctx'

interface SidebarContextType {
  startNewChatRef: React.RefObject<(() => string) | null>
  clearTweetStateRef: React.RefObject<(() => void) | null>
  registerClearTweet: (fn: () => void) => void
  triggerNewChat: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const { clearTweet } = useTweetContext()
  const { startNewChat } = useChat()
  const startNewChatRef = useRef<(() => string) | null>(null)
  const clearTweetStateRef = useRef<(() => void) | null>(null)

  const registerClearTweet = (fn: () => void) => {
    clearTweetStateRef.current = fn
  }

  const triggerNewChat = () => {
    if (clearTweetStateRef.current) {
      clearTweetStateRef.current()
    }
    startNewChat()
    clearTweet()
  }

  return (
    <SidebarContext.Provider
      value={{
        startNewChatRef,
        clearTweetStateRef,
        registerClearTweet,
        triggerNewChat,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}
