import { Link, NavLink } from 'react-router-dom'

type GlobalHeaderActionVariant = 'nav' | 'primary' | 'text'

type GlobalHeaderAction = {
  label: string
  to: string
  variant: GlobalHeaderActionVariant
  end?: boolean
}

type GlobalHeaderProps = {
  actions: readonly GlobalHeaderAction[]
}

/**
 * ヘッダーアクションの見た目に応じたクラス名を返す。
 *
 * @param variant アクションの見た目種別。
 * @param isActive 現在地と一致しているかどうか。
 * @returns ヘッダーアクションに適用するクラス文字列。
 */
function getHeaderActionClass(
  variant: GlobalHeaderActionVariant,
  isActive: boolean,
): string {
  if (variant === 'primary') {
    return 'global-header-primary'
  }

  if (variant === 'text') {
    return 'global-header-text-link'
  }

  return isActive
    ? 'global-header-nav-link global-header-nav-link--active'
    : 'global-header-nav-link'
}

/**
 * 全ページ共通で使うグローバルヘッダーを描画する。
 *
 * @param props 右側アクション群を含む props。
 * @returns ブランドロゴと導線を持つ共通ヘッダー。
 */
export function GlobalHeader(props: GlobalHeaderProps) {
  const { actions } = props

  return (
    <header className="global-header">
      <div className="global-header-inner">
        <Link to="/" className="global-header-brand">
          <img
            src="/guppy_logo.png"
            alt="Guppy"
            className="global-header-brand-image"
          />
        </Link>

        <nav className="global-header-actions" aria-label="Global">
          {actions.map((action) =>
            action.variant === 'nav' ? (
              <NavLink
                key={`${action.variant}-${action.to}`}
                to={action.to}
                {...(action.end ? { end: true } : {})}
                className={({ isActive }) =>
                  getHeaderActionClass(action.variant, isActive)
                }
              >
                {action.label}
              </NavLink>
            ) : (
              <Link
                key={`${action.variant}-${action.to}`}
                to={action.to}
                className={getHeaderActionClass(action.variant, false)}
              >
                {action.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  )
}
