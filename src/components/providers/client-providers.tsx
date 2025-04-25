"use client"

import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TweetProvider } from "@/hooks/tweet-ctx"

interface ProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ProvidersProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  })

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <TweetProvider>{children}</TweetProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  )
}
