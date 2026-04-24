import type { AppSummary } from '@/features/app-summary/api/fetchAppSummary'
import { formatJstDateTimeWithZone } from '@/lib/utils/formatDate'

type SummaryStatsProps = {
  summary: AppSummary
}

type SummaryMetricItem = {
  label: string
  value: string
  valueVariant?: 'default' | 'compact'
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
 * 全体の最終実行日時を表示用に整形する。
 *
 * @param value API が返した実行日時。
 * @returns 表示用の日時文字列。
 */
function formatLatestRunAt(value: string | null): string {
  if (!value) {
    return '未実行'
  }

  return formatJstDateTimeWithZone(value)
}

/**
 * サマリカード表示用のメトリクス配列を組み立てる。
 *
 * @param summary システム横断サマリ。
 * @returns 表示順を保ったメトリクス配列。
 */
function buildMetricItems(summary: AppSummary): SummaryMetricItem[] {
  return [
    { label: 'システム数', value: formatInteger(summary.system_count) },
    {
      label: '全体の最終実行',
      value: formatLatestRunAt(summary.latest_run_at),
      valueVariant: 'compact',
    },
    { label: '成功', value: formatInteger(summary.status_counts.succeeded) },
    { label: '要確認', value: formatInteger(summary.status_counts.failed) },
    { label: '未実行', value: formatInteger(summary.status_counts.not_run) },
  ]
}

/**
 * 認証後トップ向けの要約カード群を描画する。
 *
 * @param props システム横断サマリを含む props。
 * @returns 要約カードのグリッド。
 */
export function SummaryStats(props: SummaryStatsProps) {
  const { summary } = props
  const metrics = buildMetricItems(summary)

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
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
  )
}
