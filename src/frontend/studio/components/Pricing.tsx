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
      description: 'Plan and publish your first tweets right now.',
      features: [
        'High-quality, personal AI ghostwriter',
        'Trained on your recent & most successful posts',
        'Generate new content ideas',
        'Create & schedule tweets and threads',
        '5 AI messages per day',
        '1 connected Twitter account',
        '3 Scheduled tweets at a time',
        'Beautiful screenshot editor access',
      ],
      featured: false,
    },
    {
      name: 'Pro',
      id: 'tier-pro',
      href: targetUrl,
      priceMonthly: '$20',
      description: 'Grow and monetize at maximum speed.',
      features: [
        'High-quality, personal AI ghostwriter',
        'Trained on your recent & most successful posts',
        'Generate new content ideas',
        'Create & schedule tweets and threads',
        'Unlimited scheduled tweets',
        'Unlimited AI assistance',
        '3 connected Twitter accounts',
        'Full topic monitor access',
        'See anytime someone mentions your product',
        'No watermark on images',
      ],
      featured: true,
    },
  ]
  return (
    <div className="relative py-16">
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-indigo-600 font-medium mb-6 text-lg">Pricing</p>
        <h1 className="text-5xl mb-8 font-semibold tracking-tight text-balance text-gray-900 sm:text-6xl">
          Grow faster with{' '}
          <span className="relative text-indigo-600">
            <span className="absolute z-0 sm:bg-indigo-500/10 w-[103%] h-[100%] -left-[1%] -top-[2.5%] -rotate-1" />
            less effort 👀
          </span>
        </h1>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex -space-x-2">
            <img
              className="h-10 w-10 rounded-full ring-2 ring-white"
              src="/images/user/ahmet_128.png"
              alt="User testimonial"
            />
            <img
              className="h-10 w-10 rounded-full ring-2 ring-white"
              src="/images/user/chris_128.png"
              alt="User testimonial"
            />
            <img
              className="h-10 w-10 rounded-full ring-2 ring-white"
              src="/images/user/justin_128.png"
              alt="User testimonial"
            />
            <img
              className="h-10 w-10 rounded-full ring-2 ring-white"
              src="/images/user/rohit_128.png"
              alt="User testimonial"
            />
            <img
              className="h-10 w-10 rounded-full ring-2 ring-white"
              src="/images/user/vladan_128.png"
              alt="User testimonial"
            />
          </div>
          <div className="flex flex-col justify-center items-center sm:items-start">
            <div className="flex mb-1">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className="size-6 text-yellow-400 -mx-px fill-current"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <p className="text-base text-left text-gray-600">
              Loved by <span className="font-medium text-gray-900">1,817</span> users
            </p>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 grid max-w-lg grid-cols-1 items-center gap-y-6 sm:mt-16 sm:gap-y-0 lg:max-w-4xl lg:grid-cols-2 space-y-6">
        {tiers.map((tier, tierIdx) => (
          <div
            key={tier.id}
            className={cn(
              'relative bg-white p-8 rounded-3xl border border-black border-opacity-[0.01] bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]',
              {
                'bg-gray-900 text-white': tier.featured,
                'lg:rounded-r-none lg:border-r-0': tierIdx === 0,
              },
            )}
            // className={cn(
            //   tier.featured
            //     ? 'relative bg-gray-900 shadow-2xl'
            //     : 'bg-gray-100 sm:mx-8 lg:mx-0',
            //   tier.featured
            //     ? ''
            //     : tierIdx === 0
            //       ? 'rounded-t-3xl sm:rounded-b-none lg:rounded-tr-none lg:rounded-bl-3xl'
            //       : 'sm:rounded-t-none lg:rounded-tr-3xl lg:rounded-bl-none',
            //   'rounded-3xl p-8 ring-1 ring-gray-900/10 sm:p-10',
            // )}
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
                /mo
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
                <li
                  key={feature}
                  className={cn('flex gap-x-3', {
                    'text-gray-100 font-medium': tier.featured,
                  })}
                >
                  <CheckIcon
                    aria-hidden="true"
                    className={cn(
                      tier.featured ? 'text-indigo-300' : 'text-indigo-600',
                      'h-6 w-5 flex-none',
                    )}
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Link href="/sign-in">
                <DuolingoButton variant={tier.featured ? 'primary' : 'primary'} size="md">
                  Get Started &rarr;
                </DuolingoButton>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
