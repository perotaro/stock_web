import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { getClientEnv } from '@/lib/env/clientEnv'

/**
 * ログイン導線のスタブ画面を描画する。
 *
 * @returns OIDC 接続前の導線説明ページ。
 */
export function LoginPage() {
  const clientEnv = getClientEnv()

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <SectionCard
        title="ログイン開始導線"
        description="OIDC 実接続前でも画面導線を確認できるよう、開発用のバイパス状態を明示しています。"
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            `Authorization Code Flow + PKCE`
            の接続は次段階で組み込みます。現段階ではルーティングと画面骨格を先に整備し、
            認証前後の UI 開発を止めない構成にしています。
          </p>

          <div className="flex flex-wrap gap-3">
            <StatusPill
              label={
                clientEnv.enableDevAuthBypass
                  ? 'development bypass enabled'
                  : 'oidc connection pending'
              }
              tone={clientEnv.enableDevAuthBypass ? 'warning' : 'info'}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/app" className="button-primary">
              /app へ進む
            </Link>
            <Link to="/" className="button-secondary">
              公開トップへ戻る
            </Link>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="OIDC 設定の下書き"
        description="実運用の値に差し替える項目を一覧で確認できます。"
      >
        <dl className="grid gap-4 text-sm">
          <div className="rounded-3xl border border-white/60 bg-white/75 p-4">
            <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
              Authority
            </dt>
            <dd className="mt-2 font-medium break-all text-[color:var(--color-ink)]">
              {clientEnv.oidcAuthority}
            </dd>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/75 p-4">
            <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
              Client ID
            </dt>
            <dd className="mt-2 font-medium text-[color:var(--color-ink)]">
              {clientEnv.oidcClientId}
            </dd>
          </div>
          <div className="rounded-3xl border border-white/60 bg-white/75 p-4">
            <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
              Redirect URI
            </dt>
            <dd className="mt-2 font-medium break-all text-[color:var(--color-ink)]">
              {clientEnv.oidcRedirectUri}
            </dd>
          </div>
        </dl>
      </SectionCard>
    </div>
  )
}
