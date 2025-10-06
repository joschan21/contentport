'use client'

import { Icons } from '@/components/icons'
import { buttonVariants } from '@/components/ui/button'
import { useChatContext } from '@/hooks/use-chat'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { ArrowLeftFromLine, ArrowRightFromLine, PanelLeft } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createSerializer, parseAsString } from 'nuqs'
import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  useSidebar,
} from './ui/sidebar'
import { SidebarSimpleIcon } from '@phosphor-icons/react'

const searchParams = {
  tweetId: parseAsString,
  chatId: parseAsString,
}

const serialize = createSerializer(searchParams)

export const LeftSidebar = () => {
  const pathname = usePathname()

  const { id } = useChatContext()
  const { state, toggleSidebar } = useSidebar()
  const { data } = authClient.useSession()

  const isCollapsed = state === 'collapsed'
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <Sidebar collapsible="icon" side="left" className="z-30 border-r border-border/40">
      <SidebarHeader className="p-0">
        <button
          onClick={toggleSidebar}
          className={cn(
            buttonVariants({
              variant: 'ghost',
              className:
                'w-full cursor-pointer h-14 group/toggle justify-start gap-2 p-2 hover:bg-transparent',
            }),
          )}
        >
          <div className="relative w-fit h-10 flex group-hover/toggle:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0">
            <PanelLeft className="size-[18px] w-12 transition-all duration-200 group-hover/toggle:opacity-0 group-hover/toggle:scale-75" />
            <div className="absolute transition-all duration-200 opacity-0 scale-75 group-hover/toggle:opacity-100 group-hover/toggle:scale-100">
              {isCollapsed ? (
                <ArrowRightFromLine className="size-[18px] w-12" />
              ) : (
                <ArrowLeftFromLine className="size-[18px] w-12" />
              )}
            </div>
          </div>
        </button>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden gap-0">
        {/* Create Group */}
        <SidebarGroup className="relative p-0">
          {isCollapsed && (
            <div
              aria-hidden="true"
              className="absolute pointer-events-none bottom-0 left-0 right-0 border-b border-border/40"
            />
          )}
          <SidebarGroupContent>
            <Link
              suppressHydrationWarning
              href={{
                pathname: '/studio',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className:
                    'w-full cursor-pointer h-14 group/create justify-start gap-2 p-2 hover:bg-transparent',
                }),
              )}
            >
              <div
                className={cn(
                  'w-full h-10 flex  group-hover/create:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0',
                  { 'bg-stone-200': pathname === '/studio' },
                )}
              >
                <Icons.pencil className="size-[18px] w-12" />
                <span
                  data-state={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                    {
                      'opacity-0': !isMounted,
                    },
                  )}
                >
                  Create
                </span>
              </div>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Engage Group */}
        <SidebarGroup className="relative p-0">
          {isCollapsed && (
            <div
              aria-hidden="true"
              className="absolute pointer-events-none bottom-0 left-0 right-0 border-b border-border/40"
            />
          )}

          <SidebarGroupLabel
            data-state={isCollapsed ? 'collapsed' : 'expanded'}
            className={cn(
              'data-[state=collapsed]:pointer-events-none data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200 px-3',
              {
                'opacity-0': !isMounted,
              },
            )}
          >
            Engage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Link
              suppressHydrationWarning
              href={{
                pathname: '/studio/topic-monitor',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className:
                    'w-full cursor-pointer h-14 group/engage justify-start gap-2 p-2 hover:bg-transparent',
                }),
              )}
            >
              <div
                className={cn(
                  'w-full h-10 flex group-hover/engage:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0',
                  { 'bg-stone-200': pathname === '/studio/topic-monitor' },
                )}
              >
                <Icons.magnifier className="size-[18px] w-12" />
                <span
                  data-state={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                    {
                      'opacity-0': !isMounted,
                    },
                  )}
                >
                  Keyword Monitor
                </span>
              </div>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Group */}
        <SidebarGroup className="relative p-0">
          {isCollapsed && (
            <div
              aria-hidden="true"
              className="absolute pointer-events-none bottom-0 left-4 right-4 border-b border-stone-200"
            />
          )}
          <SidebarGroupLabel
            data-state={isCollapsed ? 'collapsed' : 'expanded'}
            className={cn(
              'data-[state=collapsed]:pointer-events-none data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200 px-3',
              {
                'opacity-0': !isMounted,
              },
            )}
          >
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Link
              suppressHydrationWarning
              href={{
                pathname: '/studio/knowledge',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className:
                    'w-full cursor-pointer h-14 pt-2 group/knowledge justify-start gap-2 p-2 hover:bg-transparent',
                }),
              )}
            >
              <div
                className={cn(
                  'w-full h-10 flex group-hover/knowledge:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0',
                  { 'bg-stone-200': pathname.includes('/studio/knowledge') },
                )}
              >
                <Icons.brain className="size-[20px] w-12" />
                <span
                  data-state={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                    {
                      'opacity-0': !isMounted,
                    },
                  )}
                >
                  Knowledge Base
                </span>
              </div>
            </Link>

            <Link
              suppressHydrationWarning
              href={{
                pathname: '/studio/scheduled',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className:
                    'w-full cursor-pointer h-12 group/scheduled justify-start gap-2 p-2 hover:bg-transparent',
                }),
              )}
            >
              <div
                className={cn(
                  'w-full h-10 flex group-hover/scheduled:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0',
                  { 'bg-stone-200': pathname === '/studio/scheduled' },
                )}
              >
                <Icons.calendar className="size-[18px] w-12" />
                <span
                  data-state={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                    {
                      'opacity-0': !isMounted,
                    },
                  )}
                >
                  Schedule
                </span>
              </div>
            </Link>

            <Link
              suppressHydrationWarning
              href={{
                pathname: '/studio/posted',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className:
                    'w-full cursor-pointer h-14 pb-2 group/posted justify-start gap-2 p-2 hover:bg-transparent',
                }),
              )}
            >
              <div
                className={cn(
                  'w-full h-10 flex group-hover/posted:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0',
                  { 'bg-stone-200': pathname === '/studio/posted' },
                )}
              >
                <Icons.outboxTray className="size-[18px] w-12" />
                <span
                  data-state={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                    {
                      'opacity-0': !isMounted,
                    },
                  )}
                >
                  Posted
                </span>
              </div>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Group */}
        <SidebarGroup className="relative p-0">
          {isCollapsed && (
            <div
              aria-hidden="true"
              className="absolute pointer-events-none bottom-0 left-4 right-4 border-b border-stone-200"
            />
          )}
          <SidebarGroupLabel
            data-state={isCollapsed ? 'collapsed' : 'expanded'}
            className={cn(
              'data-[state=collapsed]:pointer-events-none data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200 px-3',
              {
                'opacity-0': !isMounted,
              },
            )}
          >
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Link
              suppressHydrationWarning
              href={{
                pathname: '/studio/accounts',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className:
                    'w-full cursor-pointer h-14 group/accounts justify-start gap-2 p-2 hover:bg-transparent',
                }),
              )}
            >
              <div
                className={cn(
                  'w-full h-10 flex group-hover/accounts:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0',
                  { 'bg-stone-200': pathname.includes('/studio/accounts') },
                )}
              >
                <Icons.imageIcon className="size-[18px] w-12 -mt-[3px]" />
                <span
                  data-state={isCollapsed ? 'collapsed' : 'expanded'}
                  className={cn(
                    'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                    {
                      'opacity-0': !isMounted,
                    },
                  )}
                >
                  Accounts
                </span>
              </div>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-0">
        {isCollapsed && (
          <div className="absolute w-10 mx-auto top-0 left-0 right-0 border-t border-stone-200" />
        )}
        <Link
          suppressHydrationWarning
          href={{
            pathname: `/studio/settings`,
            search: id ? `?chatId=${id}` : undefined,
          }}
          className={cn(
            buttonVariants({
              variant: 'ghost',
              className:
                'w-full cursor-pointer h-14 group/settings justify-start gap-2 p-2 hover:bg-transparent',
            }),
          )}
        >
          <div
            className={cn(
              'relative w-full h-10 flex group-hover/settings:bg-stone-200 transition-colors rounded-md items-center flex-shrink-0',
              { 'bg-stone-200': pathname.includes('/studio/settings') },
            )}
          >
            <div className="!w-12">
              {data?.user.image ? (
                <Avatar className="mx-auto size-7 border border-stone-300">
                  <AvatarImage src={data.user.image} alt={data.user.name ?? 'Profile'} />
                  <AvatarFallback className="text-xs">
                    {data.user.name?.charAt(0) ?? null}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Icons.gear className="size-[20px] w-12" />
              )}
            </div>
            <span
              data-state={isCollapsed ? 'collapsed' : 'expanded'}
              className={cn(
                'data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200 absolute left-12',
                {
                  'opacity-0': !isMounted,
                },
              )}
            >
              Billing & Settings
            </span>
          </div>
        </Link>
      </SidebarFooter>
    </Sidebar>
  )
}
