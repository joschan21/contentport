import { AccountAvatar, AccountVerifiedBadge } from '@/hooks/account-ctx'
import { CaretRightIcon, HouseIcon } from '@phosphor-icons/react'
import Link from 'next/link'
import { PropsWithChildren } from 'react'

export const Container = ({
  children,
  title,
  description,
}: PropsWithChildren<{ title: string; description: string }>) => {
  return (
    <div className="relative z-10">
      <img
        alt=""
        src="/banner.png"
        className="h-32 w-full object-cover object-top lg:h-48 -mt-16"
      />
      {/* <div className="h-20" /> */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="-mt-12 sm:-mt-16 sm:flex sm:items-end sm:space-x-5">
          <div className="relative flex shrink-0 w-fit">
            <AccountAvatar className="w-full h-full size-32 ring-4 ring-white border border-black border-opacity-[0.01] bg-clip-padding shadow-[0_1px_1px_rgba(0,0,0,0.05),0_4px_6px_rgba(34,42,53,0.04),0_24px_68px_rgba(47,48,55,0.05),0_2px_3px_rgba(0,0,0,0.04)]" />
            <div className="absolute bottom-1 right-1 size-8">
              <AccountVerifiedBadge className="size-full rotate-6" />
            </div>
          </div>
          <div className="mt-6 sm:mt-14 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
            <div className="mt-6 min-w-0 flex-1 sm:hidden md:block flex flex-col space-y-2">
              <h1 className="truncate text-3xl font-bold text-gray-900 tracking-tight">
                {title}
              </h1>
              <p className="text-base text-gray-500 max-w-prose">{description}</p>
            </div>
            <div className="mt-6 flex flex-col justify-stretch space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4"></div>
          </div>
        </div>
        <div className="mt-6 hidden min-w-0 flex-1 sm:block md:hidden">
          <h1 className="truncate text-2xl font-bold text-gray-900">{title}</h1>
        </div>

        {children}
      </div>
    </div>
  )
}
