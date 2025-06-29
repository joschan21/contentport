import { redis } from '@/lib/redis'
import { Check, CheckCircle, Users } from 'lucide-react'

interface InvitePageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function InviteSuccessPage({ searchParams }: InvitePageProps) {
  const inviteId = (await searchParams).id

  const inviterName = await redis.get<string>(`invite:name:${inviteId}`)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl bg-clip-padding border border-stone-900 border-opacity-10 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
            <Check className="size-6 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-stone-900 mb-2">All done!</h1>

          <p className="text-stone-600 mb-8 leading-relaxed">
            <span className="font-semibold">{inviterName}</span> now has access to this Twitter account. You can remove this permission at any time in your Twitter dashboard.
          </p>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-stone-500">
            That's it! They will receive access shortly.
          </p>
        </div>
      </div>
    </div>
  )
}
