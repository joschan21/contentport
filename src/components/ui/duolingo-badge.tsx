"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DuolingoBadgeProps {
  children: ReactNode
  variant?: "achievement" | "streak" | "level" | "xp" | "notification" | "gray" | "green"
  size?: "sm" | "md" | "lg"
  className?: string
}

export default function DuolingoBadge({
  children,
  variant = "achievement",
  size = "md",
  className,
}: DuolingoBadgeProps) {
  const baseStyles =
    "font-semibold inline-flex items-center justify-center relative"

  const variantStyles = {
    achievement:
      "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white border-2 border-indigo-400 shadow-[0_2px_0_#4338CA,0_4px_6px_-1px_rgba(79,70,229,0.3)]",
    streak:
      "bg-gradient-to-b from-orange-400 to-orange-500 text-white border-2 border-orange-300 shadow-[0_2px_0_#EA580C,0_4px_6px_-1px_rgba(249,115,22,0.3)]",
    level:
      "bg-gradient-to-b from-emerald-400 to-emerald-500 text-white border-2 border-emerald-300 shadow-[0_2px_0_#059669,0_4px_6px_-1px_rgba(16,185,129,0.3)]",
    xp: "bg-gradient-to-b from-blue-400 to-blue-500 text-white border-2 border-blue-300 shadow-[0_2px_0_#1D4ED8,0_4px_6px_-1px_rgba(59,130,246,0.3)]",
    notification:
      "bg-gradient-to-b from-red-400 to-red-500 text-white border-2 border-red-300 shadow-[0_2px_0_#DC2626,0_4px_6px_-1px_rgba(239,68,68,0.3)]",
    gray:
      "bg-gradient-to-b from-gray-400 to-gray-500 text-white border-2 border-gray-300 shadow-[0_2px_0_#6b7280,0_4px_6px_-1px_rgba(107,114,128,0.3)]",
    green:
      "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-2 border-emerald-400 shadow-[0_2px_0_#16A34A,0_4px_6px_-1px_rgba(22,163,74,0.3)]",
  }

  const sizeStyles = {
    sm: "text-xs h-5 min-w-5 px-1 rounded-full",
    md: "text-sm h-7 min-w-7 px-1.5 rounded-full",
    lg: "text-base h-9 min-w-9 px-2 rounded-full",
  }

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  )
}
