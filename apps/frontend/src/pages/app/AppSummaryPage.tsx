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

/**
 * 認証後トップのサマリ画面を描画する。
 *
 * @returns システム横断サマリのプレースホルダー。
 */
export function AppSummaryPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <SectionCard
        title="システム横断サマリ"
        description="`GET /api/v1/summary` の受け皿として、システム一覧と詳細導線の配置を先に決めています。"
      >
        <div className="space-y-4">
          {systems.map((system) => (
            <article
              key={system.systemCode}
              className="rounded-3xl border border-white/60 bg-white/75 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
                    {system.systemCode}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">
                    {system.systemName}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
                    latest_run_at: {formatJstDateTime(system.latestRunAt)}
                  </p>
                </div>
                <StatusPill
                  label={system.status}
                  tone={system.status === 'running' ? 'warning' : 'success'}
                />
              </div>
              <div className="mt-5">
                <Link
                  to={`/app/systems/${system.systemCode}`}
                  className="text-sm font-semibold text-[color:var(--color-accent-ink)]"
                >
                  詳細を見る
                </Link>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="実装ガイド"
        description="データ取得の本体は次段階で `features/systems` へ寄せ、ページ側は薄い入口に保ちます。"
      >
        <ul className="grid gap-3 text-sm leading-7 text-[color:var(--color-muted)]">
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            Query key は `system_code` 単位で分離
          </li>
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            `401/403` は再ログイン導線へ戻す
          </li>
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            レイアウトは `AppLayout` 配下で統一
          </li>
        </ul>
      </SectionCard>
    </div>
  )
}
