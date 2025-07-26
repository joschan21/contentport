'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { baseStyles, variantStyles, sizeStyles } from './duolingo-styles'

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
