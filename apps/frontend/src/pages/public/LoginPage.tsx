import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'

/**
 * ログイン導線のスタブ画面を描画する。
 *
 * @returns OIDC 接続前の導線説明ページ。
 */
export function LoginPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <SectionCard
        title="ログイン開始"
        description="外部認証基盤へ遷移する前の説明と再試行導線をまとめたページです。"
      >
        <div className="space-y-6">
          <p className="text-sm leading-7 text-[color:var(--color-muted)]">
            OIDC の実接続は次段階で組み込みます。現段階では、認証開始前の説明、
            失敗時の再試行導線、公開トップへの戻り導線を先に整備しています。
          </p>

          <div className="flex flex-wrap gap-3">
            <StatusPill label="認証準備中" tone="info" />
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
    </div>
  )
}
