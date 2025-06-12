'use client'

import { buttonVariants } from '@/components/ui/button'
import { useChat } from '@/hooks/use-chat'
import { useEditor } from '@/hooks/use-editors'
import { useTweets } from '@/hooks/use-tweets'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { InferOutput } from '@/server'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical'
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  CircleEllipsis,
  PanelLeft,
  Plus,
  X,
} from 'lucide-react'
import { createSerializer, parseAsString } from 'nuqs'
import toast from 'react-hot-toast'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import DuolingoButton from './ui/duolingo-button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from './ui/sidebar'
import { useTweetNavigation } from '@/hooks/use-tweet-navigation'

type GetRecentTweetsOutput = InferOutput['tweet']['recents']['tweets']

const searchParams = {
  tweetId: parseAsString,
  chatId: parseAsString,
}

const serialize = createSerializer(searchParams)

export const LeftSidebar = () => {
  const editor = useEditor('tweet-editor')
  const { state } = useSidebar()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = authClient.useSession()
  const { tweetId, queuedImprovements } = useTweets()
  const { navigateToTweet } = useTweetNavigation()

  const { chatId, setChatId } = useChat()

  const isCollapsed = state === 'collapsed'

  const { toggleSidebar } = useSidebar()

  const { data: recentTweets, isPending } = useQuery({
    queryKey: ['get-recent-tweets'],
    queryFn: async () => {
      const res = await client.tweet.recents.$get()
      const { tweets } = await res.json()

      return tweets
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const { mutate: deleteTweet, isPending: isDeleting } = useMutation({
    mutationFn: async (tweetId: string) => {
      const res = await client.tweet.delete.$post({ id: tweetId })
      return res.json()
    },
    onMutate: async (tweetId) => {
      queryClient.setQueryData(['get-recent-tweets'], (old: any) => {
        if (Array.isArray(old)) {
          return old.filter((tweet: any) => tweet.id !== tweetId)
        }
        return old
      })

      if (location.pathname.includes(tweetId)) {
        navigate('/studio')
      }
    },
    onError: (err) => {
      console.error(err)
      toast.error('Failed to delete tweet')
    },
  })

  const clear = () => {
    setChatId(null)
    editor?.update(
      () => {
        const root = $getRoot()
        root.clear()
      },
      { tag: 'system-update' },
    )
  }

  return (
    <Sidebar collapsible="icon" side="left" className="border-r border-border/40">
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
          <p
            className={cn(
              'text-sm/6 text-stone-800 transition-all duration-200 ease-out',
              isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
            )}
          >
            contentport.
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="flex flex-col gap-2">
            <NavLink to="/studio">
              <DuolingoButton
                onClick={clear}
                size="sm"
                className="w-full flex gap-1.5 justify-start items-center h-10"
              >
                <Plus className="size-4 shrink-0" />
                <span
                  className={cn(
                    'transition-all opacity-0 duration-200 ease-out delay-200',
                    isCollapsed ? 'opacity-0 w-0 overflow-hidden hidden' : 'opacity-100',
                  )}
                >
                  New Tweet
                </span>
              </DuolingoButton>
            </NavLink>

            <NavLink
              to={{
                pathname: '/studio/knowledge',
                search: serialize({ chatId }),
              }}
              className={({ isActive }) =>
                cn(
                  buttonVariants({
                    variant: 'ghost',
                    className: 'justify-start gap-2 px-3 py-2',
                  }),
                  isActive && 'bg-stone-200 hover:bg-stone-200 text-accent-foreground',
                )
              }
            >
              <div className="size-6 flex items-center justify-center flex-shrink-0">
                🧠
              </div>
              <span
                className={cn(
                  'transition-all duration-200 ease-out',
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100',
                )}
              >
                Knowledge Base
              </span>
            </NavLink>
          </div>
        </SidebarGroup>

        <div
          className={cn(
            'transition-all duration-200 ease-out overflow-hidden',
            isCollapsed ? 'opacity-0 max-h-0' : 'opacity-100 max-h-[1000px]',
          )}
        >
          <SidebarGroup>
            <div className="px-3 py-2">
              <h3 className="text-xs text-stone-600">Recents</h3>
            </div>

            <div className="flex flex-col gap-1">
              {recentTweets && recentTweets.length > 0 ? (
                <>
                  {recentTweets.slice(0, 5).map((tweet) => {
                    return (
                      <NavLink
                        onClick={() => navigateToTweet(tweet.id)}
                        key={tweet.id}
                        to={{
                          pathname: `/studio`,
                          search: serialize({ chatId }),
                        }}
                        className={() => {
                          const isActive = (tweetId || 'draft') === tweet.id
                          return cn(
                            buttonVariants({
                              variant: 'ghost',
                              size: 'sm',
                              className:
                                'justify-between group/tweet gap-2 px-3 py-2 h-auto',
                            }),
                            isActive && 'bg-stone-200 hover:bg-stone-200',
                          )
                        }}
                      >
                        <div className="flex gap-1.5 items-center truncate">
                          <span className="truncate text-xs">
                            {tweet.content || 'New Tweet'}
                          </span>
                          {queuedImprovements[tweet.id] && (
                            <div className="ml-1 size-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <DuolingoButton
                          variant="destructive"
                          size="icon"
                          className="size-6 shrink-0 opacity-0 group-hover/tweet:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            deleteTweet(tweet.id)
                          }}
                        >
                          <X className="size-3" />
                        </DuolingoButton>
                      </NavLink>
                    )
                  })}

                  {recentTweets && recentTweets.length > 5 && (
                    <button
                      disabled
                      // to={`/studio/tweets${getSearchString()}`}
                      className={cn(
                        buttonVariants({
                          variant: 'ghost',
                          size: 'sm',
                          className: 'justify-start px-3 py-2',
                        }),
                        'text-xs text-muted-foreground',
                      )}
                    >
                      <CircleEllipsis className="size-4 mr-1" />
                      All tweets (soon)
                    </button>
                  )}
                </>
              ) : isPending ? null : (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-stone-500">No tweets yet</p>
                </div>
              )}
            </div>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/40 p-4">
        <div
          className={cn(
            'transition-all duration-200 ease-out overflow-hidden',
            isCollapsed ? 'opacity-0 max-h-0' : 'opacity-100 max-h-[1000px]',
          )}
        >
          <div className="flex flex-col gap-2">
            {data?.user && (
              <NavLink
                to={{
                  pathname: `/settings`,
                  search: chatId ? `?chatId=${chatId}` : undefined,
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
                      {data.user.plan === 'free' ? 'Free' : null}
                    </span>
                  )}
                </div>
              </NavLink>
            )}
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdCtO75IY051uoGcxBQ_vK3uNnNnokb_Z8VTrp5JZJnzUI02g/viewform?usp=dialog"
              className={buttonVariants({ variant: 'outline' })}
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback 🫶
            </a>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
