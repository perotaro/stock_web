import type { PropsWithChildren } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'

import { getSharedAppQueryClient } from '@/app/providers/queryClient'

/**
 * アプリ全体で共有する Provider をまとめる。
 *
 * @param props 子要素を含む props。
 * @returns 共通 Provider を適用した描画結果。
 */
export function AppProviders(props: PropsWithChildren) {
  const { children } = props
  const queryClient = getSharedAppQueryClient()

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
