import { HTMLAttributes, ReactNode } from "react"
import { Switch } from "./switch"
import { cn } from "@/lib/utils"

interface SidebarToggleProps extends HTMLAttributes<HTMLDivElement> {
  checked: boolean
  label: string
  description?: string
  onCheckedChange: (isActive: boolean) => void
  children?: ReactNode
}

export const Toggle = ({
  checked,
  label,
  description,
  children,
  className,
  onCheckedChange,
  ...props
}: SidebarToggleProps) => {
  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="block text-xs font-medium text-gray-700">
            {label}
          </span>
          {description && (
            <p className="text-xs text-gray-500">{description}</p>
          )}
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>

      {checked && children && (
        <div className="relative mt-4 bg-gray-50 px-4 py-4 transition-all duration-200 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[2px] before:rounded-full before:bg-brand-500">
          {children}
        </div>
      )}
    </div>
  )
}
