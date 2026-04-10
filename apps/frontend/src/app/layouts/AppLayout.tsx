import { NavLink, Outlet } from 'react-router-dom'

/**
 * 認証後画面で使う共通レイアウトを描画する。
 *
 * @returns 認証後領域のレイアウト。
 */
export function AppLayout() {
  return (
    <div className="page-shell">
      <header className="shell-header">
        <div>
          <p className="text-xs tracking-[0.28em] text-[color:var(--color-muted)] uppercase">
            Authenticated Area
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">
            Guppy control surface
          </h1>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm text-[color:var(--color-muted)]">
          <NavLink to="/app" end className="nav-link">
            Summary
          </NavLink>
          <NavLink to="/app/systems/alpha-growth" className="nav-link">
            System
          </NavLink>
          <NavLink to="/app/watchlist" className="nav-link">
            Watchlist
          </NavLink>
          <NavLink to="/logout" className="nav-link">
            Logout
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-4 pb-10 md:px-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
