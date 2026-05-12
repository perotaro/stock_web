import { useEffect } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'

import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * OIDC コールバック用の画面を描画する。
 *
 * @returns コールバック受信後の遷移画面。
 */
export function AuthCallbackPage() {
  const clientEnv = getClientEnv()

  if (clientEnv.authMode === 'dev-bypass') {
    return <DevBypassAuthCallbackPage />
  }

  return <OidcAuthCallbackPage />
}

/**
 * ローカル認証バイパス時のコールバック復帰を処理する。
 *
 * @returns アプリ画面への遷移中表示。
 */
function DevBypassAuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/app', { replace: true })
    }, DEV_AUTH_TRANSITION_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [navigate])

  return (
    <AuthCallbackTransitionCard description="ローカル認証バイパスでアプリ画面へ移動しています。" />
  )
}

/**
 * OIDC コールバックの完了状態を監視してアプリ画面へ遷移する。
 *
 * @returns 認証完了待ちの画面。
 */
function OidcAuthCallbackPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate])

  return (
    <AuthCallbackTransitionCard
      description="認証結果を確認してアプリ画面へ移動しています。"
      errorMessage={auth.error?.message}
    />
  )
}

type AuthCallbackTransitionCardProps = {
  description: string
  errorMessage?: string | undefined
}

/**
 * 認証コールバックの共通遷移中表示を描画する。
 *
 * @param props 説明文とエラーメッセージを含む props。
 * @returns 認証コールバック用カード。
 */
function AuthCallbackTransitionCard(props: AuthCallbackTransitionCardProps) {
  const { description, errorMessage } = props

  return (
    <SectionCard
      title="認証情報を確認しています"
      description={description}
      className="mx-auto mt-8 max-w-3xl"
    >
      {errorMessage ? (
        <div className="space-y-4">
          <p
            role="alert"
            className="rounded-[4px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            認証情報の確認に失敗しました: {errorMessage}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="button-primary">
              再ログイン
            </Link>
            <Link to="/" className="button-secondary">
              公開トップへ戻る
            </Link>
          </div>
        </div>
      ) : (
        <LoadingState title="確認中" />
      )}
    </SectionCard>
  )
}
