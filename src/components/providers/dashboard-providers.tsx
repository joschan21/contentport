'use client'

import { AccountProvider } from '@/hooks/account-ctx'
import { SidebarProvider } from '@/hooks/sidebar-ctx'
import { AttachmentsProvider } from '@/hooks/use-attachments'
import { ChatProvider } from '@/hooks/use-chat'
import { EditorProvider } from '@/hooks/use-editors'
import { TweetProvider } from '@/hooks/use-tweets'
import dynamic from 'next/dynamic'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ReactNode } from 'react'

const ConfettiProvider = dynamic(
  () => import('@/hooks/use-confetti').then((mod) => ({ default: mod.ConfettiProvider })),
  { ssr: false },
)

interface ProvidersProps {
  children: ReactNode
}

export function DashboardProviders({ children }: ProvidersProps) {
  return (
    <ConfettiProvider>
      <NuqsAdapter>
        <AccountProvider>
          <EditorProvider>
            <TweetProvider>
              <AttachmentsProvider>
                <ChatProvider>{children}</ChatProvider>
              </AttachmentsProvider>
            </TweetProvider>
          </EditorProvider>
        </AccountProvider>
      </NuqsAdapter>
    </ConfettiProvider>
  )
}
