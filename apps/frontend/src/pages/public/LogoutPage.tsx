import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'

/**
 * ログアウト導線のスタブ画面を描画する。
 *
 * @returns ログアウト用の案内ページ。
 */
export function LogoutPage() {
  return (
    <SectionCard
      title="ログアウト導線"
      description="OIDC ログアウトエンドポイント接続前のため、現段階ではコールバック先の配置だけを先に用意しています。"
      className="mx-auto mt-8 max-w-3xl"
    >
      <div className="flex flex-wrap gap-3">
        <Link to="/auth/logout/callback" className="button-primary">
          コールバック画面を確認
        </Link>
        <Link to="/" className="button-secondary">
          公開トップへ戻る
        </Link>
      </div>
    </SectionCard>
  )
}
