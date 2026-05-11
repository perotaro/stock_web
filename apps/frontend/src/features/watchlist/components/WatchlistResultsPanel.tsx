import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import {
  CodePill,
  DecisionPill,
  ActivePill,
} from '@/features/watchlist/components/WatchlistPills'
import { WatchlistResultCard } from '@/features/watchlist/components/WatchlistResultCard'
import {
  type WatchlistItem,
  type WatchlistQuery,
} from '@/features/watchlist/types'

type WatchlistResultsPanelProps = {
  items: readonly WatchlistItem[]
  nextCursor: string | null
  hasPendingFilterChanges: boolean
  appliedQuery: WatchlistQuery
  isLoading: boolean
  isLoadingMore: boolean
  errorMessage: string | null
  onLoadMore: () => void
  onRetry: () => void
}

type WatchlistResultHeaderProps = {
  hasPendingFilterChanges: boolean
  appliedQuery: WatchlistQuery
}

/**
 * Watchlistの結果部分共通ヘッダを描画する。
 *
 * @param props フィルタ条件含む props。
 * @returns Watchlist結果部分共通ヘッダ。
 */
function WatchlistResultHeader(props: WatchlistResultHeaderProps) {
  const { appliedQuery, hasPendingFilterChanges } = props

  return (
    <div className="watchlist-section-head">
      <h2 id="watchlist-results-title" className="watchlist-section-title">
        結果一覧
      </h2>
      {hasPendingFilterChanges ? (
        <span className="watchlist-sort-note">フィルタ条件を反映予定</span>
      ) : null}
      <div>
        <p>適用済み条件</p>
        {appliedQuery.q_ticker !== undefined ? (
          <span className="watchlist-sort-note">
            Ticker: {appliedQuery.q_ticker}
          </span>
        ) : null}
        {appliedQuery.category_code !== undefined ? (
          <span className="watchlist-sort-note">
            Category: {appliedQuery.category_code}
          </span>
        ) : null}
        {appliedQuery.system_code !== undefined ? (
          <span className="watchlist-sort-note">
            System: {appliedQuery.system_code}
          </span>
        ) : null}
        {appliedQuery.is_active === undefined ? (
          <span className="watchlist-sort-note">Active: all</span>
        ) : (
          <span className="watchlist-sort-note">
            Active: {String(appliedQuery.is_active)}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Watchlist の結果一覧領域を描画する。
 *
 * @param props 表示対象の Watchlist items とフィルタのアクティブ状態を含む props。
 * @returns 結果一覧のカードと表。
 */
export function WatchlistResultsPanel(props: WatchlistResultsPanelProps) {
  const {
    items,
    nextCursor,
    hasPendingFilterChanges,
    appliedQuery,
    isLoading,
    isLoadingMore,
    errorMessage,
    onLoadMore,
    onRetry,
  } = props

  if (isLoading) {
    return (
      <section
        className="watchlist-panel"
        aria-labelledby="watchlist-results-title"
      >
        <WatchlistResultHeader
          hasPendingFilterChanges={hasPendingFilterChanges}
          appliedQuery={appliedQuery}
        />
        <div className="space-y-12">
          <SectionCard
            title="読み込み中"
            description="監視対象の銘柄を一覧で確認します。"
          >
            <LoadingState title="銘柄一覧を読み込んでいます…" />
          </SectionCard>
        </div>
      </section>
    )
  }

  if (errorMessage !== null) {
    return (
      <section
        className="watchlist-panel"
        aria-labelledby="watchlist-results-title"
      >
        <WatchlistResultHeader
          hasPendingFilterChanges={hasPendingFilterChanges}
          appliedQuery={appliedQuery}
        />
        <SectionCard
          title="読み込み失敗"
          description="監視対象の銘柄を一覧で確認します。"
        >
          <ErrorState
            message={errorMessage}
            actionLabel="再試行"
            onAction={onRetry}
          />
        </SectionCard>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section
        className="watchlist-panel"
        aria-labelledby="watchlist-results-title"
      >
        <WatchlistResultHeader
          hasPendingFilterChanges={hasPendingFilterChanges}
          appliedQuery={appliedQuery}
        />
        <EmptyState
          title="表示できる銘柄がありません"
          description="銘柄が登録されると、最新実行と状態をここに表示します。"
        />
      </section>
    )
  }

  return (
    <section
      className="watchlist-panel"
      aria-labelledby="watchlist-results-title"
    >
      <WatchlistResultHeader
        hasPendingFilterChanges={hasPendingFilterChanges}
        appliedQuery={appliedQuery}
      />
      <div className="watchlist-card-list" aria-label="Watchlist cards">
        {items.map((item) => (
          <WatchlistResultCard key={item.ticker} item={item} />
        ))}
      </div>

      <div className="watchlist-table-shell">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th scope="col">Ticker</th>
              <th scope="col">Active</th>
              <th scope="col">Category</th>
              <th scope="col">Systems</th>
              <th scope="col">Latest Decisions</th>
              <th scope="col">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.ticker}>
                <td className="watchlist-table-ticker">{item.ticker}</td>
                <td>
                  <ActivePill isActive={item.isActive} />
                </td>
                <td>{item.categoryCode}</td>
                <td>
                  <div className="watchlist-pill-list">
                    {item.systems.map((systemCode) => (
                      <CodePill
                        key={`${item.ticker}-${systemCode}`}
                        label={systemCode}
                      />
                    ))}
                  </div>
                </td>
                <td>
                  <div className="watchlist-pill-list">
                    {item.latestDecisions.map((decision) => (
                      <DecisionPill
                        key={`${item.ticker}-${decision}`}
                        decision={decision}
                      />
                    ))}
                  </div>
                </td>
                <td>{item.updatedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nextCursor !== null ? (
        <div className="watchlist-load-more">
          <button
            className="watchlist-load-more-button"
            type="button"
            disabled={isLoadingMore}
            onClick={onLoadMore}
          >
            {isLoadingMore ? '読み込み中…' : 'さらに読み込む'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
