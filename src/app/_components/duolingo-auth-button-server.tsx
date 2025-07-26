import React from 'react'
import { DuolingoAuthButtonClient } from './duolingo-auth-button-client'
import { retrieveUserSession } from './retrieve-session'

export async function DuolingoAuthButtonServer({
  childrenVariants,
  className = '',
}: {
  childrenVariants: {
    authenticated?: React.ReactNode
    fallback: React.ReactNode
  }
  className?: string
  reflectAuth?: boolean
}) {
  const { isAuthenticated } = await retrieveUserSession()

  return (
    <DuolingoAuthButtonClient
      redirectUrl={isAuthenticated ? '/studio' : '/login'}
      className={className}
    >
      {isAuthenticated && childrenVariants.authenticated
        ? childrenVariants.authenticated
        : childrenVariants.fallback}
    </DuolingoAuthButtonClient>
  )
}
