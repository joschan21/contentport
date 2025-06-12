'use client'

import { PropsWithChildren } from 'react'

import { AppSidebar } from '@/components/app-sidebar'
import { LeftSidebar } from '@/components/context-sidebar'
import { AppSidebarInset } from '@/components/providers/app-sidebar-inset'
import { SidebarProvider } from '@/components/ui/sidebar'
import { MentionNode } from '@/lib/nodes'
import { LexicalComposer } from '@lexical/react/LexicalComposer'

function parseCookies(): Record<string, string> {
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .reduce(
      (acc, cookie) => {
        const eqIdx = cookie.indexOf('=')
        if (eqIdx === -1) return acc
        const key = decodeURIComponent(cookie.slice(0, eqIdx))
        const val = decodeURIComponent(cookie.slice(eqIdx + 1))
        acc[key] = val
        return acc
      },
      {} as Record<string, string>,
    )
}

interface LayoutProps extends PropsWithChildren {
  hideAppSidebar?: boolean
}

export default function Layout({ children, hideAppSidebar }: LayoutProps) {
  const cookies = parseCookies()
  const sidebarWidth = cookies['sidebar:width']
  const sidebarState = cookies['sidebar:state']

  let defaultOpen = true

  if (sidebarState) {
    defaultOpen = sidebarState === 'true'
  }

  return (
    <div className="flex">
      <SidebarProvider className="w-fit">
        <LeftSidebar />
      </SidebarProvider>

      <SidebarProvider defaultOpen={defaultOpen} defaultWidth={sidebarWidth || '32rem'}>
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
