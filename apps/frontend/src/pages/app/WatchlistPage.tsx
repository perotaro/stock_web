import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatJstDateTime } from '@/lib/utils/formatDate'

const watchlistRows = [
  {
    ticker: '7203',
    systemCode: 'alpha-growth',
    categoryCode: 'core',
    isActive: true,
    updatedAt: '2026-04-08T05:10:00+09:00',
  },
  {
    ticker: '9432',
    systemCode: 'dividend-core',
    categoryCode: 'income',
    isActive: true,
    updatedAt: '2026-04-08T04:15:00+09:00',
  },
] as const

/**
 * Watchlist の一覧画面を描画する。
 *
 * @returns 検索・絞り込み UI のプレースホルダー。
 */
export function WatchlistPage() {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Watchlist"
        description="モバイルではカード、タブレット以上では表を使う方針に沿って、横スクロールに依存しない骨格を先に用意しています。"
      >
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="field-shell">
            <span className="field-label">Ticker</span>
            <input className="field-input" placeholder="7203" defaultValue="" />
          </label>
          <label className="field-shell">
            <span className="field-label">System Code</span>
            <input
              className="field-input"
              placeholder="alpha-growth"
              defaultValue=""
            />
          </label>
          <label className="field-shell">
            <span className="field-label">Category Code</span>
            <input className="field-input" placeholder="core" defaultValue="" />
          </label>
          <label className="field-shell">
            <span className="field-label">is_active</span>
            <select className="field-input" defaultValue="true">
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
        </form>

        <div className="mt-6 grid gap-4 lg:hidden">
          {watchlistRows.map((row) => (
            <article
              key={`${row.systemCode}-${row.ticker}`}
              className="rounded-3xl border border-white/60 bg-white/75 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">
                    {row.ticker}
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                    {row.systemCode} / {row.categoryCode}
                  </p>
                </div>
                <StatusPill
                  label={row.isActive ? 'active' : 'inactive'}
                  tone="success"
                />
              </div>
              <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                updated_at: {formatJstDateTime(row.updatedAt)}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-6 hidden overflow-hidden rounded-3xl border border-white/60 bg-white/75 lg:block">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-[color:var(--color-subtle-surface)] text-[color:var(--color-muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">Ticker</th>
                <th className="px-5 py-4 font-medium">System</th>
                <th className="px-5 py-4 font-medium">Category</th>
                <th className="px-5 py-4 font-medium">Active</th>
                <th className="px-5 py-4 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {watchlistRows.map((row) => (
                <tr
                  key={`${row.systemCode}-${row.ticker}`}
                  className="border-t border-white/60"
                >
                  <td className="px-5 py-4 font-medium text-[color:var(--color-ink)]">
                    {row.ticker}
                  </td>
                  <td className="px-5 py-4">{row.systemCode}</td>
                  <td className="px-5 py-4">{row.categoryCode}</td>
                  <td className="px-5 py-4">
                    {row.isActive ? 'true' : 'false'}
                  </td>
                  <td className="px-5 py-4">
                    {formatJstDateTime(row.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
