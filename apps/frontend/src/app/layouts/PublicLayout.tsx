import { Outlet, useLocation } from 'react-router-dom'

import { GlobalHeader } from '@/components/navigation/GlobalHeader'

/**
 * 公開トップとログイン導線で使う共通レイアウトを描画する。
 *
 * @returns 公開領域のレイアウト。
 */
export function PublicLayout() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const headerActions = [
    {
      label: isHomePage ? 'ログイン' : '公開トップへ戻る',
      to: isHomePage ? '/login' : '/',
      variant: isHomePage ? 'primary' : 'text',
    },
  ] as const

  return (
    <div
      className={`page-shell public-shell ${isHomePage ? 'public-shell--home' : ''}`.trim()}
    >
      <GlobalHeader actions={headerActions} />

      <main
        className={`public-shell-main ${isHomePage ? 'public-shell-main--home' : ''}`.trim()}
      >
        <Outlet />
      </main>
    </div>
  )
}
