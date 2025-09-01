'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DuolingoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?:
    | 'primary'
    | 'secondary'
    | 'disabled'
    | 'icon'
    | 'destructive'
    | 'dashedOutline'
    | 'emerald'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  className?: string
  loading?: boolean
}

export const baseStyles =
  'font-semibold w-full rounded-lg relative transition-transform active:translate-y-0.5 active:shadow-none focus:outline-none flex items-center justify-center focus-visible:ring-2 focus-visible:ring-transparent focus-visible:ring-offset-2'

export const variantStyles = {
  primary:
    'bg-indigo-600 text-white border bg-clip-padding border-b-2 border-indigo-700 hover:bg-indigo-500 shadow-[0_3px_0_#3730a3] focus-visible:ring-indigo-600',
  secondary:
    'bg-[#FFFFFF] border bg-clip-padding text-stone-800 border-b-2 border-[#E5E5E5] hover:bg-light-gray shadow-[0_3px_0_#E5E5E5] focus-visible:ring-indigo-200',
  disabled:
    'bg-[#E5E5E5] text-[#AFAFAF] border-b-2 border-[#CCCCCC] cursor-not-allowed shadow-[0_3px_0_#CCCCCC]',
  icon: 'bg-indigo-600 text-white border-b-2 border-indigo-700 hover:bg-indigo-500 shadow-[0_3px_0_#4338CA] focus:ring-indigo-600 p-0 flex items-center justify-center focus-visible:ring-indigo-200',
  destructive:
    'bg-red-500 text-white border-b-2 border-red-600 hover:bg-red-600 shadow-[0_3px_0_#B91C1C] focus:ring-red-500',
  dashedOutline:
    'bg-white text-gray-600 border-2 bg-clip-padding border-dashed border-stone-300 border-b-[4px] hover:bg-stone-50 focus:ring-gray-400',
  emerald:
    'bg-emerald-600 text-white border bg-clip-padding border-b-2 border-emerald-700 hover:bg-emerald-500 shadow-[0_3px_0_#065f46] focus:ring-emerald-600',
}

export const sizeStyles = {
  sm: 'text-sm py-2 px-4',
  md: 'text-base py-3 px-6',
  lg: 'text-lg py-4 px-8',
  icon: 'h-10 w-10',
}

export default function DuolingoButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading = false,
  ...props
}: DuolingoButtonProps) {
  const variantStyle =
    disabled || loading ? variantStyles.disabled : variantStyles[variant]
  const sizeStyle = sizeStyles[size]

  return (
    <button
      className={cn(baseStyles, variantStyle, sizeStyle, className)}
      disabled={disabled || loading || variant === 'disabled'}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner variant={variant} />
          {size !== 'icon' && <span className="ml-2 opacity-80">Loading...</span>}
        </div>
      ) : (
        children
      )}
    </button>
  )
}

export function LoadingSpinner({ variant }: { variant: string }) {
  const spinnerColor =
    variant === 'secondary' || variant === 'dashedOutline'
      ? 'text-gray-300'
      : 'text-white'

  return (
    <svg
      className={`animate-spin h-5 w-5 ${spinnerColor}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  )
}
