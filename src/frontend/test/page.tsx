"use client"

import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const Page = () => {
  return (
    <Drawer>
      <DrawerTrigger>fuck you ai</DrawerTrigger>
      <DrawerContent>
        <Popover>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1">
              <span className="block text-xs font-medium text-gray-700">
                Background
              </span>
            </div>
            <PopoverTrigger asChild>
              <button
                aria-label="Edit background"
                className="size-8 rounded-md border border-gray-300 flex items-center justify-center transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <div className="size-7 rounded-sm" />
              </button>
            </PopoverTrigger>
          </div>
          <PopoverContent align="end" className="relativ z-[999] e w-80">
            <div>
              <span className="block font-medium text-sm text-gray-900 mb-2">
                Background Presets
              </span>
              <div className="grid grid-cols-5 gap-2">
                {[
                  "bg-gradient-to-br from-cyan-300 to-sky-400",
                  "bg-gradient-to-br from-green-300 to-emerald-400",
                  "bg-gradient-to-br from-pink-300 to-rose-200",
                  "bg-gradient-to-br from-green-300 to-lime-200",
                  "bg-gradient-to-br from-yellow-200 to-amber-300",
                  "bg-gradient-to-br from-green-200 via-blue-100 to-blue-300",
                  "bg-gradient-to-br from-indigo-300 via-blue-400 to-purple-500",
                  "bg-gradient-to-br from-red-300 via-orange-300 to-yellow-200",
                  "bg-gradient-to-br from-pink-300 via-pink-400 to-red-400",
                  "bg-gradient-to-br from-slate-400 via-gray-500 to-gray-700",
                  "bg-gradient-to-br from-orange-300 via-orange-400 to-red-400",
                  "bg-gradient-to-br from-teal-300 to-cyan-400",
                  "bg-gradient-to-br from-red-300 to-purple-600",
                  "bg-white",
                  "bg-stone-800",
                ].map((theme) => (
                  <div
                    key={theme}
                    className={cn(
                      "cursor-pointer w-full h-8 rounded-md border",
                      theme
                    )}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </DrawerContent>
    </Drawer>
  )
}

export default Page
