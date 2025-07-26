'use client'

import DuolingoButton, {
  baseStyles,
  sizeStyles,
  variantStyles,
} from '@/components/ui/duolingo-button'
import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function DuolingoAuthButtonClient({
  children,
  className = '',
  redirectUrl,
}: {
  children: React.ReactNode
  className?: string
  redirectUrl: string
}) {
  return (
    <Link
      className={cn(baseStyles, variantStyles.primary, sizeStyles.sm, className)}
      href={redirectUrl}
    >
      {children}
    </Link>
  )
}

export function DuolingoHeroButtonClient() {
  return (
    <Link href="/login">
      <DuolingoButton className="w-full h-12 sm:px-8">
        Start Posting More →
      </DuolingoButton>
    </Link>
  )
}
