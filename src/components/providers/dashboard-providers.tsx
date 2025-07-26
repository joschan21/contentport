'use client'

import { AccountProvider } from '@/hooks/account-ctx'
import { AttachmentsProvider } from '@/hooks/use-attachments'
import { ChatProvider } from '@/hooks/use-chat'
import { EditorProvider } from '@/hooks/use-editors'
import { TweetProvider } from '@/hooks/use-tweets'
import { authClient } from '@/lib/auth-client'
import dynamic from 'next/dynamic'
import { posthog } from 'posthog-js'
import { ReactNode, useEffect, useRef } from 'react'

const ConfettiProvider = dynamic(
  () => import('@/hooks/use-confetti').then((mod) => ({ default: mod.ConfettiProvider })),
  { ssr: false },
)

interface ProvidersProps {
  children: ReactNode
}

export function DashboardProviders({ children }: ProvidersProps) {
  const session = authClient.useSession()
  const isIdentifiedRef = useRef(false)

  useEffect(() => {
    if (isIdentifiedRef.current) return

    if (session.data?.user) {
      posthog.identify(session.data?.user.id, {
        email: session.data.user.email,
        name: session.data.user.name,
        plan: session.data.user.plan,
      })

      posthog.capture('session_started')

      isIdentifiedRef.current = true
    }
  }, [session])

  return (
    <ConfettiProvider>
      <AccountProvider>
        <EditorProvider>
          <TweetProvider>
            <AttachmentsProvider>
              <ChatProvider>{children}</ChatProvider>
            </AttachmentsProvider>
          </TweetProvider>
        </EditorProvider>
      </AccountProvider>
    </ConfettiProvider>
  )
}
