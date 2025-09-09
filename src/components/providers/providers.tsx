'use client'

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HTTPException } from 'hono/http-exception'
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ReactNode, useState } from 'react'
import toast from 'react-hot-toast'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryProvider>
  )
}

function ThemeProvider({
  children,
}: { children: ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}

function QueryProvider({ children }: { children: ReactNode }) {
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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}