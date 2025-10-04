'use client'

import { PropsWithChildren, useEffect, useState } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { LeftSidebar } from '@/components/context-sidebar'
import { AppSidebarInset } from '@/components/providers/app-sidebar-inset'
import { DashboardProviders } from '@/components/providers/dashboard-providers'
import { SidebarProvider } from '@/components/ui/sidebar'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { WhatsNewModal } from '@/components/whats-new-modal'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'

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

  const { data } = useQuery({
    queryKey: ['are-tweets-indexed'],
    queryFn: async () => {
      const res = await client.knowledge.show_indexing_modal.$get()
      return await res.json()
    },
    initialData: { shouldShow: false },
  })

  useEffect(() => {
    if (data.shouldShow) {
      console.log('yep should show')
      setIsWhatsNewOpen(true)
    }
  }, [data])

  let defaultOpen = true

  if (state) {
    defaultOpen = state && state.value === 'true'
  }

  return (
    <DashboardProviders>
      <div className="flex">
        <WhatsNewModal open={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen} />

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
