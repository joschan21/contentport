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
import { AccountAvatar, mapToConnectedAccount, useAccount } from '@/hooks/account-ctx'
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
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

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
  const { account } = useAccount()
  const queryClient = useQueryClient()

  const { mutate: createOAuthLink, isPending: isCreatingOAuthLink } = useMutation({
    mutationFn: async () => {
      const res = await client.auth_router.createTwitterLink.$get({
        action: 'add-account',
      })
      return await res.json()
    },
    onError: () => {
      toast.error('Error, please try again')
    },
    onSuccess: ({ url }) => {
      window.location.href = url
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
      if (!account?.id) return

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

      console.log('STYLE PROMPT', style.prompt);

      if (typeof style.prompt === "string") setPrompt(style.prompt)

      return style
    },
  })

  return (
    <div className="relative z-10 max-w-2xl w-full mx-auto p-6 space-y-8">
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
            <h2 className="text-lg font-semibold text-stone-800">
              All Connected Accounts
            </h2>
            <p className="text-stone-600 text-sm">
              Your personal accounts and accounts delegated to you
            </p>
          </div>
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
        </div>

        {isLoadingAccounts ? (
          <div className="bg-white">
            {[1, 2].map((index) => (
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
                  <div className="group w-full flex items-center justify-between gap-3">
                    <div className="w-full flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="size-10">
                            <AvatarImage
                              src={acc.profile_image_url}
                              alt={`@${acc.username}`}
                            />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm/6">
                              {acc.name?.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{acc.name}</p>
                          </div>
                          <p className="text-sm opacity-60">@{acc.username}</p>
                        </div>
                      </div>
                      {acc.isActive ? (
                        <div className="flex items-end flex-col w-full flex-1">
                          <div className="flex items-center gap-2">
                            <DuolingoBadge variant="achievement" className="text-xs px-2">
                              <Check className="size-3 mr-1" />
                              Active
                            </DuolingoBadge>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {acc.isActive ? null : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        <DuolingoButton
                          onClick={() => switchAccount({ accountId: acc.id })}
                          variant="secondary"
                          size="sm"
                          className="w-fit"
                          loading={
                            isSwitching && switchAccountVariables?.accountId === acc.id
                          }
                        >
                          Switch
                        </DuolingoButton>
                        <DuolingoButton
                          onClick={() => deleteAccount({ accountId: acc.id })}
                          variant="destructive"
                          size="icon"
                          loading={
                            isDeletingAccount &&
                            deleteAccountVariables?.accountId === acc.id
                          }
                        >
                          <Trash2 className="size-4" />
                        </DuolingoButton>
                      </div>
                    )}
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
                    <div className="space-y-3">
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
                createOAuthLink()
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
