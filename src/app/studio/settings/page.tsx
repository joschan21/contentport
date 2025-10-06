'use client'

import { Container } from '@/components/container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import DuolingoButton from '@/components/ui/duolingo-button'
import DuolingoInput from '@/components/ui/duolingo-input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import {
  CreditCardIcon,
  GearIcon,
  SignOutIcon,
  SketchLogoIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const Page = () => {
  const router = useRouter()
  const { data, refetch } = authClient.useSession()
  const [activeTab, setActiveTab] = useState('billing')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [name, setName] = useState('')

  const searchParams = useSearchParams()
  const status = searchParams.get('s')

  const { mutate: handleLogout, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push('/')
          },
        },
      })
    },
  })

  const { data: subscription } = useQuery({
    queryKey: ['get-subscription'],
    queryFn: async () => {
      const res = await client.stripe.get_active_subscription.$get()
      const data = await res.json()
      return data
    },
  })

  const { data: usageStats } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: async () => {
      const res = await client.settings.usage_stats.$get()
      const data = await res.json()
      return data
    },
  })

  useEffect(() => {
    if (data?.user.name) {
      setName(data.user.name)
    }
  }, [data?.user.name])

  useEffect(() => {
    if (status) {
      if (status === 'cancelled') {
        router.push('/studio/settings')
        return
      }

      if (status === 'processing') {
        if (data?.user.plan === 'pro') {
          toast.success('Upgraded to pro.')
          router.push('/studio/settings')
          return
        }

        return
      }
    }
  }, [data])

  const { mutate: handleBillingAction, isPending: isBillingActionPending } = useMutation({
    mutationKey: ['handle-billing-action', subscription?.hasActiveSubscription],
    mutationFn: async () => {
      const hasActiveSubscription = subscription?.hasActiveSubscription

      if (hasActiveSubscription) {
        const res = await client.stripe.billing_portal.$get()
        const data = await res.json()
        return data
      } else {
        const res = await client.stripe.checkout_session.$get({ trial: false })
        const data = await res.json()
        return data
      }
    },
    onSuccess: ({ url }) => {
      if (url) {
        router.push(url)
      } else {
        toast.error('Unable to create session. Please try again.')
      }
    },
    onError: (error) => {
      console.error(error)
      toast.error('Something went wrong, please try again.')
    },
  })

  const { mutate: updateName, isPending: isUpdatingName } = useMutation({
    mutationFn: async (name: string) => {
      const res = await client.settings.update_name.$post({ name })
      return await res.json()
    },
    onSuccess: () => {
      toast.success('Name updated successfully')
      refetch()
    },
    onError: (error: Error) => {
      console.error(error)
      toast.error(error.message || 'Failed to update name')
    },
  })

  const { mutate: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: async () => {
      const res = await client.settings.schedule_delete_my_account.$post()
      return await res.json()
    },
    onSuccess: () => {
      toast.success('Your account is scheduled for immediate deletion.')
      setShowDeleteModal(false)
      handleLogout()
    },
    onError: (error: Error) => {
      console.error(error)
      if (error.message.includes('subscription')) {
        toast.error(error.message, { duration: 5000 })
      } else {
        toast.error('Failed to delete account. Please try again.')
      }
    },
  })

  const isPro = data?.user.plan === 'pro'

  const chatRequestsUsed = usageStats?.chatRequests.used ?? 0
  const chatRequestsLimit = usageStats?.chatRequests.limit ?? (isPro ? Infinity : 5)

  const connectedAccountsUsed = usageStats?.connectedAccounts.used ?? 0
  const connectedAccountsLimit = usageStats?.connectedAccounts.limit ?? 3

  const scheduledTweetsUsed = usageStats?.scheduledTweets.used ?? 0
  const scheduledTweetsLimit = usageStats?.scheduledTweets.limit ?? (isPro ? Infinity : 3)

  return (
    <Container title="Settings" description="Manage your Contentport account">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value)}
        defaultValue="billing"
        className="mt-6 w-full"
      >
        <div className="flex justify-between items-center">
          <TabsList className="bg-gray-200">
            <TabsTrigger value="billing" onClick={() => setActiveTab('billing')}>
              <CreditCardIcon className="size-5" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="settings" onClick={() => setActiveTab('settings')}>
              <GearIcon className="size-5" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <hr className="my-4 bg-gray-200 h-px" />

        <TabsContent value="settings">
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
              Account Settings
            </h3>
            <Card className="w-full">
              <CardHeader>
                <Label className="text-gray-800">First Name</Label>
                <p className="text-sm text-gray-500">
                  This is used in invites to your team.
                </p>
              </CardHeader>
              <CardContent className="flex gap-2 w-full">
                <DuolingoInput
                  className="max-w-md w-full"
                  placeholder="John"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <DuolingoButton
                  className="w-fit"
                  onClick={() => updateName(name)}
                  loading={isUpdatingName}
                  disabled={isUpdatingName || !name.trim() || name === data?.user.name}
                >
                  Save
                </DuolingoButton>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <Label className="text-gray-800">Email Address</Label>
                <p className="text-sm text-gray-500">
                  Your email address is used for account notifications.
                </p>
              </CardHeader>
              <CardContent>
                <DuolingoInput
                  className="max-w-md w-full"
                  placeholder="John"
                  defaultValue={data?.user.email || ''}
                  readOnly
                  disabled
                />
              </CardContent>
            </Card>

            <div className="flex justify-start items-center gap-2">
              <DuolingoButton
                variant="secondary"
                className="w-fit"
                onClick={() => handleLogout()}
                loading={isLoggingOut}
              >
                <SignOutIcon className="size-4 mr-1.5" weight="bold" />
                Sign out
              </DuolingoButton>

              <div className="w-px h-10 bg-stone-200" />

              <DuolingoButton
                variant="destructive"
                className="w-fit"
                onClick={() => setShowDeleteModal(true)}
              >
                <TrashIcon className="size-4 mr-1.5" weight="bold" />
                Delete My Account
              </DuolingoButton>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="flex flex-col gap-6">
            <h3 className="text-2xl font-semibold tracking-tight text-gray-900">
              Billing
            </h3>
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-800">{isPro ? 'Pro' : 'Free'} Plan</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      {isPro
                        ? 'You have access to all pro features.'
                        : 'Upgrade to unlock unlimited features.'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DuolingoButton
                  onClick={() => handleBillingAction()}
                  className="w-fit"
                  loading={isBillingActionPending}
                  disabled={isBillingActionPending}
                >
                  <SketchLogoIcon className="size-4 mr-1.5" weight="bold" />
                  {isPro ? 'Manage Billing' : 'Upgrade Now'}
                </DuolingoButton>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <Label className="text-gray-800">Usage Overview</Label>
                <p className="text-sm text-gray-500 mt-1">
                  Track your daily usage and limits.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm text-gray-600">Chat Requests</Label>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {isPro ? '∞' : chatRequestsUsed}
                      </span>
                      <span className="text-sm text-gray-500">
                        {isPro ? 'unlimited' : `/ ${chatRequestsLimit} today`}
                      </span>
                    </div>
                    {!isPro && (
                      <Progress
                        value={(chatRequestsUsed / chatRequestsLimit) * 100}
                        className="mt-3"
                      />
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm text-gray-600">Connected Accounts</Label>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {connectedAccountsUsed}
                      </span>
                      <span className="text-sm text-gray-500">
                        / {connectedAccountsLimit}
                      </span>
                    </div>
                    <Progress
                      value={(connectedAccountsUsed / connectedAccountsLimit) * 100}
                      className="mt-3"
                    />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm text-gray-600">Scheduled Tweets</Label>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {isPro ? '∞' : scheduledTweetsUsed}
                      </span>
                      <span className="text-sm text-gray-500">
                        {isPro ? 'unlimited' : `/ ${scheduledTweetsLimit}`}
                      </span>
                    </div>
                    {!isPro && (
                      <Progress
                        value={(scheduledTweetsUsed / scheduledTweetsLimit) * 100}
                        className="mt-3"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Modal showModal={showDeleteModal} setShowModal={setShowDeleteModal}>
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-red-100 rounded-full p-2">
                <WarningIcon className="size-6 text-red-600" weight="fill" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Delete Account</h2>
            </div>
            <p className="text-sm text-gray-600 text-pretty pr-12">
              Are you <span className="font-medium text-red-600">absolutely sure</span>{' '}
              you want to delete your account? This action cannot be undone.
            </p>
          </div>

          <div className="mb-6">
            {subscription?.hasActiveSubscription && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <WarningIcon className="size-5 text-amber-600 mt-0.5" weight="fill" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Cancel your subscription first
                    </p>
                    <p className="text-sm text-amber-700">
                      Please cancel your Pro subscription before deleting your account.
                      You can manage your subscription in the Billing tab.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-sm text-red-600 font-medium mb-2">
              Deleting your account will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>All your tweets and drafts</li>
              <li>Your writing style and memories</li>
              <li>All connected accounts</li>
              <li>Your subscription and billing information</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DuolingoButton
              type="button"
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </DuolingoButton>
            <DuolingoButton
              type="button"
              onClick={() => deleteAccount()}
              loading={isDeletingAccount}
              disabled={subscription?.hasActiveSubscription || isDeletingAccount}
              variant="destructive"
            >
              <TrashIcon className="size-4 mr-1.5 shrink-0" weight="bold" />
              {subscription?.hasActiveSubscription ? 'Cancel Sub' : 'Delete Account'}
            </DuolingoButton>
          </div>
        </div>
      </Modal>
    </Container>
  )
}

export default Page
