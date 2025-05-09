import { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type LayoutType = "row" | "col"

interface SettingsFieldProps {
  label?: string
  children: ReactNode
  className?: string
  description?: string
  layout?: LayoutType
}

export function SettingsField({
  label,
  children,
  className,
  description,
  layout = "col",
}: SettingsFieldProps) {
  return (
    <div
      className={cn(
        "w-full",
        layout === "col"
          ? "space-y-2"
          : "flex items-center justify-between gap-4",
        className,
      )}
    >
      <div className="w-fit h-full">
        {label && (
          <Label className="mb-2 block text-xs text-gray-700">{label}</Label>
        )}
        {description && (
          <p className="mb-2 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div className={layout === "row" ? "flex-1" : ""}>{children}</div>
    </div>
  )
}
