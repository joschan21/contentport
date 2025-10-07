'use client'

import { useTransition } from 'react'
import DuolingoButton from '../ui/duolingo-button'

export const AccountConnection = ({
  title,
  description,
  buttonText,
  onClick,
}: {
  title: string
  description: string
  buttonText: string
  onClick: () => void
}) => {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(() => {
      onClick()
    })
  }

  return (
    <div className="h-full flex flex-col items-stretch gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-3xl font-semibold text-left">{title}</h3>

        <p className="text-base text-pretty text-gray-500 text-left">
          {description}
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
        <p className="text-sm text-gray-500 text-left">
          This only takes a few seconds. Feel free to explore your dashboard while we
          learn about you!
        </p>
      </div>

      <div className="h-full flex-1 flex items-end">
        <DuolingoButton onClick={handleClick} loading={isPending}>
          {buttonText}
        </DuolingoButton>
      </div>
    </div>
  )
}
