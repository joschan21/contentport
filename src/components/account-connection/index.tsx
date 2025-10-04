'use client'

import { useRouter } from 'next/navigation'
import DuolingoButton from '../ui/duolingo-button'

export const AccountConnection = () => {
  const router = useRouter()

  return (
    <div className="h-full flex flex-col items-stretch gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-3xl font-semibold text-center">You're all set! 🎉</h3>

        <p className="text-base text-pretty text-gray-500 text-center">
          We're analyzing your tweets and learning your writing style in the background.
        </p>
        <div className="bg-gray-50 rounded-xl p-5 space-y-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600">
                Analyzing your most successful posts
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600">
                Learning your writing patterns
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="size-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600">Building your content profile</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 text-center">
          This usually takes a few minutes. Feel free to explore your dashboard while we
          learn about you!
        </p>
      </div>

      <div className="h-full flex-1 flex items-end">
        <DuolingoButton onClick={() => router.push('/studio')}>
          Go to Dashboard
        </DuolingoButton>
      </div>
    </div>
  )
}
