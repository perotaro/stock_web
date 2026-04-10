import type { PropsWithChildren } from 'react'

import { Navigate, useLocation } from 'react-router-dom'

import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * 認証必須ルートへの導線を制御する。
 *
 * @param props 子要素を含む props。
 * @returns 開発バイパス有効時は子要素、無効時はログイン画面へのリダイレクト。
 */
export function AuthGuard(props: PropsWithChildren) {
  const { children } = props
  const location = useLocation()
  const clientEnv = getClientEnv()

  if (clientEnv.enableDevAuthBypass) {
    return <>{children}</>
  }

  return <Navigate to="/login" replace state={{ from: location.pathname }} />
}
