"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded border-2 transition-all duration-200 outline-none cursor-pointer",
        "border-gray-300 bg-white shadow-[0_2px_0_#E5E7EB]",
        "hover:border-gray-400",
        "data-[state=checked]:border-indigo-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:shadow-[0_2px_0_#4F46E5]",
        "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-white"
      >
        <CheckIcon className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
