import { useEffect, useRef } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'

import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { resetCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * ログアウト後コールバック画面を描画する。
 *
 * @returns 認証モードに応じたログアウト完了処理画面。
 */
export function LogoutCallbackPage() {
  const clientEnv = getClientEnv()

  if (clientEnv.authMode === 'dev-bypass') {
    return <DevBypassLogoutCallbackPage />
  }

  return <OidcLogoutCallbackPage />
}

/**
 * 開発用認証バイパスのログアウト完了処理を行う。
 *
 * @returns 公開トップへの遷移中画面。
 */
function DevBypassLogoutCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    resetCurrentAccessToken()
    const timeoutId = window.setTimeout(() => {
      navigate('/', { replace: true })
    }, DEV_AUTH_TRANSITION_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [navigate])

  return (
    <LogoutCallbackTransitionCard description="認証状態を破棄し、公開トップへ戻っています。" />
  )
}

/**
 * OIDC ログアウト完了後にフロントエンド側の認証状態を破棄する。
 *
 * @returns 公開トップへの遷移中画面。
 */
function OidcLogoutCallbackPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const hasStartedCleanup = useRef(false)

  useEffect(() => {
    if (
      auth.error ||
      auth.isLoading ||
      auth.activeNavigator ||
      hasStartedCleanup.current
    ) {
      return
    }

    hasStartedCleanup.current = true
    resetCurrentAccessToken()

    const cleanup = auth.isAuthenticated
      ? auth.removeUser().catch(() => undefined)
      : Promise.resolve()

    cleanup.finally(() => {
      navigate('/', { replace: true })
    })
  }, [auth, navigate])

  return (
    <LogoutCallbackTransitionCard
      description="ログアウト結果を確認し、公開トップへ戻っています。"
      errorMessage={auth.error?.message}
    />
  )
}

type LogoutCallbackTransitionCardProps = {
  description: string
  errorMessage?: string | undefined
}

/**
 * ログアウト完了時の共通遷移中表示を描画する。
 *
 * @param props 説明文とエラーメッセージを含む props。
 * @returns ログアウト完了カード。
 */
function LogoutCallbackTransitionCard(
  props: LogoutCallbackTransitionCardProps,
) {
  const { description, errorMessage } = props

  return (
    <SectionCard
      title="ログアウトを完了しています"
      description={description}
      className="mx-auto mt-8 max-w-3xl"
    >
      {errorMessage ? (
        <div className="space-y-4">
          <p
            role="alert"
            className="rounded-[4px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            ログアウト結果の確認に失敗しました: {errorMessage}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="button-primary">
              公開トップへ戻る
            </Link>
            <Link to="/login" className="button-secondary">
              再ログイン
            </Link>
          </div>
        </div>
      ) : (
        <LoadingState title="ログアウト中" />
      )}
    </SectionCard>
  )
}
