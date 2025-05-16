"use client"

import { SidebarInset } from "../ui/sidebar"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { FolderClock, Save } from "lucide-react"
import { SidebarTrigger } from "../ui/sidebar"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { client } from "@/lib/client"
import { Input } from "../ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const mockIdeas = [
  {
    value: "ai-powered content generation",
    label: "AI-Powered Content Generation",
    description:
      "Create an AI system that generates engaging content for social media",
  },
  {
    value: "idea-2",
    label: "Smart Task Management",
    description:
      "Build a task manager that uses AI to prioritize and organize tasks",
  },
  {
    value: "idea-3",
    label: "Voice-Controlled Dashboard",
    description:
      "Develop a dashboard that can be controlled through voice commands",
  },
  {
    value: "idea-4",
    label: "Automated Code Review",
    description:
      "Create a tool that automatically reviews code and suggests improvements",
  },
]

export function AppSidebarInset({ children }: { children: React.ReactNode }) {
  return (
    <SidebarInset className="overflow-x-hidden bg-stone-100 border border-gray-200">
      {/* Dot Pattern Background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          boxShadow: "inset 0 0 10px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, #d1d5db 1.5px, transparent 1.5px)`,
            backgroundSize: "20px 20px",
            opacity: 0.8,
          }}
        />
      </div>

      <header className="relative z-10 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 justify-between">
        {/* <div className="absolute left-1/2 -translate-x-1/2">
          <p className="text-sm/6 text-stone-600">
            Session from April 26, 3:42PM
          </p>
        </div> */}

        <div className="flex w-full justify-end items-center gap-2 px-4">
          {/* <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="block md:hidden">
                  Sidebar is only resizable on desktop
                </BreadcrumbPage>
                <BreadcrumbPage className="hidden md:block">
                  Content Studio
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb> */}

          <div className="flex items-center gap-2">
            <TooltipProvider delayDuration={0}>
              {/* <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    disabled={isSaving}
                    className="rounded-full shadow-md border border-stone-200 p-1.5 size-10 flex items-center justify-center bg-white"
                    onClick={() => save()}
                  >
                    <Save className="size-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-stone-800 text-white"
                >
                  Save Session
                </TooltipContent>
              </Tooltip>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button className="rounded-full shadow-md border border-stone-200 p-1.5 size-10 flex items-center justify-center bg-white">
                        <FolderClock className="size-5" />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side="bottom"
                    className="bg-stone-800 text-white"
                  >
                    View History
                  </TooltipContent>
                </Tooltip>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search ideas..." />
                    <CommandList>
                      <CommandEmpty>No ideas found.</CommandEmpty>
                      <CommandGroup>
                        {mockIdeas.map((idea) => (
                          <CommandItem
                            key={idea.value}
                            value={idea.value}
                            onSelect={(currentValue) => {
                              console.log("Selected:", currentValue)
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{idea.label}</span>
                              <span className="text-sm text-muted-foreground">
                                {idea.description}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover> */}

              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="border border-stone-200 shadow-lg bg-clip-padding"/>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="bg-stone-800 text-white font-medium"
                >
                  Toggle Sidebar
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>
      {children}
    </SidebarInset>
  )
}
