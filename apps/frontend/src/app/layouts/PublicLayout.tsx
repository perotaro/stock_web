import { Link, NavLink, Outlet } from 'react-router-dom'

/**
 * 公開トップとログイン導線で使う共通レイアウトを描画する。
 *
 * @returns 公開領域のレイアウト。
 */
export function PublicLayout() {
  return (
    <div className="page-shell">
      <header className="shell-header">
        <Link to="/" className="brand-lockup">
          <span className="brand-mark">G</span>
          <span>
            <span className="block text-xs tracking-[0.28em] text-[color:var(--color-muted)] uppercase">
              Guppy
            </span>
            <span className="block text-lg font-semibold text-[color:var(--color-ink)]">
              Frontend Workspace
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm text-[color:var(--color-muted)]">
          <NavLink to="/" className="nav-link">
            Public
          </NavLink>
          <NavLink to="/login" className="nav-link">
            Login
          </NavLink>
          <NavLink to="/app" className="nav-link">
            App
          </NavLink>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-4 pb-10 md:px-8 lg:px-10">
        <Outlet />
      </main>
    </div>
  )
}
