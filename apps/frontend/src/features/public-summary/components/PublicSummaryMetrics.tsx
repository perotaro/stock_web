import type { PublicSummary } from '@/features/public-summary/api/fetchPublicSummary'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

type PublicSummaryMetricsProps = {
  summary: PublicSummary | undefined
  isPending: boolean
  errorMessage: string | undefined
  onRetry: () => void
}

type MetricItem = {
  label: string
  value: string
  detail: string
}

/**
 * 数値を 3 桁区切りで整形する。
 *
 * @param value 整形対象の数値。
 * @returns 表示用文字列。
 */
function formatInteger(value: number): string {
  return new Intl.NumberFormat('ja-JP').format(value)
}

/**
 * 成功率を `%` 表記へ整形する。
 *
 * @param value 成功率の数値。
 * @returns 表示用文字列。
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * 秒数を小数 1 桁の秒表記へ整形する。
 *
 * @param value 秒数。
 * @returns 表示用文字列。
 */
function formatDurationSeconds(value: number): string {
  return `${value.toFixed(1)} 秒`
}

/**
 * 公開サマリからメトリクス表示用データを組み立てる。
 *
 * @param summary 公開トップ向け匿名集計。
 * @returns 4 件の表示用メトリクス。
 */
function buildMetricItems(summary: PublicSummary): MetricItem[] {
  return [
    {
      label: '当月稼働日数',
      value: `${formatInteger(summary.operating_days)}日`,
      detail: 'JST 基準の当月稼働日数',
    },
    {
      label: '総実行回数（累計）',
      value: formatInteger(summary.batch_runs_total),
      detail: '保存済み実行回数の累計',
    },
    {
      label: '当月成功率',
      value: formatPercent(summary.success_rate),
      detail: 'run_id 単位の当月成功率',
    },
    {
      label: '当月平均処理時間',
      value: formatDurationSeconds(summary.avg_duration_sec),
      detail: '当月平均の処理時間',
    },
  ]
}

/**
 * 読み込み中の匿名集計カード群を描画する。
 *
 * @returns スケルトンカード 4 枚。
 */
function LoadingMetrics() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <article key={`metric-skeleton-${index}`} className="metric-card">
          <div className="metric-card-skeleton h-3 w-24" />
          <div className="metric-card-skeleton mt-4 h-10 w-32" />
          <div className="mt-3 h-3 w-36 rounded-[2px] bg-slate-100" />
        </article>
      ))}
    </div>
  )
}

/**
 * 公開トップ向け匿名集計カード群を描画する。
 *
 * @param props 公開サマリと表示状態。
 * @returns 匿名集計セクションの中身。
 */
export function PublicSummaryMetrics(props: PublicSummaryMetricsProps) {
  const { summary, isPending, errorMessage, onRetry } = props

  if (isPending) {
    return (
      <LoadingState title="読み込み中…">
        <LoadingMetrics />
      </LoadingState>
    )
  }

  if (!summary || errorMessage) {
    return (
      <ErrorState
        message={errorMessage ?? '公開サマリを読み込めませんでした。'}
        actionLabel="再試行"
        onAction={onRetry}
      />
    )
  }

  const metrics = buildMetricItems(summary)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {metrics.map((metric) => (
        <article key={metric.label} className="metric-card">
          <p className="text-xs font-medium tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
            {metric.label}
          </p>
          <p className="mt-4 text-[2rem] leading-none font-semibold tracking-tight text-[color:var(--color-ink)]">
            {metric.value}
          </p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
            {metric.detail}
          </p>
        </article>
      ))}
    </div>
  )
}
