import { useParams } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'

const sampleSignals = [
  {
    ticker: '7203',
    companyName: 'Toyota Motor',
    decision: 'BUY',
    priority: 1,
  },
  {
    ticker: '9432',
    companyName: 'NTT',
    decision: 'WATCH',
    priority: 2,
  },
  {
    ticker: '8306',
    companyName: 'Mitsubishi UFJ',
    decision: 'HOLD',
    priority: 3,
  },
] as const

/**
 * システム別の最新結果画面を描画する。
 *
 * @returns 最新シグナル表示のプレースホルダー。
 */
export function SystemLatestPage() {
  const params = useParams()

  return (
    <div className="space-y-6">
      <SectionCard
        title="システム別最新結果"
        description="`signals[]` の優先度順表示を想定したカードレイアウトを先に配置しています。"
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill
            label={params.systemCode ?? 'unknown-system'}
            tone="info"
          />
          <StatusPill label="latest only" tone="success" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {sampleSignals.map((signal) => (
            <article
              key={signal.ticker}
              className="rounded-3xl border border-white/60 bg-white/75 p-5"
            >
              <p className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
                priority {signal.priority}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[color:var(--color-ink)]">
                {signal.companyName}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                {signal.ticker}
              </p>
              <div className="mt-5">
                <StatusPill
                  label={signal.decision}
                  tone={signal.decision === 'BUY' ? 'success' : 'warning'}
                />
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
