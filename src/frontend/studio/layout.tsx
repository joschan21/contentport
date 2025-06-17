import { PropsWithChildren } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { LeftSidebar } from '@/components/context-sidebar'
import { AppSidebarInset } from '@/components/providers/app-sidebar-inset'
import { SidebarProvider } from '@/components/ui/sidebar'

interface LayoutProps extends PropsWithChildren {
  cookies: any
  hideAppSidebar?: boolean
}

export default async function ClientLayout({
  children,
  cookies,
  hideAppSidebar,
}: LayoutProps) {
  const sidebarWidth = cookies.get('sidebar:width')
  const sidebarState = cookies.get('sidebar:state')

  let defaultOpen = true

  if (sidebarState) {
    defaultOpen = sidebarState && sidebarState.value === 'true'
  }

  return (
    <div className="flex">
      <SidebarProvider className="w-fit" defaultOpen={false}>
        <LeftSidebar />
      </SidebarProvider>

      <SidebarProvider
        defaultOpen={defaultOpen}
        defaultWidth={sidebarWidth?.value || '32rem'}
      >
        {hideAppSidebar ? (
          <AppSidebarInset>{children}</AppSidebarInset>
        ) : (
          <AppSidebar>
            <AppSidebarInset>{children}</AppSidebarInset>
          </AppSidebar>
        )}
      </SidebarProvider>
    </div>
  )
}
