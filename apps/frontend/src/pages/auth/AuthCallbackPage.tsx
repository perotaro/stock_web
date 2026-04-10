import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'

/**
 * OIDC コールバック用のプレースホルダー画面を描画する。
 *
 * @returns コールバック受信後の説明画面。
 */
export function AuthCallbackPage() {
  return (
    <SectionCard
      title="認証コールバックの受け口"
      description="ここに Authorization Code の受信、トークン確立、`/app` への遷移処理を組み込みます。"
      className="mx-auto mt-8 max-w-3xl"
    >
      <div className="flex flex-wrap gap-3">
        <Link to="/app" className="button-primary">
          アプリ概要へ進む
        </Link>
        <Link to="/login" className="button-secondary">
          ログイン画面へ戻る
        </Link>
      </div>
    </SectionCard>
  )
}
