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
import { useQuery } from '@tanstack/react-query'
import { Dot, Gem, Loader } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type Stripe from 'stripe'

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

      setSubscription(data.subscription)
    }
  }, [data])

  const handleTrial = async () => {
    const res = await client.stripe.checkout_session.$get({ trial: true })
    const data = await res.json()

    if ('error' in data) {
      toast.error(data.error)
      return
    }

    if (!data.url) {
      toast.error('No checkout session could be created')
      return
    }

    router.push(data.url)
    return
  }

  const handleSubscribe = async () => {
    const res = await client.stripe.checkout_session.$get({ trial: false })
    const data = await res.json()

    if ('error' in data) {
      toast.error(data.error)
      return
    }

    if (!data.url) {
      toast.error('No checkout session could be created')
      return
    }

    router.push(data.url)
    return
  }

  return (
    <>
      {isLoading ? (
        <Button disabled>
          <Loader className="animate-spin size-4" /> Loading
        </Button>
      ) : subscription ? (
        <Drawer>
          <DrawerTrigger asChild>
            <Button>
              <Gem className="size-4" /> Upgrade
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-md p-4">
              <DrawerHeader>
                <DrawerTitle>{subscription.name}</DrawerTitle>
                <DrawerDescription>{subscription.description}</DrawerDescription>
              </DrawerHeader>
              <div className="flex flex-col px-4 gap-6">
                <div className="flex flex-col gap-2">
                  <p>Features</p>
                  <ul>
                    {subscription.features.length > 0 ? (
                      subscription.features.map((feature, i) => (
                        <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                          <Dot className="size-4" />
                          <p>{feature.name}</p>
                        </li>
                      ))
                    ) : (
                      <li className="text-muted-foreground text-sm">No features</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-0 justify-end items-end">
                  <span className="text-xl">
                    {subscription.price.currency === 'usd' ? '$' : null}
                    {(subscription.price.unit_amount! / 100).toFixed(2)}/
                  </span>
                  <span className="text-sm text-muted-foreground">month</span>
                </div>
              </div>
              <DrawerFooter>
                <div className="flex gap-2 items-center justify-between">
                  {subscription.enableTrial ? (
                    <Button onClick={handleTrial}>7 day trial</Button>
                  ) : (
                    <Button onClick={handleSubscribe}>
                      <Gem className="size-4" /> Subscribe
                    </Button>
                  )}
                  <DrawerClose asChild>
                    <Button variant="destructive">cancel</Button>
                  </DrawerClose>
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
