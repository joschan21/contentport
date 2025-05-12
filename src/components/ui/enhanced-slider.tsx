"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { Minus, Plus, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  defaultValue?: number
  disabled?: boolean
  className?: string
  label?: string
  icon?: React.ReactNode
  unit?: string
}

export function EnhancedSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  defaultValue = 0,
  disabled = false,
  className = "",
  label,
  icon,
  unit,
  ...props
}: EnhancedSliderProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>) {
  const handleChange = (values: number[]) => {
    onChange(values[0]!)
  }

  const decrementValue = () => {
    const newValue = Math.max(value - step, min)
    onChange(newValue)
  }

  const incrementValue = () => {
    const newValue = Math.min(value + step, max)
    onChange(newValue)
  }

  const resetValue = () => {
    onChange(defaultValue)
  }

  return (
    <div className={cn("space-y-2 w-full", className)}>
      {(label || icon) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {icon && <span className="text-muted-foreground">{icon}</span>}
              {label && <span className="block font-medium text-xs text-stone-700">{label}</span>}
            </div>
            <div className="text-xs px-0.5 rounded text-stone-400 font-medium">
              {value}{unit}
            </div>
          </div>
          <button
            onClick={resetValue}
            disabled={disabled || value === defaultValue}
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
              "bg-stone-25 text-stone-600 hover:bg-stone-100",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
            type="button"
            aria-label="Reset value"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      )}
      
      <div
        className="flex w-full items-center gap-2"
        {...props}
      >
        <button
          onClick={decrementValue}
          disabled={disabled || value <= min}
          className={cn(
            "flex size-6 shrink-0 aspect-square items-center justify-center rounded-md transition-colors",
            "bg-stone-100 text-stone-600 hover:bg-stone-200",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          type="button"
          aria-label="Decrease value"
        >
          <Minus className="size-3" />
        </button>

        <SliderPrimitive.Root
          className={cn(
            "relative flex h-2 w-full touch-none select-none items-center",
            disabled && "pointer-events-none opacity-50"
          )}
          value={[value]}
          onValueChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow rounded-full bg-stone-200">
            <SliderPrimitive.Range className="absolute h-full rounded-full bg-indigo-500" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            className={cn(
              "block size-5 rounded-sm bg-indigo-500 shadow-sm",
              "border-2 border-white",
              "transition-all hover:scale-110",
              "focus-visible:outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500",
              "data-[dragging=true]:scale-95 data-[dragging=true]:ring-8 data-[dragging=true]:ring-indigo-500/30"
            )}
          />
        </SliderPrimitive.Root>

        <button
          onClick={incrementValue}
          disabled={disabled || value >= max}
          className={cn(
            "flex size-6 shrink-0 aspect-square items-center justify-center rounded-md transition-colors",
            "bg-stone-100 text-stone-600 hover:bg-stone-200",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
          type="button"
          aria-label="Increase value"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  )
} 