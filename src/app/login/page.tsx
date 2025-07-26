'use client'

import { authClient } from '@/lib/auth-client'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import posthog from 'posthog-js'
import { useQueryState } from 'nuqs'
import { ExclamationTriangleIcon } from '@radix-ui/react-icons'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
const LoginPage = () => {
  const [errorMsg, setErrorMsg] = useQueryState('errorMsg')

  const handleAccess = async () => {
    setErrorMsg(null)
    const { error } = await authClient.signIn.social({ provider: 'google' })

    if (error) {
      posthog.captureException(error)

      setErrorMsg(
        error.message ?? 'An error occurred, please DM @joshtriedcoding on twitter!',
      )
    }
  }

  useEffect(() => {
    if (!errorMsg) handleAccess()
  }, [])

  const renderChildren = () => {
    if (errorMsg) {
      return (
        <div className="w-full border border-4 border-destructive border-dashed flex flex-col relative items-center gap-3 max-w-xl bg-white z-10 shadow-xl rounded-2xl  py-10 px-3 md:px-12">
          <h1 className="text-xl font-medium">Something went wrong!</h1>
          <p className="text-center">{errorMsg}</p>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/">Go Back</Link>
            </Button>
            <Button onClick={handleAccess} variant="destructive">
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className=" w-full flex flex-col items-center gap-3 max-w-sm bg-white z-10 shadow-xl rounded-2xl  py-10 px-6 md:px-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin text-primary"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <p className="text-xl text-primary font-medium text-center">Please Wait</p>
        <p className="text-center">
          You are being redirected, this may take a few seconds ...
        </p>
      </div>
    )
  }

  return (
    <main className="h-[100vh] flex items-center justify-center">{renderChildren()}</main>
  )
}

export default LoginPage
