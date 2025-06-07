"use client"

import { PropsWithChildren } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { LeftSidebar } from "@/components/context-sidebar"
import { AppSidebarInset } from "@/components/providers/app-sidebar-inset"
import {
  SidebarProvider
} from "@/components/ui/sidebar"
import { MentionProvider } from "@/hooks/mention-ctx"
import { MentionNode } from "@/lib/nodes"
import { LexicalComposer } from "@lexical/react/LexicalComposer"

function parseCookies(): Record<string, string> {
  return document.cookie
    .split(";")
    .map((c) => c.trim())
    .reduce(
      (acc, cookie) => {
        const eqIdx = cookie.indexOf("=")
        if (eqIdx === -1) return acc
        const key = decodeURIComponent(cookie.slice(0, eqIdx))
        const val = decodeURIComponent(cookie.slice(eqIdx + 1))
        acc[key] = val
        return acc
      },
      {} as Record<string, string>
    )
}

interface LayoutProps extends PropsWithChildren {
  hideAppSidebar?: boolean
}

const initialConfig = {
  namespace: "context-document-editor",
  theme: {
    text: {
      bold: "font-bold",
      italic: "italic",
      underline: "underline",
    },
  },
  onError: (error: Error) => {
    console.error("[Context Document Editor Error]", error)
  },
  editable: true,
  nodes: [MentionNode],
}

export default function Layout({ children, hideAppSidebar }: LayoutProps) {
  const cookies = parseCookies()
  const sidebarWidth = cookies["sidebar:width"]
  const sidebarState = cookies["sidebar:state"]

  let defaultOpen = true

  if (sidebarState) {
    defaultOpen = sidebarState === "true"
  }

  return (
    <div className="flex">
      <SidebarProvider className="w-fit">
        <LeftSidebar />
      </SidebarProvider>

      <SidebarProvider
        defaultOpen={defaultOpen}
        defaultWidth={sidebarWidth || "32rem"}
      >
        {hideAppSidebar ? (
          <AppSidebarInset>{children}</AppSidebarInset>
        ) : (
          <MentionProvider>
            <LexicalComposer initialConfig={initialConfig}>
              <AppSidebar>
                <AppSidebarInset>{children}</AppSidebarInset>
              </AppSidebar>
            </LexicalComposer>
          </MentionProvider>
        )}
      </SidebarProvider>
    </div>
  )
}

// import type { Metadata } from "next"

// import { AppSidebar } from "@/components/app-sidebar"
// import { ContextSidebar } from "@/components/context-sidebar"
// import { AppSidebarInset } from "@/components/providers/app-sidebar-inset"
// import { ClientProviders } from "@/components/providers/client-providers"
// import { SidebarProvider } from "@/components/ui/sidebar"
// import { ThemeProvider } from "next-themes"
// import { Instrument_Serif, JetBrains_Mono } from "next/font/google"
// import { cookies } from "next/headers"

// export default async function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode
// }>) {
//   const cookieStore = await cookies()

//   const sidebarState = cookieStore.get("sidebar:state")?.value
//   //* get sidebar width from cookie
//   const sidebarWidth = cookieStore.get("sidebar:width")?.value

//   let defaultOpen = true

//   if (sidebarState) {
//     defaultOpen = sidebarState === "true"
//   }

//   return (
//     <ThemeProvider
//       enableSystem
//       attribute="class"
//       defaultTheme="light"
//       disableTransitionOnChange
//     >
//       <SidebarProvider defaultOpen={defaultOpen} defaultWidth={sidebarWidth}>
//         <ContextSidebar />
//         <AppSidebar>
//           <AppSidebarInset>{children}</AppSidebarInset>
//         </AppSidebar>
//       </SidebarProvider>
//     </ThemeProvider>
//   )
// }
