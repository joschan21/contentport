'use client'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { client } from '@/lib/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowRight, Dot, Gem, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type Stripe from 'stripe'
import DuolingoButton from './ui/duolingo-button'
import dynamic from 'next/dynamic'

const SenjaWidgetDynamic = dynamic(
  () => import('@/components/senja-widget').then((mod) => ({ default: mod.SenjaWidget })),
  { ssr: false },
)

type Subscription = {
  name: string
  description: string | null
  features: Stripe.Product.MarketingFeature[]
  price: Stripe.Price
  enableTrial: boolean
}

export const UpgradeDrawer = () => {
  const router = useRouter()

  const [subscription, setSubscription] = useState<Subscription | undefined>(undefined)

  const { data, isLoading } = useQuery({
    queryKey: ['upgrade-drawer-fetch-product'],
    queryFn: async () => {
      const res = await client.stripe.subscription_product.$get()
      return await res.json()
    },
  })

  useEffect(() => {
    if (data) {
      if ('error' in data) {
        toast.error(data.error)
        return
      }

      setSubscription(data.subscription as Subscription)
    }
  }, [data])

  const { mutate: handleSubscribe, isPending } = useMutation({
    mutationFn: async () => {
      const res = await client.stripe.checkout_session.$get({ trial: false })
      const data = await res.json()
      return data
    },
    onSuccess: ({ url }) => {
      if (!url) {
        toast.error('No checkout session could be created')
        return
      }

      router.push(url)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      {isLoading ? (
        <Button disabled>
          <Loader className="animate-spin size-4" /> Loading
        </Button>
      ) : subscription ? (
        <Drawer>
          <DrawerTrigger asChild>
            <DuolingoButton size="sm" className="w-full gap-1.5">
              Get Pro
            </DuolingoButton>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerClose />
            <div className="mx-auto w-full max-w-lg p-4">
              <DrawerHeader className="flex flex-col">
                <DrawerTitle className="text-2xl trackint-tight">
                  Contentport Pro
                </DrawerTitle>
                <DrawerDescription className="text-base text-pretty">
                  Join 400+ technical founders growing their business with Contentport
                </DrawerDescription>

                <SenjaWidgetDynamic className="mt-2" />
              </DrawerHeader>
              <div className="flex flex-col px-4 gap-6">
                <div className="flex flex-col gap-2">
                  <ul>
                    {subscription.features.length > 0 ? (
                      subscription.features.map((feature, i) => (
                        <li key={i} className="flex items-center justify-start gap-1.5">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-indigo-500"
                          >
                            <circle cx="4" cy="4" r="4" fill="currentColor" />
                          </svg>
                          <p className='text-gray-700'>{feature.name}</p>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground text-sm">No features</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-x-2">
                  <h2 className="text-3xl flex gap-x-8 text-text-primary">
                    {subscription.price.currency === 'usd' ? '$' : null}
                    {(subscription.price.unit_amount! / 100).toFixed(0)}
                  </h2>
                  <div className="gap-y-2 flex flex-col justify-center">
                    <h3 className="text-xs leading-[0.7] opacity-60">per month</h3>
                    <h3 className="text-xs leading-[0.7] opacity-60">billed monthly</h3>
                  </div>
                </div>

                {/* <div className="flex gap-0 justify-end items-end">
                  <span className="text-xl">
                    {subscription.price.currency === 'usd' ? '$' : null}
                    {(subscription.price.unit_amount! / 100).toFixed(0)}/
                  </span>
                  <span className="text-sm text-muted-foreground">month</span>
                </div> */}
              </div>
              <DrawerFooter>
                <div className="flex gap-2 items-center justify-between">
                  <DuolingoButton
                    size="sm"
                    className="h-12"
                    loading={isPending}
                    onClick={() => handleSubscribe()}
                  >
                    Get Pro
                  </DuolingoButton>
                </div>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Button disabled>
          <Gem className="size-4" /> Upgrade
        </Button>
      )}
    </>
  )
}
