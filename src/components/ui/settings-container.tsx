import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface SettingsContainerProps {
  children: ReactNode
  className?: string
}

export function SettingsContainer({ children, className }: SettingsContainerProps) {
  return (
    <div className={cn("space-y-8 p-6", className)}>
      {children}
    </div>
  )
} 