'use client'

import dynamic from 'next/dynamic'

export const Testimonials = dynamic(
  () =>
    import('@/app/_components/testimonials').then((mod) => ({
      default: mod.Testimonials,
    })),
  { ssr: false },
)
