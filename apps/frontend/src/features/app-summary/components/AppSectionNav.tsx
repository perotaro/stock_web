import { Link } from 'react-router-dom'

type AppSectionNavProps = { currentSection?: 'Summary' | 'Watchlist' }
type NavItem = {
  label: 'Summary' | 'Watchlist'
  to: '/app' | '/app/watchlist'
}

const naviElements: NavItem[] = [
  { label: 'Summary', to: '/app' },
  { label: 'Watchlist', to: '/app/watchlist' },
]

/**
 * ログイン後画面のNavを描画する
 *
 * @param props 現在セクションを示す props。未指定時は全項目をリンク表示する。
 * @returns Nav
 */
export function AppSectionNav(props: AppSectionNavProps = {}) {
  const { currentSection } = props

  return (
    <nav
      aria-label="App sections"
      className="flex flex-wrap items-center gap-3 rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-subtle-surface)] p-2"
    >
      {naviElements.map((naviElement) => {
        if (naviElement.label === currentSection) {
          return (
            <span
              key={naviElement.label}
              className="inline-flex min-h-10 items-center justify-center rounded-[4px] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-ink)] shadow-[var(--shadow-soft)]"
            >
              {naviElement.label}
            </span>
          )
        }
        return (
          <Link
            key={naviElement.label}
            to={naviElement.to}
            className="inline-flex min-h-10 items-center justify-center rounded-[4px] px-4 py-2 text-sm font-semibold text-[color:var(--color-muted)] transition hover:bg-white/60 hover:text-[color:var(--color-ink)]"
          >
            {naviElement.label}
          </Link>
        )
      })}
    </nav>
  )
}
