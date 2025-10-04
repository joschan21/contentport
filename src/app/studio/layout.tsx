import { DashboardProviders } from '@/components/providers/dashboard-providers'
import ClientLayout from '@/frontend/studio/layout'
import { cookies } from 'next/headers'
import { PropsWithChildren } from 'react'

export default async function Layout({ children }: PropsWithChildren) {
  const cookieStore = await cookies()
  const sidebarWidth = cookieStore.get('sidebar:width')
  const sidebarState = cookieStore.get('sidebar:state')

  return (
    <main style={{ scrollbarGutter: 'stable' }}>
      <DashboardProviders>
        <ClientLayout width={sidebarWidth} state={sidebarState}>
          {children}
        </ClientLayout>
      </DashboardProviders>
    </main>
  )
}
