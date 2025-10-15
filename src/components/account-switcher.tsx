import { AccountName, AccountHandle, useAccount } from '@/hooks/account-ctx'
import { client } from '@/lib/client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPException } from 'hono/http-exception'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react'
import { Icons } from './icons'
import { Loader } from './ai-elements/loader'
import { cn } from '@/lib/utils'
import DuolingoButton from './ui/duolingo-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

interface AccountSwitcherProps {
  showFullDetails?: boolean
}

export const AccountSwitcher = ({ showFullDetails }: AccountSwitcherProps) => {
  const { account: activeAccount } = useAccount()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await client.settings.list_accounts.$get()
      const { accounts } = await res.json()
      return accounts
    },
  })

  const {
    mutate: switchAccount,
    isPending: isSwitching,
    variables: switchAccountVariables,
  } = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const res = await client.settings.switch_account.$post({ accountId })
      return await res.json()
    },
    onSuccess: ({ account }) => {
      toast.success(
        <span>
          Switched to <span className="font-medium text-gray-800">{account.name}</span>.
        </span>,
      )
      setOpen(false)
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['get-active-account'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  if (!activeAccount || !accounts?.length) return null

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open ? false : undefined}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className='w-full' asChild>
            <TooltipTrigger className='w-full' asChild>
              <DuolingoButton
                size={showFullDetails ? "lg" : 'icon'}
                variant="secondary"
                className={cn('w-fit px-1 gap-2', {
                  'px-2 justify-start h-12 min-w-[calc(50%-6px)]': showFullDetails,
                })}
              >
                <Avatar className="rounded-md">
                  <AvatarImage
                    className="rounded-md"
                    src={activeAccount.profile_image_url?.replace('_normal', '_200x200')}
                    alt={activeAccount.username}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(
                      activeAccount.name?.[0] ||
                      activeAccount.username?.[0] ||
                      '?'
                    ).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {showFullDetails && (
                  <div className="flex flex-col items-start">
                    <p className="text-sm font-medium truncate">
                      <span>{activeAccount.name}</span>
                      <span>
                        {activeAccount.verified && (
                          <Icons.verificationBadge className="size-3.5 shrink-0" />
                        )}
                      </span>
                    </p>
                    <p className="text-xs font-normal text-gray-600">@{activeAccount.username}</p>
                  </div>
                )}
              </DuolingoButton>
            </TooltipTrigger>
          </PopoverTrigger>

          <PopoverContent className="w-72 p-2" align="start" side="bottom">
            <div className="space-y-1">
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Switch Account
                </p>
              </div>
              {accounts.map((acc) => {
                const isActive = acc.id === activeAccount.id
                const isSwitchingThis =
                  isSwitching && switchAccountVariables?.accountId === acc.id

                return (
                  <button
                    key={acc.id}
                    onClick={() => !isActive && switchAccount({ accountId: acc.id })}
                    disabled={isActive || isSwitchingThis}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group',
                      isActive
                        ? 'bg-gray-100 cursor-default'
                        : 'hover:bg-stone-100 cursor-pointer',
                    )}
                  >
                    <Avatar className="size-9 ring-2 ring-white shrink-0">
                      <AvatarImage
                        src={acc.profile_image_url?.replace('_normal', '_200x200')}
                        alt={acc.username}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(acc.name?.[0] || acc.username?.[0] || '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {acc.name}
                        </p>
                        {acc.verified && (
                          <Icons.verificationBadge className="size-3.5 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-stone-500 truncate">@{acc.username}</p>
                    </div>
                    <div className="shrink-0">
                      {isSwitchingThis ? (
                        <Loader />
                      ) : isActive ? (
                        <div className="size-5 rounded-full bg-stone-800 flex items-center justify-center">
                          <CheckIcon weight="bold" className="size-3 text-white" />
                        </div>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
        <TooltipContent side="bottom" className="bg-stone-800 text-white">
          Switch Account
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

{
  /* <PopoverTrigger asChild>
        <button className="w-full cursor-pointer h-14 group/switcher justify-start gap-2 p-2 hover:bg-transparent">
          <div className="w-full h-10 flex group-hover/switcher:bg-stone-200 transition-colors rounded-md items-center justify-start flex-shrink-0">
            <div className="!w-12 flex items-center justify-center">
              <Avatar className="size-7 border border-stone-300">
                <AvatarImage
                  src={activeAccount.profile_image_url?.replace('_normal', '_200x200')}
                  alt={activeAccount.username}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(
                    activeAccount.name?.[0] ||
                    activeAccount.username?.[0] ||
                    '?'
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div
              data-state={isCollapsed ? 'collapsed' : 'expanded'}
              className={cn(
                'flex items-center gap-1.5 data-[state=expanded]:animate-in data-[state=expanded]:fade-in data-[state=collapsed]:animate-out data-[state=collapsed]:fade-out fill-mode-forwards duration-200',
                {
                  'opacity-0': !isMounted,
                }
              )}
            >
              <span className="text-sm font-medium text-stone-700 truncate">
                {activeAccount.name}
              </span>
              <CaretDownIcon className="size-3.5 text-stone-500 group-hover/switcher:text-stone-700 transition-colors flex-shrink-0" />
            </div>
          </div>
        </button>
      </PopoverTrigger> */
}
