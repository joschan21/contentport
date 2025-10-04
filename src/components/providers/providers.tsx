'use client'

import { AccountProvider } from '@/hooks/account-ctx'
import { ConfettiProvider } from '@/hooks/use-confetti'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HTTPException } from 'hono/http-exception'
import { ReactNode, useState } from 'react'
import toast from 'react-hot-toast'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError(error) {
            if (error instanceof HTTPException) {
              if (error.status === 401 && window.location.pathname !== '/sign-in') {
                window.location.href = '/sign-in'
              } else {
                toast.error(error.message)
              }
            }
          },
        }),
        defaultOptions: {
          queries: {
            retry(_, error) {
              if (error instanceof HTTPException) {
                if (error.status === 401) {
                  return false
                }
              }

              return true
            },
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AccountProvider>
        <ConfettiProvider>{children}</ConfettiProvider>
      </AccountProvider>
    </QueryClientProvider>
  )
}
