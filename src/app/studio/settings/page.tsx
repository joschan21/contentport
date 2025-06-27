'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import { Progress } from '@/components/ui/progress'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import { format, isToday, isTomorrow } from 'date-fns'

const Page = () => {
  const { data } = authClient.useSession()

  const { data: limit } = useQuery({
    queryKey: ['get-limit'],
    queryFn: async () => {
      const res = await client.settings.limit.$get()
      return await res.json()
    },
  })

  const formatResetTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const timeStr = format(date, 'h:mm a')

    if (isToday(date)) {
      return `Resets today at ${timeStr}`
    }
    if (isTomorrow(date)) {
      return `Resets tomorrow at ${timeStr}`
    }
    return `Resets ${format(date, 'MMM d')} at ${timeStr}`
  }

  const handleUpgrade = async () => {
    // try {
    //   const res = await client.stripe.createCheckout.$get()
    //   const data = await res.json()
    //   if ('error' in data) {
    //     console.error(data.error)
    //     return
    //   }
    //   // redirect to checkout
    //   window.location.assign(data.url!)
    // } catch (err) {
    //   console.error('Upgrade error:', err)
    // }
  }

  return (
    <div className="relative w-full max-w-md mx-auto mt-12">
      <div className="relative w-full flex  flex-col gap-6 bg-white/90 shadow-xl rounded-2xl z-10 py-10 px-6 md:px-12">
        <div className="flex flex-col items-center w-full gap-6 bg-light-gray rounded-lg p-5">
          {/* user card */}
          <div className="flex flex-col gap-2 items-center">
            <div className="mb-4">
              <Avatar className="w-24 h-24 border-4 border-white shadow-md">
                <AvatarImage
                  src={data?.user.image ?? undefined}
                  alt={data?.user.name ?? 'Profile'}
                />
                <AvatarFallback className="bg-gradient-to-br from-yellow-300 to-indigo-400 text-white text-3xl">
                  {data?.user.name?.charAt(0) ?? null}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="mb-1 flex flex-col items-center">
              <p className="text-2xl font-semibold text-gray-900">{data?.user.name}</p>
              <p className="text-sm text-gray-500">{data?.user.email}</p>
            </div>
            <DuolingoBadge className="mb-6 px-3">
              {data?.user.plan === 'free' ? 'Free Plan' : null}
            </DuolingoBadge>
          </div>

          {/* usage card */}
          <div className="bg-white shadow-sm rounded-xl p-3 w-full">
            <div className="flex flex-col justify-between text-sm mb-3">
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
            </div>
            <div className="flex items-center justify-center mt-2">
              <Button onClick={handleUpgrade}>Upgrade</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Page
