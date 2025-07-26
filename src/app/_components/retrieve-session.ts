'use server'

import { cache } from 'react'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export const retrieveUserSession = cache(
  async (): Promise<{ isAuthenticated: boolean }> => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      })

      const isAuthenticated = session ? true : false

      return { isAuthenticated }
    } catch (error) {
      console.error('Failed to retrieve user session:', error)
      return { isAuthenticated: false }
    }
  },
)
