'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

import { QueryClient, QueryClientProvider, useIsMutating } from '@tanstack/react-query'

import { shouldRetryRequest } from '@/api/http'
import { PendingOverlay } from '@/components/page/page-parts'

function PendingApiNotice() {
  const pending = useIsMutating({
    predicate: (mutation) => !mutation.state.isPaused && mutation.meta?.readOnly !== true,
  })

  if (pending === 0) return null

  return <PendingOverlay label="Đang xử lý yêu cầu…" />
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => failureCount < 1 && shouldRetryRequest(error),
          },
        },
      })
  )
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PendingApiNotice />
    </QueryClientProvider>
  )
}
