import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground bg-white placeholder:text-muted-foreground flex h-11 w-full min-w-0 shadow-inner ring-1 ring-black/15 rounded-lg focus:outline-none px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm bg-clip-padding",
        "focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600",
        // "focus-visible:ring-indigo-600",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
