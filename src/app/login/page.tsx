'use client'

import { authClient } from '@/lib/auth-client'
import { useEffect } from 'react'

const LoginPage = () => {
  const handleAccess = async () => {
    await authClient.signIn.social({ provider: 'google' })
  }

  useEffect(() => {
    handleAccess()
  }, [])

  return null
}

export default LoginPage
