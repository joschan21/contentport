'use client'

import { authClient } from '@/lib/auth-client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import posthog from 'posthog-js'
import { useRouter } from 'next/navigation'

const LoginPage = () => {
  const router = useRouter()

  const checkIfLoggedIn = async () => {
    const { data } = await authClient.getSession()
    return !!data?.session.id
  }

  const handleAccess = async () => {
    const { data, error } = await authClient.signIn.social({
      provider: 'google',
      callbackURL:
        'https://contentport-git-feat-thread-support-joschan21s-projects.vercel.app/studio',
    })

    if (error) {
      console.error(error)
      posthog.captureException(error)

      toast.error(
        error.message ?? 'An error occurred, please DM @joshtriedcoding on twitter!',
      )
    }
  }

  useEffect(() => {
    checkIfLoggedIn().then((isLoggedIn) => {
      if (isLoggedIn) {
        router.push('/studio')
      } else {
        handleAccess()
      }
    })
  }, [])

  return null
}

export default LoginPage
