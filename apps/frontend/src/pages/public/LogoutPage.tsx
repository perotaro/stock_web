import { useEffect, useRef } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { resetCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { getClientEnv } from '@/lib/env/clientEnv'
import { buildOidcLogoutUrl } from '@/lib/oidc/logoutUrl'

/**
 * ログアウト開始画面を描画する。
 *
 * @returns ログアウト用の案内ページ。
 */
export function LogoutPage() {
  const clientEnv = getClientEnv()

  if (clientEnv.authMode === 'dev-bypass') {
    return <DevBypassLogoutPage />
  }

  return <OidcLogoutPage />
}

/**
 * 開発用認証バイパスのログアウトを処理する。
 *
 * @returns ローカル状態を破棄するログアウト画面。
 */
function DevBypassLogoutPage() {
  const navigate = useNavigate()

  useEffect(() => {
    resetCurrentAccessToken()
    const timeoutId = window.setTimeout(() => {
      navigate('/auth/logout/callback', { replace: true })
    }, DEV_AUTH_TRANSITION_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [navigate])

  return (
    <LogoutAutoTransitionCard description="ローカル開発用の認証状態を破棄しています。" />
  )
}

/**
 * OIDC Provider へのログアウトリダイレクトを開始する。
 *
 * @returns OIDC ログアウト開始画面。
 */
function OidcLogoutPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const clientEnv = getClientEnv()
  const hasStartedLogout = useRef(false)
  const errorMessage =
    buildLogoutErrorMessage(auth.error) ??
    buildConfigurationErrorMessage({
      isAuthenticated: auth.isAuthenticated,
      isLoading: auth.isLoading,
      oidcLogoutEndpoint: clientEnv.oidcLogoutEndpoint,
    })

  useEffect(() => {
    if (auth.error) return
    if (auth.isLoading) return
    if (hasStartedLogout.current) return

    hasStartedLogout.current = true
    resetCurrentAccessToken()

    if (!auth.isAuthenticated) {
      auth
        .removeUser()
        .catch(() => undefined)
        .finally(() => {
          navigate('/auth/logout/callback', { replace: true })
        })
      return
    }

    if (!clientEnv.oidcLogoutEndpoint) {
      hasStartedLogout.current = false
      return
    }
    const oidcLogoutEndpoint = clientEnv.oidcLogoutEndpoint

    auth
      .removeUser()
      .catch(() => undefined)
      .finally(() => {
        window.location.assign(
          buildOidcLogoutUrl({
            logoutEndpoint: oidcLogoutEndpoint,
            clientId: clientEnv.oidcClientId,
            logoutUri: clientEnv.oidcPostLogoutRedirectUri,
          }),
        )
      })
  }, [auth, clientEnv, navigate])

  return (
    <LogoutAutoTransitionCard
      description="認証サービスでセッションを終了し、公開トップへ戻ります。"
      errorMessage={errorMessage}
    />
  )
}

type LogoutAutoTransitionCardProps = {
  description: string
  errorMessage?: string | undefined
}

/**
 * 自動ログアウト時の遷移中カードを描画する。
 *
 * @param props 説明文を含む props。
 * @returns ログアウト遷移中カード。
 */
function LogoutAutoTransitionCard(props: LogoutAutoTransitionCardProps) {
  const { description, errorMessage } = props

  return (
    <SectionCard
      title="ログアウトしています"
      description={description}
      className="mx-auto mt-8 max-w-3xl"
    >
      <div className="space-y-6">
        <p className="text-sm leading-7 text-[color:var(--color-muted)]">
          処理が完了すると公開トップへ移動します。
        </p>

        <div className="flex flex-wrap gap-3">
          <StatusPill label="ログアウト中" tone="info" />
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[4px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {errorMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="button-primary">
              公開トップへ戻る
            </Link>
            <Link to="/login" className="button-secondary">
              再ログイン
            </Link>
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

/**
 * ログアウト失敗時に表示するメッセージを組み立てる。
 *
 * @param error ログアウト処理で発生したエラー。
 * @returns 利用者向けエラーメッセージ。
 */
function buildLogoutErrorMessage(error: unknown): string | undefined {
  if (error === undefined || error === null) {
    return undefined
  }

  if (typeof error === 'string' && error.length > 0) {
    return `ログアウト処理に失敗しました: ${error}`
  }

  if (error instanceof Error && error.message.length > 0) {
    return `ログアウト処理に失敗しました: ${error.message}`
  }

  return 'ログアウト処理に失敗しました。時間を置いて再試行してください。'
}

type BuildConfigurationErrorMessageInput = {
  isAuthenticated: boolean
  isLoading: boolean
  oidcLogoutEndpoint?: string | undefined
}

/**
 * ログアウト設定不備の表示メッセージを組み立てる。
 *
 * @param input 認証状態とログアウトエンドポイント設定。
 * @returns 設定不備があれば表示メッセージ、なければ undefined。
 */
function buildConfigurationErrorMessage(
  input: BuildConfigurationErrorMessageInput,
): string | undefined {
  if (input.isLoading) return undefined
  if (!input.isAuthenticated) return undefined
  if (input.oidcLogoutEndpoint) return undefined

  return 'ログアウト処理に失敗しました: VITE_OIDC_LOGOUT_ENDPOINT が設定されていません。'
}
