import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { formatJstDateTime } from '@/lib/utils/formatDate'

const systems = [
  {
    systemCode: 'alpha-growth',
    systemName: 'Alpha Growth',
    latestRunAt: '2026-04-08T06:10:00+09:00',
    status: 'running',
  },
  {
    systemCode: 'dividend-core',
    systemName: 'Dividend Core',
    latestRunAt: '2026-04-08T05:45:00+09:00',
    status: 'ready',
  },
] as const

type SummaryMetric = {
  label: string
  value: string
  valueVariant?: 'default' | 'compact'
}

const summaryMetrics: SummaryMetric[] = [
  { label: 'システム数', value: '12' },
  {
    label: '全体の最終実行',
    value: '2026-04-20 09:00 JST',
    valueVariant: 'compact',
  },
  { label: '成功', value: '10' },
  { label: '要確認', value: '1' },
  { label: '未実行', value: '1' },
]

/**
 * 認証後トップのサマリ画面を描画する。
 *
 * @returns システム横断サマリのプレースホルダー。
 */
export function AppSummaryPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-[color:var(--color-ink)] md:text-[40px]">
            Summary
          </h1>
          <p className="max-w-2xl text-base leading-6 text-[color:var(--color-muted)]">
            システム横断の最新状況を確認
          </p>
        </header>
        <nav
          aria-label="App sections"
          className="flex flex-wrap items-center gap-3 rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-subtle-surface)] p-2"
        >
          <span className="inline-flex min-h-10 items-center justify-center rounded-[4px] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-ink)] shadow-[var(--shadow-soft)]">
            Summary
          </span>
          <Link
            to="/app/watchlist"
            className="inline-flex min-h-10 items-center justify-center rounded-[4px] px-4 py-2 text-sm font-semibold text-[color:var(--color-muted)] transition hover:bg-white/60 hover:text-[color:var(--color-ink)]"
          >
            Watchlist
          </Link>
        </nav>
      </div>

      <SectionCard
        title="システム横断サマリ"
        description="全体の件数と最終実行をまとめて確認します。"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {summaryMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
            >
              <p className="text-sm leading-5 font-medium text-[color:var(--color-muted)]">
                {metric.label}
              </p>
              <p
                className={
                  metric.valueVariant === 'compact'
                    ? 'mt-3 text-lg leading-[1.2] font-semibold text-[color:var(--color-ink)] md:text-xl'
                    : 'mt-3 text-[28px] leading-[1.1] font-semibold tracking-tight text-[color:var(--color-ink)] md:text-[32px]'
                }
              >
                {metric.value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="システム一覧"
        description="各システムの最新実行と状態を一覧で確認します。"
      >
        <div className="space-y-4">
          {systems.map((system) => (
            <article
              key={system.systemCode}
              className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] px-4 py-4 shadow-[var(--shadow-soft)] md:px-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
                    {system.systemCode}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">
                    {system.systemName}
                  </h2>
                  <p className="mt-3 text-sm leading-5 text-[color:var(--color-muted)]">
                    最新実行 {formatJstDateTime(system.latestRunAt)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 md:min-w-[9rem] md:flex-col md:items-end">
                  <StatusPill
                    label={system.status}
                    tone={system.status === 'running' ? 'warning' : 'success'}
                  />
                  <Link
                    to={`/app/systems/${system.systemCode}`}
                    className="text-sm font-semibold text-[color:var(--color-ink)] transition hover:text-[color:var(--color-accent)]"
                  >
                    詳細を見る
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
