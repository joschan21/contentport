import type { Metadata } from "next"

import { AppSidebar } from "@/components/app-sidebar"
import { ContextSidebar } from "@/components/context-sidebar"
import { AppSidebarInset } from "@/components/providers/app-sidebar-inset"
import { ClientProviders } from "@/components/providers/client-providers"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "next-themes"
import { Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { cookies } from "next/headers"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()

  const sidebarState = cookieStore.get("sidebar:state")?.value
  //* get sidebar width from cookie
  const sidebarWidth = cookieStore.get("sidebar:width")?.value

  let defaultOpen = true

  if (sidebarState) {
    defaultOpen = sidebarState === "true"
  }

  return (
    <ThemeProvider
      enableSystem
      attribute="class"
      defaultTheme="light"
      disableTransitionOnChange
    >
      <SidebarProvider defaultOpen={defaultOpen} defaultWidth={sidebarWidth}>
        <ContextSidebar />
        <AppSidebar>
          <AppSidebarInset>{children}</AppSidebarInset>
        </AppSidebar>
      </SidebarProvider>
    </ThemeProvider>
  )
}
