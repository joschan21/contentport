'use client'

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HTTPException } from 'hono/http-exception'
import { ReactNode, useState } from 'react'

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
              if (window.location.pathname !== '/login') {
                window.location.href = '/login'
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
