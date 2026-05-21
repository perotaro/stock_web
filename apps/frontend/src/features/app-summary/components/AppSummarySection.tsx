import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { SummaryStats } from '@/features/app-summary/components/SummaryStats'
import { SystemsList } from '@/features/app-summary/components/SystemsList'
import { useAppSummaryQuery } from '@/features/app-summary/hooks/useAppSummaryQuery'
import { ApiClientError } from '@/lib/api/httpClient'

/**
 * ローディング中の要約カード骨格を描画する。
 *
 * @returns スケルトン風の要約カード群。
 */
export function LoadingSummaryStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={`summary-skeleton-${index}`}
          className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
        >
          <div className="h-4 w-24 rounded-[2px] bg-[color:var(--color-subtle-surface)]" />
          <div className="mt-4 h-9 w-28 rounded-[2px] bg-[color:var(--color-subtle-surface)]" />
        </div>
      ))}
    </div>
  )
}

/**
 * 認証後トップの取得失敗時メッセージを返す。
 *
 * @param error 発生した例外。
 * @returns 利用者向けの簡潔な文言。
 */
function getAppSummaryErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'response_invalid') {
    return 'システム横断サマリの形式が不正です。時間をおいて再試行してください。'
  }

  return 'システム横断サマリを読み込めませんでした。時間をおいて再試行してください。'
}

/**
 * 認証後トップ向けのサマリ本体を描画する。
 *
 * @returns 要約カードとシステム一覧を含む feature UI。
 */
export function AppSummarySection() {
  const appSummaryQuery = useAppSummaryQuery()
  const errorMessage =
    appSummaryQuery.error !== null
      ? getAppSummaryErrorMessage(appSummaryQuery.error)
      : undefined

  if (appSummaryQuery.isPending) {
    return (
      <div className="space-y-12">
        <SectionCard
          title="システム横断サマリ"
          description="全体の件数と最終実行をまとめて確認します。"
        >
          <LoadingState title="システム横断サマリを読み込んでいます…">
            <LoadingSummaryStats />
          </LoadingState>
        </SectionCard>

        <SectionCard
          title="システム一覧"
          description="各システムの最新実行と状態を一覧で確認します。"
        >
          <LoadingState title="システム一覧を読み込んでいます…" />
        </SectionCard>
      </div>
    )
  }

  if (!appSummaryQuery.data || errorMessage) {
    return (
      <SectionCard
        title="システム横断サマリ"
        description="全体の件数と最終実行をまとめて確認します。"
      >
        <ErrorState
          message={errorMessage ?? 'システム横断サマリを読み込めませんでした。'}
          actionLabel="再試行"
          onAction={() => {
            void appSummaryQuery.refetch()
          }}
        />
      </SectionCard>
    )
  }

  return (
    <div className="space-y-12">
      <SectionCard
        title="システム横断サマリ"
        description="全体の件数と最終実行をまとめて確認します。"
      >
        <SummaryStats summary={appSummaryQuery.data} />
      </SectionCard>

      <SectionCard
        title="システム一覧"
        description="各システムの最新実行と状態を一覧で確認します。"
      >
        <SystemsList systems={appSummaryQuery.data.systems} />
      </SectionCard>
    </div>
  )
}
