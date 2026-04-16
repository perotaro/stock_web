import { ApiClientError } from '@/lib/api/httpClient'
import { formatJstDateTimeWithZone } from '@/lib/utils/formatDate'
import { PublicSummaryMetrics } from '@/features/public-summary/components/PublicSummaryMetrics'
import { usePublicSummaryQuery } from '@/features/public-summary/hooks/usePublicSummaryQuery'

/**
 * 公開サマリ取得失敗時の表示文言を返す。
 *
 * @param error 発生した例外。
 * @returns 利用者向けの簡潔な文言。
 */
function getPublicSummaryErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.code === 'response_invalid') {
    return '公開サマリの形式が不正です。時間をおいて再試行してください。'
  }

  return '公開サマリを読み込めませんでした。時間をおいて再試行してください。'
}

/**
 * 公開トップページを描画する。
 *
 * @returns 匿名集計とログイン導線を表示する公開トップ。
 */
export function HomePage() {
  const publicSummaryQuery = usePublicSummaryQuery()
  const updatedAtLabel = publicSummaryQuery.data
    ? formatJstDateTimeWithZone(publicSummaryQuery.data.updated_at)
    : '--'
  const errorMessage =
    publicSummaryQuery.error !== null
      ? getPublicSummaryErrorMessage(publicSummaryQuery.error)
      : undefined

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="public-hero-section">
        <p className="eyebrow eyebrow-on-dark">公開サマリ</p>
        <h1 className="mt-4 max-w-4xl text-4xl leading-[1.15] font-bold tracking-tight text-[color:var(--color-hero-text)] md:text-6xl">
          日次更新のシグナルを、公開サマリと認証後画面で確認できる。
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[color:var(--color-hero-muted)]">
          公開領域では匿名集計と更新状況のみを表示します。詳細な判定結果や対象一覧はログイン後に確認できます。
        </p>

        <div className="mt-8 border-t border-[color:var(--color-hero-line)] pt-6">
          <div>
            <p className="text-xs font-medium tracking-[0.18em] text-[color:var(--color-hero-muted)] uppercase">
              最終更新日時
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight text-[color:var(--color-hero-text)] md:text-xl">
              {updatedAtLabel}
            </p>
          </div>
        </div>
      </section>

      <section className="public-surface-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">
              匿名集計サマリ
            </h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
              公開可能な集計値のみを API から取得して表示します。
            </p>
          </div>
        </div>

        <div className="mt-6">
          <PublicSummaryMetrics
            summary={publicSummaryQuery.data}
            isPending={publicSummaryQuery.isPending}
            errorMessage={errorMessage}
            onRetry={() => {
              void publicSummaryQuery.refetch()
            }}
          />
        </div>
      </section>

      <section className="public-muted-section grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">
            公開領域で表示する内容
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[color:var(--color-muted)] md:text-base">
            表示内容は匿名集計に限定しており、個別銘柄、戦略詳細、当日シグナル生データは公開しません。公開トップでは、更新されていることと運用状況の要点だけを短時間で把握できる構成にしています。
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--color-ink)]">
            ログイン後に確認できる内容
          </h2>
          <ul className="space-y-3 text-sm leading-7 text-[color:var(--color-muted)]">
            <li className="border-b border-[color:var(--color-line)] pb-3">
              システム横断サマリと最新更新状況
            </li>
            <li className="border-b border-[color:var(--color-line)] pb-3">
              システム別の最新判定結果と優先度順シグナル
            </li>
            <li className="pb-1">対象銘柄一覧と絞り込み条件付きの参照画面</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
