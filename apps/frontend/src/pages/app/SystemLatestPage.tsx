import { useParams } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { AppSectionNav } from '@/features/app-summary/components/AppSectionNav'
import { formatJstDateTimeWithZone } from '@/lib/utils/formatDate'

type SystemLatestSignal = {
  priority_rank: number
  ticker: string
  name: string
  decision: string
  reason: string | null
}

type SystemLatestPreview = {
  system_code: string
  system_name: string
  latest_run_id: string | null
  latest_run_at: string | null
  updated_at: string
  signals: SystemLatestSignal[]
}

type SystemLatestHeaderProps = {
  systemCode: string
  systemName: string
  latestRunAt: string | null
}

type RunMetadataListProps = {
  latestRunId: string | null
  latestRunAt: string | null
  updatedAt: string
}

type SignalsGridProps = {
  signals: SystemLatestSignal[]
}

type SignalCardProps = {
  signal: SystemLatestSignal
}

const previewSystemLatest: SystemLatestPreview = {
  system_code: 'DMP',
  system_name: 'Dynamic Momentum Pullback',
  latest_run_id: 'DMP-20260410-063000',
  latest_run_at: '2026-04-10T06:30:00+09:00',
  updated_at: '2026-04-10T06:31:00+09:00',
  signals: [
    {
      priority_rank: 1,
      ticker: 'AAPL',
      name: 'Apple Inc.',
      decision: 'BUY',
      reason: 'EMA20 support and ATR contraction',
    },
    {
      priority_rank: 2,
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      decision: 'NO_SIGNAL',
      reason: 'Breakout pending',
    },
    {
      priority_rank: 3,
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      decision: 'BUY',
      reason: 'Relative strength improved after consolidation',
    },
  ],
}

/**
 * 任意の日時を JST 表記へ変換する。
 *
 * @param value API が返す ISO 形式の日時。未実行時は null。
 * @returns 表示用の日時文字列。
 */
function formatOptionalDateTime(value: string | null): string {
  if (value === null) {
    return '未実行'
  }

  return formatJstDateTimeWithZone(value)
}

/**
 * 判定結果に応じた pill の tone を返す。
 *
 * @param decision API が返す判定結果。
 * @returns StatusPill に渡す tone。
 */
function getDecisionTone(decision: string): 'info' | 'success' | 'warning' {
  if (decision === 'BUY') {
    return 'success'
  }

  if (decision === 'NO_SIGNAL') {
    return 'info'
  }

  return 'warning'
}

/**
 * システム別最新結果のページヘッダを描画する。
 *
 * @param props システム名、システムコード、最新実行日時。
 * @returns システム文脈を示すページヘッダ。
 */
function SystemLatestHeader(props: SystemLatestHeaderProps) {
  const { systemCode, systemName, latestRunAt } = props

  return (
    <header className="space-y-2">
      <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-[color:var(--color-ink)] md:text-[40px]">
        {systemName}
      </h1>
      <p className="max-w-2xl text-base leading-6 text-[color:var(--color-muted)]">
        {systemCode} / 最新実行 {formatOptionalDateTime(latestRunAt)}
      </p>
    </header>
  )
}

/**
 * 最新実行のメタ情報を描画する。
 *
 * @param props 最新実行 ID、最新実行日時、更新日時。
 * @returns 実行メタの定義リスト。
 */
function RunMetadataList(props: RunMetadataListProps) {
  const { latestRunId, latestRunAt, updatedAt } = props
  const metaItems = [
    { label: '最新実行 ID', value: latestRunId ?? '未実行' },
    { label: '最新実行日時', value: formatOptionalDateTime(latestRunAt) },
    { label: '更新日時', value: formatJstDateTimeWithZone(updatedAt) },
  ]

  return (
    <dl className="grid gap-4 md:grid-cols-3">
      {metaItems.map((item) => (
        <div
          key={item.label}
          className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-subtle-surface)] p-4"
        >
          <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
            {item.label}
          </dt>
          <dd className="mt-3 text-base font-semibold break-words text-[color:var(--color-ink)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * シグナル一覧をグリッドで描画する。
 *
 * @param props API 返却順のシグナル一覧。
 * @returns シグナルカード群。
 */
function SignalsGrid(props: SignalsGridProps) {
  const { signals } = props

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {signals.map((signal) => (
        <SignalCard
          key={`${signal.priority_rank}-${signal.ticker}`}
          signal={signal}
        />
      ))}
    </div>
  )
}

/**
 * 1 件のシグナルカードを描画する。
 *
 * @param props シグナル情報。
 * @returns 判定、優先度、銘柄情報を含むカード。
 */
function SignalCard(props: SignalCardProps) {
  const { signal } = props
  const isBuySignal = signal.decision === 'BUY'

  return (
    <article
      aria-label={`${signal.priority_rank}. ${signal.name}`}
      className={`rounded-[4px] border p-5 shadow-[var(--shadow-soft)] ${
        isBuySignal
          ? 'border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]'
          : 'border-[color:var(--color-line)] bg-[color:var(--color-surface)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <StatusPill
          label={signal.decision}
          tone={getDecisionTone(signal.decision)}
        />
        <p className="text-xs font-medium tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
          優先度 {signal.priority_rank}
        </p>
      </div>

      <h3 className="mt-5 text-xl font-semibold tracking-tight text-[color:var(--color-ink)]">
        {signal.name}
      </h3>
      <p className="mt-2 text-sm font-medium tracking-[0.14em] text-[color:var(--color-muted)] uppercase">
        {signal.ticker}
      </p>
      {signal.reason ? (
        <p className="mt-5 text-sm leading-6 text-[color:var(--color-muted)]">
          {signal.reason}
        </p>
      ) : null}
    </article>
  )
}

/**
 * システム別の最新結果画面を描画する。
 *
 * @returns 最新シグナル表示のページ。
 */
export function SystemLatestPage() {
  const params = useParams()
  const systemCode = params.system_code ?? previewSystemLatest.system_code

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <SystemLatestHeader
          systemCode={systemCode}
          systemName={previewSystemLatest.system_name}
          latestRunAt={previewSystemLatest.latest_run_at}
        />
        <AppSectionNav />
      </div>

      <SectionCard
        title="実行メタ"
        description="最新 1 回分の実行 ID、実行日時、更新日時を確認します。"
      >
        <RunMetadataList
          latestRunId={previewSystemLatest.latest_run_id}
          latestRunAt={previewSystemLatest.latest_run_at}
          updatedAt={previewSystemLatest.updated_at}
        />
      </SectionCard>

      <SectionCard
        title="シグナル一覧"
        description="API 返却順を保ち、BUY 判定を最短で視認できるカードとして表示します。"
      >
        <SignalsGrid signals={previewSystemLatest.signals} />
      </SectionCard>
    </div>
  )
}
