import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * ログイン導線の遷移中画面を描画する。
 *
 * @returns 認証モードに応じたログイン開始ページ。
 */
export function LoginPage() {
  const clientEnv = getClientEnv()

  if (clientEnv.authMode === 'dev-bypass') {
    return <DevBypassLoginPage />
  }

  return <OidcLoginPage />
}

/**
 * ローカル開発用の認証バイパス遷移を開始する。
 *
 * @returns 遷移中表示。
 */
function DevBypassLoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      navigate('/app', { replace: true })
    }, DEV_AUTH_TRANSITION_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [navigate])

  return (
    <LoginTransitionCard
      statusLabel="ローカル認証中"
      description="ローカル開発用の認証バイパスでアプリ画面へ移動しています。"
    />
  )
}

/**
 * 認証エラー情報から画面に通知するエラーメッセージを組み立てる
 *
 * @param error 認証エラー
 * @returns エラーメッセージ。
 */
function buildRedirectErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return `認証サービスへの移動に失敗しました: ${error.message}`
  }

  return '認証サービスへの移動に失敗しました。時間を置いて再試行してください。'
}

/**
 * OIDC Provider へのログインリダイレクト開始前の遷移中表示を描画する。
 *
 * @returns 遷移中表示。
 */
function OidcLoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const hasStartedRedirect = useRef(false)
  const [redirectState, setRedirectState] = useState<string | undefined>(
    undefined,
  )

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/app', { replace: true })
      return
    }
    if (auth.isLoading) return
    if (auth.activeNavigator) return
    if (hasStartedRedirect.current) return
    hasStartedRedirect.current = true
    auth.signinRedirect().catch((error: unknown) => {
      hasStartedRedirect.current = false
      setRedirectState(buildRedirectErrorMessage(error))
    })
  }, [navigate, auth])

  const errorMessage =
    redirectState ??
    (auth.error ? buildRedirectErrorMessage(auth.error) : undefined)

  return (
    <LoginTransitionCard
      statusLabel="認証サービスへ移動中"
      description="認証サービスへ移動しています。"
      errorMessage={errorMessage}
      onRetry={() => {
        hasStartedRedirect.current = true
        setRedirectState(undefined)
        auth.signinRedirect().catch((error: unknown) => {
          hasStartedRedirect.current = false
          setRedirectState(buildRedirectErrorMessage(error))
        })
      }}
    />
  )
}

type LoginTransitionCardProps = {
  statusLabel: string
  description: string
  errorMessage?: string | undefined
  onRetry?: () => void
}

/**
 * ログイン開始時の共通遷移中表示を描画する。
 *
 * @param props ステータス、説明、エラー、再試行処理を含む props。
 * @returns ログイン遷移中カード。
 */
function LoginTransitionCard(props: LoginTransitionCardProps) {
  const { statusLabel, description, errorMessage, onRetry } = props

  return (
    <div className="mx-auto max-w-3xl">
      <SectionCard
        title="認証サービスへ移動しています"
        description={description}
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            しばらく待っても移動しない場合は、再試行してください。
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
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="button-primary"
              >
                再試行
              </button>
            ) : null}
            <Link to="/" className="button-secondary">
              公開トップへ戻る
            </Link>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
