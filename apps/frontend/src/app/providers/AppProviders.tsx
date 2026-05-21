import type { PropsWithChildren } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from 'react-oidc-context'

import { getSharedAppQueryClient } from '@/app/providers/queryClient'
import { buildOidcAuthProviderConfig } from '@/features/auth/authProviderConfig'
import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * アプリ全体で共有する Provider をまとめる。
 *
 * @param props 子要素を含む props。
 * @returns 共通 Provider を適用した描画結果。
 */
export function AppProviders(props: PropsWithChildren) {
  const { children } = props
  const queryClient = getSharedAppQueryClient()
  const clientEnv = getClientEnv()
  const authProviderConfig = buildOidcAuthProviderConfig(clientEnv)

  return (
    <AuthProvider {...authProviderConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthProvider>
  )
}
