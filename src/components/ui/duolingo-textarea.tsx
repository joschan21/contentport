"use client"

import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const textareaVariants = cva(
  "w-full rounded-xl bg-white border-2 font-medium transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 resize-none p-4 border-gray-200 shadow-[0_2px_0_#E5E7EB] focus:ring-indigo-600",
  {
    variants: {
      size: {
        sm: "text-sm min-h-[100px]",
        md: "text-base min-h-[120px]",
        lg: "text-lg min-h-[140px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

export interface DuolingoTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: "sm" | "md" | "lg"
  helperText?: string
  label?: string
  fullWidth?: boolean
}

const DuolingoTextarea = forwardRef<HTMLTextAreaElement, DuolingoTextareaProps>(
  (
    {
      className,
      size = "md",
      helperText,
      label,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const textareaClassName = cn(
      textareaVariants({ size }),
      className
    )

    const helperTextClassName = cn(
      "mt-1.5 text-sm text-gray-500"
    )

    const labelClassName = "block text-sm font-medium text-gray-700 mb-1.5"

    return (
      <div className={cn("relative", fullWidth ? "w-full" : "max-w-sm")}>
        {label && <label className={labelClassName}>{label}</label>}
        <div className="relative">
          <textarea ref={ref} className={textareaClassName} {...props} />
        </div>
        {helperText && <p className={helperTextClassName}>{helperText}</p>}
      </div>
    )
  }
)

DuolingoTextarea.displayName = "DuolingoTextarea"

export default DuolingoTextarea 