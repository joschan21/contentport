'use client'

import { client } from '@/lib/client'
import { useQuery } from '@tanstack/react-query'
import Tweet from './tweet'
import { InitialConfigType } from '@lexical/react/LexicalComposer'
import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

export type ConnectedAccount = {
  username: string
  name: string
  profile_image_url: string | undefined
  verified?: boolean
}

export const DEFAULT_CONNECTED_ACCOUNT: ConnectedAccount = {
  username: 'contentport',
  name: 'contentport',
  profile_image_url: undefined,
  verified: true,
}

interface TweetEditorProps extends HTMLAttributes<HTMLDivElement> {
  id?: string | undefined
  initialContent?: string
  selectionMode?: boolean
}

export default function TweetEditor({
  id,
  initialContent,
  className,
  selectionMode = false,
  ...rest
}: TweetEditorProps) {
  const { data } = useQuery<ConnectedAccount>({
    queryKey: ['get-connected-account'],
    queryFn: async () => {
      const res = await client.settings.connected_account.$get()
      const { account } = await res.json()
      return account ?? DEFAULT_CONNECTED_ACCOUNT
    },
    initialData: () => {
      const account = localStorage.getItem('connected-account')
      if (account) {
        try {
          return JSON.parse(account) as any
        } catch (err) {
          return DEFAULT_CONNECTED_ACCOUNT
        }
      } else return DEFAULT_CONNECTED_ACCOUNT
    },
    refetchOnWindowFocus: false,
  })

  const alwaysDefinedData = data ?? DEFAULT_CONNECTED_ACCOUNT

  const account = {
    avatar: alwaysDefinedData.profile_image_url,
    avatarFallback: alwaysDefinedData.name.slice(0, 1).toUpperCase(),
    handle: alwaysDefinedData.username,
    name: alwaysDefinedData.name,
    verified: alwaysDefinedData.verified,
  }

  return (
    <div
      className={cn('relative z-10 w-full rounded-lg font-sans', className)}
      {...rest}
    >
      <div className="space-y-4 w-full">
        <Tweet
          id={id}
          initialContent={initialContent}
          account={account}
          selectionMode={selectionMode}
        />
      </div>
    </div>
  )
}
