'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { LucideProps } from 'lucide-react'

interface AnimatedLogoProps extends LucideProps {
  size?: 'sm' | 'md' | 'lg'
  isAnimating?: boolean
}

export function AnimatedLogo({ className, isAnimating = true, ...props }: AnimatedLogoProps) {
  // First leaf (center) - appears second (0.1s delay)
  const leaf1Variants = {
    animate: {
      x: [-30, 0, 0, 30],
      opacity: [0, 1, 1, 0],
      rotate: [-5, 0, 0, 5],
      transition: {
        duration: 2.5,
        times: [0, 0.225, 0.7, 0.925],
        repeat: isAnimating ? Infinity : 0,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
    static: {
      x: 0,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  }

  // Second leaf (right) - appears first (0s delay)
  const leaf2Variants = {
    animate: {
      x: [-30, 0, 0, 30],
      opacity: [0, 1, 1, 0],
      rotate: [-5, 0, 0, 5],
      transition: {
        duration: 2.5,
        times: [0, 0.2, 0.95],
        repeat: isAnimating ? Infinity : 0,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
    static: {
      x: 0,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  }

  // Third leaf (left) - appears last (0.2s delay)
  const leaf3Variants = {
    animate: {
      x: [-30, 0, 0, 30],
      opacity: [0, 1, 1, 0],
      rotate: [-5, 0, 0, 5],
      transition: {
        duration: 2.5,
        times: [0, 0.25, 0.975],
        repeat: isAnimating ? Infinity : 0,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
    static: {
      x: 0,
      opacity: 1,
      rotate: 0,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  }

  const animationState = isAnimating ? 'animate' : 'static'

  return (
    <svg
      viewBox="0 0 506 506"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-full h-full', className)}
    >
      <motion.path
        variants={leaf1Variants}
        initial={{ x: -30, opacity: 0, rotate: -5 }}
        exit={{ x: 30, opacity: 0, rotate: 5 }}
        animate={animationState}
        d="M354.763 258.477C356.718 150.394 250.636 2 250.636 2C250.636 2 150.593 150.966 150.593 258.477C150.593 435.52 252.5 502.5 252.5 502.5C252.5 502.5 351.562 435.52 354.763 258.477Z"
        fill="#4F46E5"
        fillOpacity="0.7"
      />
      <motion.path
        variants={leaf2Variants}
        initial={{ x: -30, opacity: 0, rotate: -5 }}
        exit={{ x: 30, opacity: 0, rotate: 5 }}
        animate={animationState}
        d="M453.383 202.085C453.383 128.522 420.035 68.6943 420.035 68.6943C420.035 68.6943 219.949 168.738 219.949 368.824C219.949 422.52 253.297 502.215 253.297 502.215C253.297 502.215 453.384 402.172 453.383 202.085Z"
        fill="#818CF8"
        fillOpacity="0.7"
      />
      <motion.path
        variants={leaf3Variants}
        initial={{ x: -30, opacity: 0, rotate: -5 }}
        exit={{ x: 30, opacity: 0, rotate: 5 }}
        animate={animationState}
        d="M52 202.085C52.0002 128.522 85.3477 68.6943 85.3477 68.6943C85.3477 68.6943 285.434 168.738 285.434 368.824C285.434 422.52 252.086 502.215 252.086 502.215C252.086 502.215 51.9994 402.172 52 202.085Z"
        fill="#818CF8"
        fillOpacity="0.7"
      />
    </svg>
  )
}
