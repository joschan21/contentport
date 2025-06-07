import { authClient } from '@/lib/auth-client'
import { useEffect } from 'react'

export const LoginPage = () => {
  const handleAccess = async () => {
    await authClient.signIn.social({ provider: 'google' })
  }

  useEffect(() => {
    handleAccess()
  }, [])

  return null
}
