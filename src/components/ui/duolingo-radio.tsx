"use client"

import { forwardRef, InputHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DuolingoRadioOption {
  label: string
  value: string
  description?: string
  icon?: ReactNode
}

interface DuolingoRadioGroupProps {
  name: string
  options: DuolingoRadioOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

const DuolingoRadioGroup = forwardRef<HTMLDivElement, DuolingoRadioGroupProps>(
  ({ name, options, value, onChange, className, disabled = false }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-3 w-full", className)}>
        {options.map((option) => {
          const checked = value === option.value
          return (
            <label
              key={option.value}
              className={cn(
                "flex items-center justify-between cursor-pointer rounded-xl border-2 transition-all px-4 py-3 font-medium text-base",
                checked
                  ? "border-indigo-600 bg-indigo-50 shadow-[0_2px_0_#E0E7FF] text-indigo-900"
                  : "border-gray-200 bg-white hover:bg-gray-50 text-gray-700",
                disabled && "opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-center gap-2">
                {option.icon && <span>{option.icon}</span>}
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description && (
                    <span className="text-sm opacity-60 font-normal mt-0.5">{option.description}</span>
                  )}
                </span>
              </div>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="accent-indigo-600 w-5 h-5"
              />
            </label>
          )
        })}
      </div>
    )
  }
)

DuolingoRadioGroup.displayName = "DuolingoRadioGroup"

export default DuolingoRadioGroup 