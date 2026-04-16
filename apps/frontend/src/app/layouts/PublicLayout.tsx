import { Link, Outlet, useLocation } from 'react-router-dom'

/**
 * 公開トップとログイン導線で使う共通レイアウトを描画する。
 *
 * @returns 公開領域のレイアウト。
 */
export function PublicLayout() {
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const actionLabel =
    location.pathname === '/login' ? '公開トップへ戻る' : 'ログイン'
  const actionTo = location.pathname === '/login' ? '/' : '/login'

  return (
    <div
      className={`page-shell public-shell ${isHomePage ? 'public-shell--home' : ''}`.trim()}
    >
      <header
        className={`shell-header public-shell-header ${isHomePage ? 'public-shell-header--home' : ''}`.trim()}
      >
        <Link
          to="/"
          className={`public-brand-link ${isHomePage ? 'public-brand-link--home' : ''}`.trim()}
        >
          {isHomePage ? (
            <img
              src="/guppy_logo.png"
              alt="Guppy"
              className="public-brand-image"
            />
          ) : (
            'Guppy'
          )}
        </Link>

        <Link
          to={actionTo}
          className={`${isHomePage ? 'public-header-button' : 'public-header-action public-header-action--default'}`.trim()}
        >
          {actionLabel}
        </Link>
      </header>

      <main
        className={`public-shell-main ${isHomePage ? 'public-shell-main--home' : ''}`.trim()}
      >
        <Outlet />
      </main>
    </div>
  )
}
