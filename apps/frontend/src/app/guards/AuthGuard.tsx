import type { PropsWithChildren } from 'react'

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'

import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { setCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * 認証必須ルートへの導線を制御する。
 *
 * @param props 子要素を含む props。
 * @returns 開発バイパス有効時は子要素、無効時はログイン画面へのリダイレクト。
 */
export function AuthGuard(props: PropsWithChildren) {
  const { children } = props
  const clientEnv = getClientEnv()

  if (clientEnv.authMode === 'dev-bypass') {
    return <>{children}</>
  }

  return <OidcAuthGuard>{children}</OidcAuthGuard>
}

/**
 * OIDC モードの認証状態に応じて認証必須ルートを制御する。
 *
 * @param props 子要素を含む props。
 * @returns 認証済みなら子要素、未認証ならログイン導線。
 */
function OidcAuthGuard(props: PropsWithChildren) {
  const { children } = props
  const location = useLocation()
  const auth = useAuth()

  if (auth.isAuthenticated) {
    setCurrentAccessToken(auth.user?.access_token)
    return <>{children}</>
  }

  setCurrentAccessToken(undefined)

  if (auth.isLoading || auth.activeNavigator) {
    return (
      <SectionCard
        title="認証状態を確認しています"
        description="認証済みセッションを確認してから画面を表示します。"
        className="mx-auto mt-8 max-w-3xl"
      >
        <LoadingState title="確認中" />
      </SectionCard>
    )
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ from: `${location.pathname}${location.search}` }}
    />
  )
}
