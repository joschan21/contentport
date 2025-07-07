'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { UpgradeDrawer } from '@/components/upgrade-drawer'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { format, isToday, isTomorrow } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

const Page = () => {
  const router = useRouter()
  const { data } = authClient.useSession()

  const searchParams = useSearchParams()
  const status = searchParams.get('s')

  const { data: subscription } = useQuery({
    queryKey: ['get-subscription'],
    queryFn: async () => {
      const res = await client.stripe.subscription.$get()
      const data = await res.json()
      return data
    },
    refetchInterval(query) {
      if (query.state.data?.status === 'active') {
        return false
      }

      return 2500
    },
    enabled: status === 'processing',
  })

  useEffect(() => {
    if (status) {
      if (status === 'cancelled') {
        toast.error('Checkout cancelled.')
        router.push('/studio/settings')
        return
      }

      if (status === 'processing') {
        if (data?.user.plan === 'pro') {
          toast.success('Upgraded to pro.')
          router.push('/studio/settings')
          return
        }

        // Add optional refetching of session every set interval incase the upgrade takes a while to be logged in the db
        return
      }
    }
  }, [data])

  // const { data: limit } = useQuery({
  //   queryKey: ['get-limit'],
  //   queryFn: async () => {
  //     const res = await client.settings.limit.$get()
  //     return await res.json()
  //   },
  // })

  // const formatResetTime = (timestamp: number) => {
  //   const date = new Date(timestamp)
  //   const timeStr = format(date, 'h:mm a')

  //   if (isToday(date)) {
  //     return `Resets today at ${timeStr}`
  //   }
  //   if (isTomorrow(date)) {
  //     return `Resets tomorrow at ${timeStr}`
  //   }
  //   return `Resets ${format(date, 'MMM d')} at ${timeStr}`
  // }

  const { mutate: createBillingPortalUrl, isPending: isCreatingBillingPortalUrl } =
    useMutation({
      mutationFn: async () => {
        const res = await client.stripe.billing_portal.$get()
        const data = await res.json()
        return data
      },
      onSuccess: ({ url }) => {
        router.push(url)
      },
      onError: (error) => {
        console.error(error)
        toast.error('Something went wrong, please try again.')
      },
    })

  return (
    <div className="relative w-full max-w-md mx-auto mt-12">
      <div className="relative w-full flex  flex-col gap-6 bg-white/90 shadow-xl rounded-2xl z-10 py-10 px-6 md:px-12">
        <div className="flex flex-col items-center w-full gap-6 bg-light-gray rounded-lg p-5">
          {/* user card */}
          <div className="flex flex-col gap-2 items-center">
            {/* <div className="mb-4">
              <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                <AvatarImage
                  src={data?.user.image ?? undefined}
                  alt={data?.user.name ?? 'Profile'}
                />
                <AvatarFallback className="bg-gradient-to-br from-indigo-300 to-indigo-400 text-white text-3xl">
                  {data?.user.name?.charAt(0) ?? null}
                </AvatarFallback>
              </Avatar>
            </div> */}
            <div className="mb-1 flex flex-col items-center">
              <p className="text-2xl font-semibold text-gray-900">{data?.user.name}</p>
              <p className="text-sm text-gray-500">{data?.user.email}</p>
            </div>
            <DuolingoBadge className="mb-6 px-3">
              {data?.user.plan === 'free' ? 'Free Plan' : 'Pro Plan'}
            </DuolingoBadge>
          </div>

          {/* usage card */}
          <div className="bg-white shadow-sm rounded-xl p-3 w-full">
            {/* <div className="flex flex-col justify-between text-sm mb-3">
              <span className="font-medium text-gray-900">Message Usage</span>
              <span className="text-xs text-gray-400 mt-1">
                {limit?.reset ? formatResetTime(Number(limit.reset)) : 'Loading...'}
              </span>
            </div>

            <div className="w-full mb-3">
              <Progress
                value={
                  typeof limit?.remaining === 'number'
                    ? ((20 - limit.remaining) / 20) * 100
                    : 0
                }
              />
            </div>
            <div className="text-xs text-gray-400">
              {typeof limit?.remaining === 'number'
                ? `${limit.remaining}/20 messages remaining`
                : '- messages remaining'}
            </div> */}
            <div className="flex flex-col items-center justify-center gap-2">
              {/* <Separator className="my-4" /> */}
              {data?.user.plan === 'free' ? (
                <p className="text-sm opacity-60">
                  Get unlimited access to Contentport for $20/mo -
                  cancel anytime.
                </p>
              ) : null}
              {data?.user.plan === 'free' ? <UpgradeDrawer /> : null}
              {data?.user.plan === 'pro' ? (
                <DuolingoButton
                  onClick={() => createBillingPortalUrl()}
                  loading={isCreatingBillingPortalUrl}
                >
                  Manage plan
                </DuolingoButton>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
