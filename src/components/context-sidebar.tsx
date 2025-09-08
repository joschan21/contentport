'use client'

import { buttonVariants } from '@/components/ui/button'
import { useChatContext } from '@/hooks/use-chat'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { ArrowLeftFromLine, ArrowRightFromLine, PanelLeft, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createSerializer, parseAsString } from 'nuqs'
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
import { Icons } from '@/components/icons'

const searchParams = {
  tweetId: parseAsString,
  chatId: parseAsString,
}

const serialize = createSerializer(searchParams)

export const LeftSidebar = () => {
  const { state } = useSidebar()
  const { data } = authClient.useSession()

  const pathname = usePathname()

  const { id } = useChatContext()

  const isCollapsed = state === 'collapsed'

  const { toggleSidebar } = useSidebar()

  return (
    <Sidebar collapsible="icon" side="left" className="z-50 border-r border-border/40">
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center justify-start gap-2">
          <button
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-md hover:bg-accent/50 transition-colors flex items-center justify-center group/toggle-button flex-shrink-0"
          >
            <PanelLeft className="h-4 w-4 transition-all duration-200 group-hover/toggle-button:opacity-0 group-hover/toggle-button:scale-75" />
            <div className="absolute transition-all duration-200 opacity-0 scale-75 group-hover/toggle-button:opacity-100 group-hover/toggle-button:scale-100">
              {isCollapsed ? (
                <ArrowRightFromLine className="h-4 w-4" />
              ) : (
                <ArrowLeftFromLine className="h-4 w-4" />
              )}
            </div>
          </button>
          <div
            className={cn(
              'flex items-center gap-1 transition-all duration-200 ease-out',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
            )}
          >
            {/* <Icons.logo className="size-4" /> */}
            <p className={cn('text-sm/6 text-stone-800 ')}>Contentport</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Create Group */}
        <SidebarGroup className="relative">
          {isCollapsed && (
            <div className="absolute bottom-0 left-0 right-0 border-b border-border/40" />
          )}
          <SidebarGroupLabel
            className={cn(
              'transition-all duration-200 ease-out px-3',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
            )}
          >
            Create
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Link
              href={{
                pathname: '/studio',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className: 'w-full justify-start gap-2 px-3 py-2',
                }),
                pathname === '/studio' &&
                  'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
              )}
            >
              <div className="aspect-square h-full flex items-center justify-center flex-shrink-0">
                <Icons.pencil className="size-6" />
              </div>
              <span
                className={cn(
                  'transition-all opacity-0 duration-200 ease-out delay-200',
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden hidden' : 'opacity-100',
                )}
              >
                Studio
              </span>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Discover Group */}
        <SidebarGroup className="relative">
          {isCollapsed && (
            <div className="absolute bottom-0 left-0 right-0 border-b border-border/40" />
          )}
          <SidebarGroupLabel
            className={cn(
              'transition-all duration-200 ease-out px-3',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
            )}
          >
            Engage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Link
              href={{
                pathname: '/studio/feed',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className: 'w-full justify-start gap-2 px-3 py-2',
                }),
                pathname === '/studio/feed' &&
                  'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
              )}
            >
              <div className="aspect-square h-full flex items-center justify-center flex-shrink-0">
                <Icons.magnifier className="size-5" />
              </div>
              <span
                className={cn(
                  'transition-all duration-200 ease-out',
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
                )}
              >
                Keyword Monitor
              </span>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Group */}
        <SidebarGroup className="relative">
          {isCollapsed && (
            <div className="absolute bottom-0 left-0 right-0 border-b border-border/40" />
          )}
          <SidebarGroupLabel
            className={cn(
              'transition-all duration-200 ease-out px-3',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
            )}
          >
            Manage
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="flex flex-col gap-1">
              <Link
                href={{
                  pathname: '/studio/knowledge',
                  search: serialize({ chatId: id }),
                }}
                className={cn(
                  buttonVariants({
                    variant: 'ghost',
                    className: 'justify-start gap-2 px-3 py-2',
                  }),
                  pathname.includes('/studio/knowledge') &&
                    'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
                )}
              >
                <div className="aspect-square h-full flex items-center justify-center flex-shrink-0">
                  <Icons.brain className="size-6" />
                </div>
                <span
                  className={cn(
                    'transition-all duration-200 ease-out',
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
                  )}
                >
                  Knowledge Base
                </span>
              </Link>

              <Link
                href={{
                  pathname: '/studio/scheduled',
                  search: serialize({ chatId: id }),
                }}
                className={cn(
                  buttonVariants({
                    variant: 'ghost',
                    className: 'justify-start gap-2 px-3 py-2',
                  }),
                  pathname === '/studio/scheduled' &&
                    'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
                )}
              >
                <div className="aspect-square h-full flex items-center justify-center flex-shrink-0">
                  <Icons.calendar className="size-6" />
                </div>
                <span
                  className={cn(
                    'transition-all duration-200 ease-out',
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
                  )}
                >
                  Schedule
                </span>
              </Link>

              <Link
                href={{
                  pathname: '/studio/posted',
                  search: serialize({ chatId: id }),
                }}
                className={cn(
                  buttonVariants({
                    variant: 'ghost',
                    className: 'justify-start gap-2 px-3 py-2',
                  }),
                  pathname === '/studio/posted' &&
                    'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
                )}
              >
                <div className="aspect-square h-full flex items-center justify-center flex-shrink-0">
                  <Icons.outboxTray className="size-6" />
                </div>
                <span
                  className={cn(
                    'transition-all duration-200 ease-out',
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
                  )}
                >
                  Posted
                </span>
              </Link>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account Group */}
        <SidebarGroup className="relative">
          <SidebarGroupLabel
            className={cn(
              'transition-all duration-200 ease-out px-3',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
            )}
          >
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Link
              href={{
                pathname: '/studio/accounts',
                search: serialize({ chatId: id }),
              }}
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className: 'w-full justify-start gap-2 px-3 py-2',
                }),
                pathname.includes('/studio/accounts') &&
                  'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
              )}
            >
              <div className="aspect-square h-full flex items-center justify-center flex-shrink-0">
                <Icons.imageIcon className="size-6" />
              </div>
              <span
                className={cn(
                  'transition-all duration-200 ease-out',
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
                )}
              >
                Accounts
              </span>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4">
        <div
          className={cn(
            'transition-all duration-200 ease-out overflow-hidden',
            isCollapsed ? 'opacity-0 max-h-0' : 'opacity-100 max-h-[1000px]',
          )}
        >
          <div className="flex flex-col gap-2">
            {data?.user ? (
              <Link
                href={{
                  pathname: `/studio/settings`,
                  search: id ? `?chatId=${id}` : undefined,
                }}
                className={cn(
                  buttonVariants({
                    variant: 'outline',
                    className: 'flex items-center gap-2 justify-start px-3 py-2',
                  }),
                  'h-16',
                )}
              >
                <Avatar className="size-9 border-2 border-white shadow-md">
                  <AvatarImage
                    src={data.user.image || undefined}
                    alt={data.user.name ?? 'Profile'}
                  />
                  <AvatarFallback>{data.user.name?.charAt(0) ?? null}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate text-sm font-medium text-stone-800">
                    {data.user.name ?? 'Account'}
                  </span>

                  {data.user.plan && (
                    <span className="truncate text-xs text-muted-foreground">
                      {data.user.plan === 'free' ? 'Free' : '🐐 Pro'}
                    </span>
                  )}
                </div>
              </Link>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            'transition-all duration-0 ease-out overflow-hidden',
            isCollapsed ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0',
          )}
        >
          <div className="flex flex-col gap-2">
            <Link
              href={{
                pathname: `/studio/settings`,
                search: id ? `?chatId=${id}` : undefined,
              }}
              className={buttonVariants({
                variant: 'ghost',
                className: 'text-muted-foreground hover:text-foreground',
              })}
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
