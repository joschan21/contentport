'use client'

import { AccountConnection } from '@/components/account-connection'
import { Container } from '@/components/container'
import { Icons } from '@/components/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Loader } from '@/components/ui/loader'
import { Modal } from '@/components/ui/modal'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { RealtimeEvents } from '@/lib/realtime'
import { PlusIcon, UserSwitchIcon, XIcon, XLogoIcon } from '@phosphor-icons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRealtime } from '@upstash/realtime/client'
import { HTTPException } from 'hono/http-exception'
import {
  Check,
  Copy,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function AccountsPage() {
  const router = useRouter()
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const isNewAccountConnected = searchParams.get('new_account_connected')
  const [showNewAccountConnectedModal, setShowNewAccountConnectedModal] = useState(false)

  useEffect(() => {
    if (isNewAccountConnected) {
      setShowNewAccountConnectedModal(true)
      router.replace('/studio/accounts', { scroll: false })
    }
  }, [isNewAccountConnected])

  const {
    mutate: createOAuthLink,
    isPending: isCreatingOAuthLink,
    variables: isCreatingOAuthLinkVariables,
  } = useMutation({
    mutationFn: async ({ action }: { action: 'add-account' | 're-authenticate' }) => {
      const res = await client.auth_router.createTwitterLink.$get({
        action,
      })
      return await res.json()
    },
    onError: () => {
      toast.error('Error, please try again')
    },
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onSettled: () => {
      setShowConnectDialog(false)
    },
  })

  const { mutate: createInviteLink, isPending: isCreatingInviteLink } = useMutation({
    mutationFn: async () => {
      const res = await client.auth_router.createInviteLink.$get()
      return await res.json()
    },
    onMutate: () => {
      setShowInviteDialog(true)
    },
    onError: () => {
      toast.error('Error creating invite link')
    },
    onSuccess: ({ url }) => {
      setInviteLink(url)
    },
  })

  const {
    data: accounts,
    isPending: isLoadingAccounts,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await client.settings.list_accounts.$get()
      const { accounts } = await res.json()

      return accounts
    },
  })

  useRealtime<RealtimeEvents>({
    channel: session?.user.id,
    enabled:
      Boolean(Boolean(session?.user.id)) &&
      Boolean(
        accounts?.some(({ postIndexingStatus }) => postIndexingStatus === 'started'),
      ),
    events: {
      index_memories: { status: () => refetchAccounts() },
      index_tweets: { status: () => refetchAccounts() },
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
      toast.success(`Switched to ${account.name}`)
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['get-active-account'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  const {
    mutate: deleteAccount,
    isPending: isDeletingAccount,
    variables: deleteAccountVariables,
  } = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      await client.settings.delete_twitter_account.$post({ accountId })
    },
    onSuccess: () => {
      toast.success('Account deleted successfully')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  const {
    mutate: refreshProfileData,
    isPending: isRefreshingProfile,
    variables: refreshProfileVariables,
  } = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const res = await client.settings.refresh_profile_data.$post({ accountId })
      return await res.json()
    },
    onSuccess: () => {
      toast.success('Profile refreshed!')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message || 'Failed to refresh profile picture')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['get-active-account'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })

  const {
    mutate: reindexTweets,
    isPending: isReindexingTweets,
    variables: reindexTweetsVariables,
  } = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      const res = await client.knowledge.reindex_tweets.$post({ accountId })
      return await res.json()
    },
    onSuccess: () => refetchAccounts(),
  })

  return (
    <>
      <Modal
        showModal={showNewAccountConnectedModal}
        setShowModal={setShowNewAccountConnectedModal}
        className="p-6 max-w-lg"
      >
        <AccountConnection
          title="Account connected! 🎉"
          description="We're analyzing your tweets and learning your writing style in the background."
          buttonText="Close"
          onClick={() => setShowNewAccountConnectedModal(false)}
        />
      </Modal>

      <Container
        title="Manage Accounts"
        description="Run all Twitter accounts from a single place."
      >
        <div className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <p className="text-stone-700">
              <span className="mr-1.5">👉</span> Showing {accounts?.length} account
              {accounts?.length === 1 ? '' : 's'}
            </p>
            {session?.user.plan === 'free' ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DuolingoButton
                    size="sm"
                    onClick={() => {
                      toast('🔒 Upgrade to add more Twitter accounts')
                    }}
                    className="w-auto relative z-20 transition-all duration-200"
                  >
                    <PlusIcon className="size-4 mr-1.5" weight="bold" />
                    <span className="whitespace-nowrap">Add Account</span>
                  </DuolingoButton>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-gray-700">
                  <p>Upgrade to add more Twitter accounts</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <DuolingoButton
                    size="sm"
                    className="w-auto relative z-20 transition-all duration-200"
                  >
                    <PlusIcon className="size-4 mr-1.5" weight="bold" />
                    <span className="whitespace-nowrap">Add Account</span>
                  </DuolingoButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="p-3 border-2 shadow-xl">
                  <div className="space-y-2">
                    <DropdownMenuItem asChild>
                      <button
                        onClick={() => setShowConnectDialog(true)}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-all cursor-pointer border-0 w-full group hover:shadow-sm"
                      >
                        <div className="flex-shrink-0 size-10 bg-gray-100 border border-gray-900 border-opacity-10 bg-clip-padding shadow-sm rounded-md flex items-center justify-center transition-all">
                          <Plus className="size-5 text-gray-600 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                            Personal Account
                          </h4>
                          <p className="text-sm opacity-60 leading-relaxed">
                            Add a personal Twitter account
                          </p>
                        </div>
                      </button>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <button
                        onClick={() => createInviteLink()}
                        disabled={isCreatingInviteLink}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-blue-50 transition-all cursor-pointer border-0 w-full group hover:shadow-sm disabled:opacity-50"
                      >
                        <div className="flex-shrink-0 size-10 bg-gray-100 border border-gray-900 border-opacity-10 bg-clip-padding shadow-sm rounded-md flex items-center justify-center transition-all">
                          <UserPlus className="size-5 text-gray-600 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-900 transition-colors">
                            Delegate Access
                          </h4>
                          <p className="text-sm opacity-60 leading-relaxed">
                            Add a client/brand account
                          </p>
                        </div>
                      </button>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {isLoadingAccounts ? (
            <Card className="p-0">
              {[1].map((index) => (
                <div key={index}>
                  <div className="rounded-lg p-4">
                    <div className="w-full flex items-center justify-between">
                      <div className="w-full flex items-center gap-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          ) : accounts?.length ? (
            <Card className="gap-0 p-0">
              {accounts.map((acc, i) => {
                return (
                  <Fragment key={acc.id}>
                    <div key={acc.id} className="px-6 py-5">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10">
                            <AvatarImage
                              src={acc.profile_image_url}
                              alt={`@${acc.username}`}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
                              {acc.name?.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="inline-flex items-center gap-1 text-sm font-medium">
                              <span>{acc.name}</span>
                              {acc.verified && (
                                <span>
                                  <Icons.verificationBadge className="size-4" />
                                </span>
                              )}
                            </p>
                            <p className="text-sm opacity-60">@{acc.username}</p>
                            {session?.user.isAdmin ? (
                              <p className="text-xs text-gray-500">[ADMIN]: {acc.id}</p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {acc.postIndexingStatus === 'started' ? (
                            <DuolingoBadge variant="gray" className="text-xs px-2">
                              <Loader variant="classic" size="xs" className="-mt-[2px]" />
                              <span className="ml-2">Indexing...</span>
                            </DuolingoBadge>
                          ) : acc.postIndexingStatus === 'error' ? (
                            <DuolingoBadge variant="error" className="text-xs px-2">
                              <XIcon className="size-3 mr-1" />
                              Indexing error -{' '}
                              <button
                                onClick={() => reindexTweets({ accountId: acc.id })}
                                disabled={
                                  isReindexingTweets &&
                                  reindexTweetsVariables?.accountId === acc.id
                                }
                                className="cursor-pointer ml-1 underline underline-offset-2 hover:underline disabled:opacity-50"
                              >
                                {isReindexingTweets &&
                                reindexTweetsVariables?.accountId === acc.id
                                  ? 'trying again...'
                                  : 'try again'}
                              </button>
                            </DuolingoBadge>
                          ) : null}

                          {acc.isActive && (
                            <DuolingoBadge variant="achievement" className="text-xs px-2">
                              <Check className="size-3 mr-1" />
                              Active
                            </DuolingoBadge>
                          )}

                          <Popover>
                            <PopoverTrigger asChild>
                              <DuolingoButton
                                variant="secondary"
                                size="icon"
                                className="size-8"
                              >
                                <MoreHorizontal className="size-4" />
                              </DuolingoButton>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-1" align="end">
                              <div className="space-y-1">
                                <button
                                  onClick={() => switchAccount({ accountId: acc.id })}
                                  disabled={
                                    acc.isActive ||
                                    (isSwitching &&
                                      switchAccountVariables?.accountId === acc.id)
                                  }
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                                >
                                  {isSwitching &&
                                  switchAccountVariables?.accountId === acc.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <UserSwitchIcon className="size-4 shrink-0" />
                                  )}
                                  <span className="truncate">
                                    Switch to{' '}
                                    <span className="text-indigo-600 font-medium">
                                      {acc?.name}
                                    </span>
                                  </span>
                                </button>

                                <Separator />

                                <button
                                  onClick={() =>
                                    refreshProfileData({ accountId: acc.id })
                                  }
                                  disabled={
                                    isRefreshingProfile &&
                                    refreshProfileVariables?.accountId === acc.id
                                  }
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                                >
                                  {isRefreshingProfile &&
                                  refreshProfileVariables?.accountId === acc.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="size-4" />
                                  )}
                                  <p className="truncate inline-flex items-start flex-col">
                                    <span>Refresh Profile</span>
                                    <span className="text-xs text-stone-500">
                                      Refresh profile picture and name
                                    </span>
                                  </p>
                                </button>

                                <button
                                  onClick={() =>
                                    createOAuthLink({ action: 're-authenticate' })
                                  }
                                  disabled={
                                    isRefreshingProfile &&
                                    refreshProfileVariables?.accountId === acc.id
                                  }
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                                >
                                  {isCreatingOAuthLink &&
                                  isCreatingOAuthLinkVariables?.action ===
                                    're-authenticate' ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <XLogoIcon className="size-[18px]" />
                                  )}
                                  <p className="truncate inline-flex items-start flex-col">
                                    <span>Re-authenticate</span>
                                    <span className="text-xs text-stone-500">
                                      Restore posting permissions
                                    </span>
                                  </p>
                                </button>

                                <Separator />

                                <button
                                  onClick={() => deleteAccount({ accountId: acc.id })}
                                  disabled={
                                    acc.isActive ||
                                    (isDeletingAccount &&
                                      deleteAccountVariables?.accountId === acc.id)
                                  }
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
                                >
                                  {isDeletingAccount &&
                                  deleteAccountVariables?.accountId === acc.id ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="size-4" />
                                  )}
                                  <p className="truncate inline-flex items-start flex-col">
                                    <span>Delete Account</span>
                                    {acc.isActive && (
                                      <span className="text-xs text-red-500">
                                        Cannot delete active account
                                      </span>
                                    )}
                                  </p>
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    {i < accounts.length - 1 && <Separator />}
                  </Fragment>
                )
              })}
            </Card>
          ) : (
            <div className="rounded-lg bg-white border border-dashed border-stone-300 p-8 text-center space-y-4">
              <p className="text-stone-600">No accounts connected yet</p>
            </div>
          )}
        </div>

        <Modal showModal={showConnectDialog} setShowModal={setShowConnectDialog}>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Before connecting:
              </h2>
              <p className="text-gray-600 pr-12">
                Make sure you are signed in to the Twitter/X account you wish to connect.
                <br />
                <br />
                You may need to{' '}
                <a
                  href="https://x.com/account/switch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 font-medium underline underline-offset-2 hover:underline"
                >
                  switch accounts
                </a>{' '}
                before authenticating.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <DuolingoButton
                variant="secondary"
                onClick={() => setShowConnectDialog(false)}
                disabled={isCreatingOAuthLink}
              >
                Cancel
              </DuolingoButton>
              <DuolingoButton
                onClick={() => {
                  createOAuthLink({ action: 'add-account' })
                }}
                disabled={isCreatingOAuthLink}
                loading={isCreatingOAuthLink}
              >
                Connect
              </DuolingoButton>
            </div>
          </div>
        </Modal>

        <Modal showModal={showInviteDialog} setShowModal={setShowInviteDialog}>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {isCreatingInviteLink
                  ? 'Creating Access Link...'
                  : 'Secure Access Link Created'}
              </h2>
              <p className="text-sm text-gray-600 pr-12">
                Send this invite to the account owner (client, brand, company). Once
                accepted, the brand/client account will appear in your dashboard with
                posting permissions.
              </p>
            </div>

            {isCreatingInviteLink ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin text-stone-500" />
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center space-x-2 p-3 bg-stone-50 rounded-lg border">
                    <LinkIcon className="size-4 text-stone-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-stone-700 outline-none"
                    />
                    <DuolingoButton
                      variant="secondary"
                      size="sm"
                      className="w-fit p-2"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink)
                        toast.success('Link copied to clipboard')
                      }}
                    >
                      <Copy className="size-4" />
                    </DuolingoButton>
                  </div>
                  <p className="text-xs text-stone-600">
                    This link is valid for 24 hours.
                  </p>
                </div>

                <div className="flex justify-end">
                  <DuolingoButton onClick={() => setShowInviteDialog(false)}>
                    Got it
                  </DuolingoButton>
                </div>
              </>
            )}
          </div>
        </Modal>
      </Container>
    </>
  )
}
