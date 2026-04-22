import { Outlet } from 'react-router-dom'

import { GlobalHeader } from '@/components/navigation/GlobalHeader'

/**
 * 認証後画面で使う共通レイアウトを描画する。
 *
 * @returns 認証後領域のレイアウト。
 */
export function AppLayout() {
  const headerActions = [
    {
      label: 'Logout',
      to: '/logout',
      variant: 'text',
    },
  ] as const

  return (
    <div className="page-shell">
      <GlobalHeader actions={headerActions} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-5 pb-12 md:px-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
