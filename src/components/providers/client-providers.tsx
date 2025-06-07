'use client'

import { ChatProvider } from '@/hooks/chat-ctx'
import { SidebarProvider } from '@/hooks/sidebar-ctx'
import { TweetProvider } from '@/hooks/tweet-ctx'
import { AttachmentsProvider } from '@/hooks/use-attachments'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ProvidersProps) {
  const queryClient = new QueryClient()

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <TweetProvider>
          <AttachmentsProvider>
            <ChatProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </ChatProvider>
          </AttachmentsProvider>
        </TweetProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  )
}
