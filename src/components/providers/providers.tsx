'use client'

import { ChatProvider } from '@/hooks/use-chat'
import { SidebarProvider } from '@/hooks/sidebar-ctx'
import { TweetProvider } from '@/hooks/use-tweets'
import { AttachmentsProvider } from '@/hooks/use-attachments'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode } from 'react'
import { EditorProvider } from '@/hooks/use-editors'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = new QueryClient()

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <EditorProvider>
          <TweetProvider>
            <AttachmentsProvider>
              <ChatProvider>
                <SidebarProvider>{children}</SidebarProvider>
              </ChatProvider>
            </AttachmentsProvider>
          </TweetProvider>
        </EditorProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  )
}
