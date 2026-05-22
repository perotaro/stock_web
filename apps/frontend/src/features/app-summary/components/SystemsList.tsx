import { EmptyState } from '@/components/ui/EmptyState'
import { StatusPill } from '@/components/ui/StatusPill'
import type { AppSummarySystem } from '@/features/app-summary/api/fetchAppSummary'
import { formatJstDateTime } from '@/lib/utils/formatDate'
import { Link } from 'react-router-dom'

type SystemsListProps = {
  systems: AppSummarySystem[]
}

type StatusMeta = {
  label: '成功' | '要確認' | '未実行'
  tone: 'info' | 'success' | 'warning'
}

/**
 * API のステータス値を表示用メタ情報へ変換する。
 *
 * @param status API が返した最新ステータス。
 * @returns ラベルと tone を含む表示用データ。
 */
function getStatusMeta(status: AppSummarySystem['latest_status']): StatusMeta {
  switch (status) {
    case 'SUCCEEDED':
      return { label: '成功', tone: 'success' }
    case 'FAILED':
      return { label: '要確認', tone: 'warning' }
    case 'NOT_RUN':
      return { label: '未実行', tone: 'info' }
  }
}

/**
 * 最新実行日時を表示用文字列へ整形する。
 *
 * @param latestRunAt API が返した最新実行日時。
 * @returns 画面表示用の日時文字列。
 */
function formatLatestRunAt(
  latestRunAt: AppSummarySystem['latest_run_at'],
): string {
  if (latestRunAt === null) {
    return '未実行'
  }

  return formatJstDateTime(latestRunAt)
}

/**
 * システム一覧をレスポンシブに描画する。
 *
 * @param props システム別最新状態の一覧。
 * @returns システム一覧または空状態表示。
 */
export function SystemsList(props: SystemsListProps) {
  const { systems } = props

  if (systems.length === 0) {
    return (
      <EmptyState
        title="表示できるシステムがありません"
        description="システムが作成されると、最新実行と状態をここに表示します。"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] shadow-[var(--shadow-soft)]">
      <div className="hidden grid-cols-[6.5rem_7.5rem_minmax(0,1fr)_10.5rem_5.5rem] gap-x-4 border-b border-[color:var(--color-line)] bg-[color:var(--color-subtle-surface)] px-5 py-4 text-left text-xs font-medium tracking-[0.18em] text-[color:var(--color-muted)] uppercase md:grid lg:grid-cols-[7rem_8rem_minmax(0,1fr)_11rem_6rem] lg:gap-x-6 xl:grid-cols-[9rem_10rem_minmax(16rem,1.6fr)_12rem_7rem] xl:gap-x-8 xl:px-6">
        <span>Status</span>
        <span className="min-w-0 break-words">System Code</span>
        <span>System Name</span>
        <span>最新実行</span>
        <span>導線</span>
      </div>

      <div className="divide-y divide-[color:var(--color-line)]">
        {systems.map((system) => {
          const statusMeta = getStatusMeta(system.latest_status)

          return (
            <article
              key={system.system_code}
              className="px-4 py-4 md:grid md:grid-cols-[6.5rem_7.5rem_minmax(0,1fr)_10.5rem_5.5rem] md:items-start md:gap-x-4 md:px-5 lg:grid-cols-[7rem_8rem_minmax(0,1fr)_11rem_6rem] lg:gap-x-6 xl:grid-cols-[9rem_10rem_minmax(16rem,1.6fr)_12rem_7rem] xl:gap-x-8 xl:px-6"
            >
              <div className="flex items-center justify-between gap-4 md:w-max md:justify-self-center">
                <StatusPill label={statusMeta.label} tone={statusMeta.tone} />
                <p className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase md:hidden">
                  {system.system_code}
                </p>
              </div>

              <p className="mt-4 hidden min-w-0 break-words text-sm font-medium tracking-[0.12em] text-[color:var(--color-muted)] uppercase md:block">
                {system.system_code}
              </p>

              <div className="mt-4 min-w-0 md:mt-0">
                <h2 className="text-xl font-semibold tracking-tight text-[color:var(--color-ink)] md:text-base">
                  {system.system_name}
                </h2>
              </div>

              <p className="mt-3 min-w-0 text-sm leading-5 text-[color:var(--color-muted)] md:mt-0">
                最新実行 {formatLatestRunAt(system.latest_run_at)}
              </p>

              <div className="mt-4 min-w-0 md:mt-0">
                <Link
                  to={`/app/systems/${system.system_code}`}
                  className="whitespace-nowrap text-sm font-semibold text-[color:var(--color-ink)] transition hover:text-[color:var(--color-accent)]"
                >
                  詳細を見る
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
