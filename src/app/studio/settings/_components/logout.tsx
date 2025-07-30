'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'
import React, { useTransition } from 'react'
import toast from 'react-hot-toast'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSignout = async () => {
    setLoading(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            setLoading(false)
            startTransition(() => router.push('/'))
          },
        },
      })
    } catch (error) {
      console.error('Logout failed:', error)
      setLoading(false)
      toast.error('Logout failed!')
    }
  }

  const renderText = () => {
    if (loading) {
      return 'Logging out...'
    }

    if (isPending) {
      return 'Success! Redirecting...'
    }

    return 'Logout'
  }

  return (
    <Button onClick={handleSignout} disabled={loading || isPending} variant="destructive">
      {renderText()}
    </Button>
  )
}
