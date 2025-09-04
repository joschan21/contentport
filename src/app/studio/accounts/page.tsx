'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import DuolingoInput from '@/components/ui/duolingo-input'
import DuolingoTextarea from '@/components/ui/duolingo-textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AccountAvatar, mapToConnectedAccount, useAccount } from '@/hooks/account-ctx'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import type { Account } from '@/server/routers/settings-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HTTPException } from 'hono/http-exception'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Link as LinkIcon,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import posthog from 'posthog-js'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UserIcon, UserSwitchIcon, XLogoIcon } from '@phosphor-icons/react'

interface TweetCard {
  src?: string
  username: string
  name: string
  text?: string
}

const TweetCard = ({ name, username, src, text }: TweetCard) => {
  return (
    <div className="w-full">
      <div className="text-left rounded-lg bg-white border border-dashed border-stone-200 shadow-sm overflow-hidden">
        <div className="flex items-start gap-3 p-6">
          <Avatar className="h-10 w-10 rounded-full border border-border/30">
            <AvatarImage src={src} alt={`@${username}`} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
              {name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{name}</span>
              <span className="text-sm/6 text-muted-foreground">@{username}</span>
            </div>
            <div className="mt-1 text-base whitespace-pre-line">{text}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  const [tweetLink, setTweetLink] = useState('')
  const [prompt, setPrompt] = useState('')
  const [showConnectDialog, setShowConnectDialog] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [isStyleSettingsOpen, setIsStyleSettingsOpen] = useState(false)
  const [skipPostConfirmation, setSkipPostConfirmation] = useState(false)
  const { account } = useAccount()
  const { data } = authClient.useSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    const stored = localStorage.getItem('skipPostConfirmation')
    if (stored !== null) {
      setSkipPostConfirmation(stored === 'true')
    }
  }, [])

  const handleSkipConfirmationToggle = (checked: boolean) => {
    setSkipPostConfirmation(checked)
    localStorage.setItem('skipPostConfirmation', checked.toString())
    toast.success(checked ? 'Post confirmation disabled' : 'Post confirmation enabled')
  }

  const { mutate: createOAuthLink, isPending: isCreatingOAuthLink, variables: isCreatingOAuthLinkVariables } = useMutation({
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
      window.open(url, '_blank')
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

  const { data: accounts, isPending: isLoadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await client.settings.list_accounts.$get()
      return await res.json()
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
      posthog.capture('account_switched', {
        accountId: account.id,
        accountName: account.name,
        accountUsername: account.username,
      })

      queryClient.setQueryData(['get-active-account'], mapToConnectedAccount(account))

      queryClient.setQueryData(['accounts'], (oldData: any) => {
        if (!oldData?.accounts) return oldData
        return {
          ...oldData,
          accounts: oldData.accounts.map((acc: Account) => ({
            ...acc,
            isActive: acc.id === account.id,
          })),
        }
      })

      toast.success(`Switched to ${account.name}`)
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const {
    mutate: deleteAccount,
    isPending: isDeletingAccount,
    variables: deleteAccountVariables,
  } = useMutation({
    mutationFn: async ({ accountId }: { accountId: string }) => {
      await client.settings.delete_account.$post({ accountId })
    },
    onMutate: async ({ accountId }) => {
      await queryClient.cancelQueries({ queryKey: ['accounts'] })
      const previousAccounts = queryClient.getQueryData(['accounts'])

      queryClient.setQueryData(['accounts'], (oldData: any) => {
        if (!oldData?.accounts) return oldData
        return {
          ...oldData,
          accounts: oldData.accounts.filter((acc: Account) => acc.id !== accountId),
        }
      })

      return { previousAccounts }
    },
    onSuccess: () => {
      toast.success('Account deleted successfully')
    },
    onError: (error: HTTPException, _, context) => {
      queryClient.setQueryData(['accounts'], context?.previousAccounts)
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
    onMutate: async ({ accountId }) => {
      // Cancel any outgoing refetches to avoid optimistic update being overwritten
      await queryClient.cancelQueries({ queryKey: ['accounts'] })
      await queryClient.cancelQueries({ queryKey: ['get-active-account'] })
    },
    onSuccess: ({ account, profile_image_url }, { accountId }) => {
      queryClient.setQueryData(['accounts'], (oldData: any) => {
        if (!oldData?.accounts) return oldData
        return {
          ...oldData,
          accounts: oldData.accounts.map((acc: Account) =>
            acc.id === accountId
              ? {
                  ...acc,
                  profile_image_url,
                  name: account.name,
                  username: account.username,
                }
              : acc,
          ),
        }
      })

      const activeAccount = queryClient.getQueryData(['get-active-account']) as any
      if (activeAccount?.id === accountId) {
        queryClient.setQueryData(['get-active-account'], {
          ...activeAccount,
          profile_image_url,
          name: account.name,
          username: account.username,
        })
      }

      toast.success('Profile refreshed!')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message || 'Failed to refresh profile picture')
    },
  })

  const { mutate: importTweets, isPending: isImporting } = useMutation({
    mutationFn: async ({ link }: { link: string }) => {
      if (!account) return

      await client.style.import.$post({ link })
    },
    onSuccess: () => {
      setTweetLink('')
      refetchStyle()
      toast.success('Tweet imported successfully')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const {
    mutate: deleteTweet,
    isPending: isDeleting,
    variables: deleteVariables,
  } = useMutation({
    mutationFn: async ({ tweetId }: { tweetId: string }) => {
      if (!account) return

      await client.style.delete.$post({ tweetId })
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['account-style'] })
    },
  })

  const { mutate: savePrompt, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      await client.style.save.$post({ prompt })
    },
    onSuccess: () => {
      refetchStyle()
      toast.success('Style saved')
    },
    onError: (error: HTTPException) => {
      toast.error(error.message)
    },
  })

  const { data: style, refetch: refetchStyle } = useQuery({
    queryKey: ['account-style', account?.id],
    queryFn: async () => {
      const res = await client.style.get.$get()
      const style = await res.json()

      console.log('STYLE PROMPT', style.prompt)

      if (typeof style.prompt === 'string') setPrompt(style.prompt)

      return style
    },
  })

  return (
    <div className="relative z-10 max-w-2xl w-full mx-auto p-6 space-y-8 pb-32">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-stone-900">Account Management</h1>
        <p className="text-stone-600">
          Manage your connected accounts, writing style, and preferences
        </p>
      </div>

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">Your Accounts</h2>
            <p className="text-stone-600 text-sm">
              Personal accounts and accounts delegated to you
            </p>
          </div>

          {data?.user.plan === 'free' ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <DuolingoButton
                  size="sm"
                  onClick={() => {
                    toast('🔒 Please upgrade to Pro to add unlimited accounts')
                  }}
                  className="w-auto relative z-20 transition-all duration-200"
                >
                  <Lock className="size-4 mr-2" />
                  <span className="whitespace-nowrap">Add Account</span>
                  <ChevronDown className="size-4 ml-2" />
                </DuolingoButton>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-700">
                <p>Upgrade to Pro to add unlimited accounts</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <DuolingoButton size="sm" className="w-auto relative z-20">
                  <Plus className="size-4 mr-2" />
                  <span className="whitespace-nowrap">Add Account</span>
                  <ChevronDown className="size-4 ml-2" />
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
          <div className="bg-white">
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
                {index === 1 && <Separator />}
              </div>
            ))}
          </div>
        ) : accounts?.accounts?.length ? (
          <div className="bg-white">
            {accounts.accounts.map((acc, i) => (
              <div key={acc.id}>
                <div className="rounded-lg p-4">
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{acc.name}</p>
                        </div>
                        <p className="text-sm opacity-60">@{acc.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
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
                        <PopoverContent className="w-60 p-1" align="end">
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
                              <span className="truncate">Switch to <span className="text-indigo-600 font-medium">@{acc?.username}</span></span>
                            </button>

                            <Separator />

                            <button
                              onClick={() => refreshProfileData({ accountId: acc.id })}
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
                              Refresh Profile
                            </button>

                            <button
                              onClick={() => createOAuthLink({ action: 're-authenticate' }  )}
                              disabled={
                                isRefreshingProfile &&
                                refreshProfileVariables?.accountId === acc.id
                              }
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                            >
                              {isCreatingOAuthLink &&
                              isCreatingOAuthLinkVariables?.action === 're-authenticate' ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <XLogoIcon className="size-[18px]" />
                              )}
                              Re-authenticate
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
                              Delete Account
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
                {i < accounts.accounts.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white border border-dashed border-stone-300 p-8 text-center space-y-4">
            <p className="text-stone-600">No accounts connected yet</p>
          </div>
        )}
      </div>

      <Separator />

      {/* Style Settings Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900">Style Settings</h2>
          <p className="text-stone-600 mt-1">Customize AI assistant output</p>
        </div>

        <Collapsible open={isStyleSettingsOpen} onOpenChange={setIsStyleSettingsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full group">
              <div className="flex items-center justify-between p-4 rounded-t-lg border border-stone-200 bg-white hover:bg-stone-50 transition-colors">
                <div className="flex items-center gap-3">
                  {account && <AccountAvatar className="size-10" />}
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-stone-800">
                        Writing Style & References
                      </h3>
                      {/* <DuolingoBadge variant="gray" className="px-3 text-xs">
                        Optional
                      </DuolingoBadge> */}
                    </div>
                    {account && (
                      <p className="text-sm opacity-60">For @{account.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isStyleSettingsOpen ? (
                    <ChevronDown className="size-5 text-stone-500 transition-transform" />
                  ) : (
                    <ChevronRight className="size-5 text-stone-500 transition-transform" />
                  )}
                </div>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-white border border-t-0 border-stone-200 rounded-b-lg space-y-6 pt-4 pb-4">
            {/* Fine-Tune Writing Style */}
            <div className="px-4 space-y-4">
              <div>
                <h4 className="text-base font-semibold text-stone-800">
                  Fine-Tune Writing Style
                </h4>
                <p className="opacity-60 text-sm">
                  Describe your writing preferences, tone, and style patterns
                </p>
              </div>

              <DuolingoTextarea
                fullWidth
                className="min-h-32"
                placeholder="My tweets always use this emoji (◆) for bullet points and usually consist of a short, catchy intro hook and three bullet points. I love the 🎉 emoji"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />

              <DuolingoButton
                onClick={() => savePrompt()}
                size="sm"
                disabled={isSaving}
                className="w-fit"
              >
                <Save className="mr-2 size-4" />
                Save Writing Style
              </DuolingoButton>
            </div>

            <Separator className="mx-4" />

            {/* Style Reference Tweets */}
            <div className="px-4 space-y-4">
              <div>
                <h4 className="text-base font-semibold text-stone-800">
                  Style Reference Tweets
                </h4>
                <p className="opacity-60 text-sm">
                  Import tweets that exemplify your desired writing style
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <DuolingoInput
                  fullWidth
                  value={tweetLink}
                  onChange={(e) => setTweetLink(e.target.value)}
                  className="flex-1"
                  type="text"
                  placeholder="https://x.com/username/status/1234567890123456789"
                />
                <DuolingoButton
                  onClick={() => importTweets({ link: tweetLink })}
                  disabled={isImporting || !tweetLink.trim()}
                  variant="secondary"
                  size="sm"
                  className="w-fit"
                >
                  Import
                </DuolingoButton>
              </div>

              <div className="">
                {style?.tweets?.length ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-stone-700">
                      {style.tweets.length} reference tweet
                      {style.tweets.length > 1 ? 's' : ''}
                    </p>
                    <div
                      className="space-y-3 border rounded-lg bg-stone-50 max-h-96 overflow-y-auto"
                      style={{ minHeight: '6rem' }} // optional: ensures some height even if empty
                    >
                      {style.tweets.map((tweet, index) => (
                        <div className="relative" key={index}>
                          <DuolingoButton
                            variant="destructive"
                            className="absolute top-3 right-3 w-fit p-1.5 text-white aspect-square z-10"
                            onClick={() => deleteTweet({ tweetId: tweet.id })}
                            disabled={isDeleting && deleteVariables?.tweetId === tweet.id}
                          >
                            {isDeleting && deleteVariables?.tweetId === tweet.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <X className="size-4" />
                            )}
                          </DuolingoButton>
                          <TweetCard
                            username={tweet.author.username}
                            name={tweet.author.name}
                            src={tweet.author.profile_image_url}
                            text={tweet.text}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Sparkles className="w-10 h-10 text-stone-300 mb-3" />
                    <p className="text-sm font-medium text-stone-700">
                      No imported tweets yet
                    </p>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs">
                      Import tweets that match your desired writing style
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Before connecting:</DialogTitle>
            <DialogDescription>
              Make sure you are signed in to the Twitter/X account you wish to connect.
              <br />
              <br />
              You may need to{' '}
              <a
                href="https://x.com/account/switch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline underline-offset-2 hover:underline"
              >
                switch accounts
              </a>{' '}
              before authenticating.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row">
            <DuolingoButton
              variant="secondary"
              size="sm"
              onClick={() => setShowConnectDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </DuolingoButton>
            <DuolingoButton
              onClick={() => {
                createOAuthLink({ action: 'add-account' })
                setShowConnectDialog(false)
              }}
              size="sm"
              disabled={isCreatingOAuthLink}
              className="w-full sm:w-auto"
            >
              {isCreatingOAuthLink ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </DuolingoButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isCreatingInviteLink
                ? 'Creating Access Link...'
                : 'Secure Access Link Created'}
            </DialogTitle>
            <DialogDescription>
              Send this invite to the account owner (client, brand, company). Once
              accepted, the brand/client account will appear in your dashboard with
              posting permissions.
            </DialogDescription>
          </DialogHeader>

          {isCreatingInviteLink ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-stone-500" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
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
                <p className="text-xs text-stone-600">This link is valid for 24 hours.</p>
              </div>

              <DialogFooter>
                <DuolingoButton
                  size="sm"
                  onClick={() => setShowInviteDialog(false)}
                  className="w-full"
                >
                  Got it
                </DuolingoButton>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
