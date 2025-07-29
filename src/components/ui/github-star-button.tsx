'use client'

import { cn } from '@/lib/utils'
import { Heart } from 'lucide-react'
import { baseStyles, sizeStyles, variantStyles } from './duolingo-button'

interface GitHubStarButtonProps {
  repo: string
  className?: string
}

export default function GitHubStarButton({ repo, className }: GitHubStarButtonProps) {
  return (
    <a
      href={`https://github.com/${repo}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        baseStyles,
        variantStyles.secondary,
        sizeStyles.sm,
        'flex items-center gap-1 whitespace-nowrap',
      )}
    >
      Star on GitHub <Heart className="size-4 fill-red-500 stroke-black" />
    </a>
  )
}
