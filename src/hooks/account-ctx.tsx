import { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Icons } from '@/components/icons'
import { Account } from '@/server/routers/settings-router'
import { motion } from 'framer-motion'

// export interface ConnectedAccount {
//   name: string
//   handle: string
//   avatarFallback: string
//   avatar?: string
//   verified?: boolean
// }

const AccountContext = createContext<{
  account: Account | null
  isLoading: boolean
} | null>(null)

export function mapToConnectedAccount(raw: Account): Account {
  return {
    id: raw.id,
    name: raw?.name || '',
    username: raw?.username || '',
    profile_image_url: raw?.profile_image_url || '',
    verified: raw?.verified ?? false,
  }
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { data, isPending } = useQuery({
    queryKey: ['get-active-account'],
    queryFn: async () => {
      const res = await client.settings.active_account.$get()
      const { account } = await res.json()
      return account ? mapToConnectedAccount(account) : null
    },
  })

  return (
    <AccountContext.Provider value={{ account: data ?? null, isLoading: isPending }}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const ctx = useContext(AccountContext)
  if (!ctx) throw new Error('useAccount must be used within AccountProvider')
  return ctx
}

export function AccountAvatar({ className }: { className?: string }) {
  const { account, isLoading } = useAccount()
  if (isLoading || !account) {
    return <Skeleton className={cn('h-10 w-10 rounded-full', className)} />
  }
  return (
    <Avatar className={cn('h-10 w-10 rounded-full', className)}>
      <AvatarImage src={account.profile_image_url} alt={account.username} />
      <AvatarFallback>
        {(account?.name?.[0] || account?.username?.[0] || '?').toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      duration: 0.5,
      bounce: 0.2,
    },
  },
}

export function AccountName({
  className,
  animate = false,
}: {
  className?: string
  animate?: boolean
}) {
  const { account, isLoading } = useAccount()

  if (isLoading || !account) {
    return <Skeleton className={cn('h-4 w-24 rounded', className)} />
  }

  const renderBadge = () => {
    if (animate)
      return (
        <motion.div
          variants={isLoading ? itemVariants : undefined}
          initial={isLoading ? { scale: 0, rotate: -180 } : false}
          animate={
            isLoading
              ? {
                  scale: 1,
                  rotate: 0,
                  transition: {
                    type: 'spring',
                    duration: 0.8,
                    bounce: 0.4,
                    delay: 0.5,
                  },
                }
              : false
          }
        >
          <Icons.verificationBadge className="size-4" />
        </motion.div>
      )
    else return <Icons.verificationBadge className="size-4" />
  }

  return (
    <a 
      href={`https://x.com/${account.username}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('font-semibold inline-flex items-center gap-1 hover:underline transition-all', className)}
    >
      {account.name}
      {account.verified && renderBadge()}
    </a>
  )
}

export function AccountHandle({ className }: { className?: string }) {
  const { account, isLoading } = useAccount()
  if (isLoading || !account) {
    return <Skeleton className={cn('h-4 w-16 rounded', className)} />
  }
  return <span className={cn('text-stone-400', className)}>@{account.username}</span>
}

export function AccountVerifiedBadge({ className }: { className?: string }) {
  const { account, isLoading } = useAccount()
  if (isLoading || !account) {
    return <Skeleton className={cn('inline-block h-4 w-4 rounded', className)} />
  }
  if (!account.verified) return null
  return <Icons.verificationBadge className={cn('h-4 w-4', className)} />
}
