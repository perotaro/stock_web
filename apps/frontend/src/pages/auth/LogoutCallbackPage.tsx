import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'

/**
 * ログアウト後コールバックのプレースホルダー画面を描画する。
 *
 * @returns ログアウト完了後の説明画面。
 */
export function LogoutCallbackPage() {
  return (
    <SectionCard
      title="ログアウト後の復帰先"
      description="認証状態破棄後に公開トップへ戻す導線をここで扱います。"
      className="mx-auto mt-8 max-w-3xl"
    >
      <div className="flex flex-wrap gap-3">
        <Link to="/" className="button-primary">
          公開トップへ戻る
        </Link>
        <Link to="/login" className="button-secondary">
          ログイン導線を確認
        </Link>
      </div>
    </SectionCard>
  )
}
