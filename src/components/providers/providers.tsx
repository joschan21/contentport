'use client'

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HTTPException } from 'hono/http-exception'
import { ReactNode, useState } from 'react'
import toast from 'react-hot-toast'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError(error, query) {
            if (error instanceof HTTPException) {
              if (error.status === 401 && window.location.pathname !== '/login') {
                window.location.href = '/login'
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
      <NuqsAdapter>{children}</NuqsAdapter>
    </QueryClientProvider>
  )
}
