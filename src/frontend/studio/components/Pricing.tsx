'use client'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { CheckIcon } from '@phosphor-icons/react'
import DuolingoButton from '@/components/ui/duolingo-button'
import Link from 'next/link'

interface PricingProps {
  targetUrl?: string
}

export default function Pricing({ targetUrl }: PricingProps) {
  const tiers = [
    {
      name: 'Free',
      id: 'tier-free',
      href: targetUrl,
      priceMonthly: '$0',
      description:
        'Perfect for trying out Contentport. Plan and publish your first tweets for free.',
      features: [
        'Create tweets and threads',
        'Schedule up to 3 tweets at a time',
        'Limited AI assistance',
        'Connect 1 Twitter account',
        'Limited access to Topic Monitor',
        'Access to beautiful screenshot editor',
      ],
      featured: false,
    },
    {
      name: 'Pro',
      id: 'tier-pro',
      href: targetUrl,
      priceMonthly: '$20',
      description: 'Perfect for DevRels, busy technical founders and content managers.',
      features: [
        'Create tweets and threads',
        'Schedule unlimited tweets',
        'Unlimited AI assistance',
        'Connect 3 Twitter accounts',
        'Monitor 5 topics (e.g. your product name)',
        'See anytime someone mentions your product or brand on Twitter',
        'Refresh Topic Monitor anytime',
        'Access to beautiful screenshot editor',
        'No watermark on images',
      ],
      featured: true,
    },
  ]
  return (
    <div className="relative isolate bg-white px-6 py-24">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-3 -z-10 transform-gpu overflow-hidden px-36 blur-3xl"
      >
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="mx-auto aspect-1155/678 w-288.75 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
        />
      </div>
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-base/7 font-semibold text-indigo-600">Pricing</h2>
        <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
          Get started with Contentport
        </p>
      </div>
      <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-20 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2">
        {tiers.map((tier, tierIdx) => (
          <div
            key={tier.id}
            className={cn(
              tier.featured
                ? 'relative bg-gray-900 shadow-2xl'
                : 'bg-white/60 sm:mx-8 lg:mx-0',
              tier.featured
                ? ''
                : tierIdx === 0
                  ? 'rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl'
                  : 'sm:rounded-t-none lg:rounded-tr-3xl lg:rounded-bl-none',
              'rounded-3xl p-8 ring-1 ring-gray-900/10 sm:p-10',
            )}
          >
            {/* Most value badge for Pro plan */}
            {tier.featured && (
              <div className="absolute top-4 right-4">
                <div className="bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-md shadow-lg">
                  Most value
                </div>
              </div>
            )}

            <h3
              id={tier.id}
              className={cn(
                tier.featured ? 'text-indigo-400' : 'text-indigo-600',
                'text-base/7 font-semibold',
              )}
            >
              {tier.name}
            </h3>
            <p className="mt-4 flex items-baseline gap-x-2">
              <span
                className={cn(
                  tier.featured ? 'text-white' : 'text-gray-900',
                  'text-5xl font-semibold tracking-tight',
                )}
              >
                {tier.priceMonthly}
              </span>
              <span
                className={cn(
                  tier.featured ? 'text-gray-400' : 'text-gray-500',
                  'text-base',
                )}
              >
                /month
              </span>
            </p>
            <p
              className={cn(
                tier.featured ? 'text-gray-300' : 'text-gray-600',
                'mt-6 text-base/7',
              )}
            >
              {tier.description}
            </p>
            <ul
              role="list"
              className={cn(
                tier.featured ? 'text-gray-300' : 'text-gray-600',
                'mt-8 space-y-3 text-sm/6 sm:mt-10',
              )}
            >
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      tier.featured ? 'text-indigo-400' : 'text-indigo-600',
                      'h-6 w-5 flex-none',
                    )}
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Link href="/login">
                <DuolingoButton variant={tier.featured ? 'primary' : 'primary'} size="md">
                  Get Started Now!
                </DuolingoButton>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
