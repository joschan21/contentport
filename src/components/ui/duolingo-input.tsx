"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { cva } from "class-variance-authority"

const inputVariants = cva(
  "w-full disabled:cursor-not-allowed disabled:opacity-50 rounded-xl bg-white border-2 font-medium transition-all duration-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-gray-200 shadow-[0_2px_0_#E5E7EB] focus:ring-indigo-600",
        error:
          "border-red-300 text-red-600 shadow-[0_2px_0_#FCA5A5] focus:border-red-400 focus:ring-red-200 placeholder:text-red-300",
        success:
          "border-green-300 text-green-600 shadow-[0_2px_0_#86EFAC] focus:border-green-400 focus:ring-green-200",
      },
      size: {
        sm: "text-sm h-9 px-3",
        md: "text-base h-11 px-4",
        lg: "text-lg h-13 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface DuolingoInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: "default" | "error" | "success"
  size?: "sm" | "md" | "lg"
  icon?: ReactNode
  iconPosition?: "left" | "right"
  helperText?: string
  label?: string
  fullWidth?: boolean
}

const DuolingoInput = forwardRef<HTMLInputElement, DuolingoInputProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      icon,
      iconPosition = "left",
      helperText,
      label,
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    // Determine padding based on icon position
    const inputClassName = cn(
      inputVariants({ variant, size }),
      icon && iconPosition === "left" && "pl-10",
      icon && iconPosition === "right" && "pr-10",
      className
    )

    // Determine text color for helper text based on variant
    const helperTextClassName = cn(
      "mt-1.5 text-sm",
      variant === "default" && "text-gray-500",
      variant === "error" && "text-red-500",
      variant === "success" && "text-green-500"
    )

    // Determine label styles
    const labelClassName = "block text-sm font-medium text-gray-700 mb-1.5"

    return (
      <div className={cn("relative", fullWidth ? "w-full" : "w-full max-w-sm")}>
        {label && <label className={labelClassName}>{label}</label>}
        <div className="relative">
          {icon && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 text-gray-400",
                iconPosition === "left" && "left-3",
                iconPosition === "right" && "right-3",
                variant === "error" && "text-red-400",
                variant === "success" && "text-green-400"
              )}
            >
              {icon}
            </div>
          )}
          <input ref={ref} className={inputClassName} {...props} />
        </div>
        {helperText && <p className={helperTextClassName}>{helperText}</p>}
      </div>
    )
  }
)

DuolingoInput.displayName = "DuolingoInput"

export default DuolingoInput
