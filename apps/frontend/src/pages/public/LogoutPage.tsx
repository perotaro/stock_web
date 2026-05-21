import { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { resetCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { getClientEnv } from '@/lib/env/clientEnv'

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
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  )

  const isRedirecting =
    auth.isLoading || auth.activeNavigator === 'signoutRedirect'

  return (
    <LogoutTransitionCard
      statusLabel={isRedirecting ? 'ログアウト処理中' : 'ログアウト待機中'}
      description="認証サービスでセッションを終了し、公開トップへ戻ります。"
      errorMessage={
        errorMessage ??
        (auth.error ? buildLogoutErrorMessage(auth.error) : undefined)
      }
      isSubmitting={isRedirecting}
      onLogout={() => {
        setErrorMessage(undefined)
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

        auth.signoutRedirect().catch((error: unknown) => {
          setErrorMessage(buildLogoutErrorMessage(error))
        })
      }}
    />
  )
}

type LogoutTransitionCardProps = {
  statusLabel: string
  description: string
  errorMessage?: string | undefined
  isSubmitting?: boolean
  onLogout: () => void
}

type LogoutAutoTransitionCardProps = {
  description: string
}

/**
 * 自動ログアウト時の遷移中カードを描画する。
 *
 * @param props 説明文を含む props。
 * @returns ログアウト遷移中カード。
 */
function LogoutAutoTransitionCard(props: LogoutAutoTransitionCardProps) {
  const { description } = props

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
          <StatusPill label="ローカルログアウト中" tone="info" />
        </div>
      </div>
    </SectionCard>
  )
}

/**
 * ログアウト開始時の共通カードを描画する。
 *
 * @param props ステータス、説明、エラー、ログアウト処理を含む props。
 * @returns ログアウト開始カード。
 */
function LogoutTransitionCard(props: LogoutTransitionCardProps) {
  const {
    statusLabel,
    description,
    errorMessage,
    isSubmitting = false,
    onLogout,
  } = props

  return (
    <SectionCard
      title="ログアウトします"
      description={description}
      className="mx-auto mt-8 max-w-3xl"
    >
      <div className="space-y-6">
        <p className="text-sm leading-7 text-[color:var(--color-muted)]">
          続行すると認証状態を破棄します。処理後は公開トップへ移動します。
        </p>

        <div className="flex flex-wrap gap-3">
          <StatusPill label={statusLabel} tone="info" />
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-[4px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onLogout}
            disabled={isSubmitting}
            className="button-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            ログアウトを続行
          </button>
          <Link to="/" className="button-secondary">
            公開トップへ戻る
          </Link>
        </div>
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
function buildLogoutErrorMessage(error: unknown): string {
  if (typeof error === 'string' && error.length > 0) {
    return `ログアウト処理に失敗しました: ${error}`
  }

  if (error instanceof Error && error.message.length > 0) {
    return `ログアウト処理に失敗しました: ${error.message}`
  }

  return 'ログアウト処理に失敗しました。時間を置いて再試行してください。'
}
