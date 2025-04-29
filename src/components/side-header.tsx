"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "./ui/sidebar"
// import { useWrapper } from "@/hooks/wrapper-ctx"
import { ChevronsRight } from "lucide-react"
export function SiteHeader() {
  // const { toggleSidebar, open } = useWrapper()
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b border-stone-300 bg-red-500 z-50 transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <h1 className="text-base font-medium">Documents</h1>
        <Separator
          orientation="vertical"
          className="mx-2 bg-stone-300 data-[orientation=vertical]:h-4"
        />
        <SidebarTrigger className="-ml-1" />
      </div>

      {/* {!open && (
        <div className="fixed z-50 top-4 left-4 flex items-center justify-center">
          <button
            onClick={toggleSidebar}
            className="rounded-full size-8 flex items-center justify-center bg-stone-200 transition-colors"
            aria-label="Open sidebar"
          >
            <ChevronsRight className="size-4" />
          </button>
        </div>
      )} */}
    </header>
  )
}
