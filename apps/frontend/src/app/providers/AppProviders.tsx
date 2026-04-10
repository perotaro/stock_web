import type { PropsWithChildren } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * 再試行対象かどうかを判定する。
 *
 * @param failureCount 失敗回数。
 * @param error 発生したエラー。
 * @returns 再試行する場合は true。
 */
function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) {
    return false
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status >= 500
  }

  return true
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * アプリ全体で共有する Provider をまとめる。
 *
 * @param props 子要素を含む props。
 * @returns 共通 Provider を適用した描画結果。
 */
export function AppProviders(props: PropsWithChildren) {
  const { children } = props

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
