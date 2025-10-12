'use client'

import { Dispatch, PropsWithChildren, SetStateAction, useEffect, useState } from 'react'

import { AccountConnection } from '@/components/account-connection'
import { AppSidebar } from '@/components/app-sidebar'
import { LeftSidebar } from '@/components/context-sidebar'
import { AppSidebarInset } from '@/components/providers/app-sidebar-inset'
import { DashboardProviders } from '@/components/providers/dashboard-providers'
import { Modal } from '@/components/ui/modal'
import { SidebarProvider } from '@/components/ui/sidebar'
import { WhatsNewModal } from '@/components/whats-new-modal'
import { client } from '@/lib/client'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useConfetti } from '@/hooks/use-confetti'

interface LayoutProps extends PropsWithChildren {
  hideAppSidebar?: boolean
  width: any
  state: any
}

const initialConfig = {
  namespace: 'chat-input',
  theme: {
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
  onError: (error: Error) => {
    console.error('[Chat Editor Error]', error)
  },
  nodes: [],
}

export default function ClientLayout({
  children,
  width,
  state,
  hideAppSidebar,
}: LayoutProps) {
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false)
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false)

  const searchParams = useSearchParams()
  const onboarding = searchParams.get('onboarding')

  useEffect(() => {
    if (onboarding) setIsOnboardingComplete(true)
  }, [onboarding])

  const { data } = useQuery({
    queryKey: ['are-tweets-indexed'],
    queryFn: async () => {
      const res = await client.knowledge.show_indexing_modal.$get()
      return await res.json()
    },
    initialData: { shouldShow: false },
  })

  useEffect(() => {
    if (data.shouldShow) setIsWhatsNewOpen(true)
  }, [data])

  let defaultOpen = true

  if (state) {
    defaultOpen = state && state.value === 'true'
  }

  return (
    <DashboardProviders>
      <div className="flex">
        <WhatsNewModal open={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen} />
        <OnboardingCompleteModal
          open={isOnboardingComplete}
          onOpenChange={setIsOnboardingComplete}
        />

        <SidebarProvider className="w-fit" defaultOpen={false}>
          <LeftSidebar />
        </SidebarProvider>

        <SidebarProvider defaultOpen={defaultOpen} defaultWidth={width?.value || '32rem'}>
          {hideAppSidebar ? (
            <AppSidebarInset>{children}</AppSidebarInset>
          ) : (
            <LexicalComposer initialConfig={initialConfig}>
              <AppSidebar>
                <AppSidebarInset>{children}</AppSidebarInset>
              </AppSidebar>
            </LexicalComposer>
          )}
        </SidebarProvider>
      </div>
    </DashboardProviders>
  )
}

function OnboardingCompleteModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: Dispatch<SetStateAction<boolean>>
}) {
  const { fire } = useConfetti()

  useEffect(() => {
    if (open) fire({ angle: 75, spread: 90 })
    if (open) fire({ angle: 90, spread: 90 })
    if (open) fire({ angle: 105, spread: 90 })
  }, [open, fire])

  return (
    <Modal className="p-6 min-h-[400px]" showModal={open} setShowModal={onOpenChange}>
      <AccountConnection
        title="You're all set! 🎉"
        description="Welcome to Contentport! We're analyzing your tweets and learning your writing style in the background."
        buttonText="Go to Dashboard"
        onClick={() => onOpenChange(false)}
      />
    </Modal>
  )
}
