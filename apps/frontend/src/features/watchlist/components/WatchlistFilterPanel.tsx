import { type WatchlistFilterValues } from '@/features/watchlist/types'

type WatchlistFilterHandlers = {
  onTickerChange: (value: string) => void
  onSystemCodeChange: (value: string) => void
  onCategoryCodeChange: (value: string) => void
  onIsActiveChange: (value: string) => void
}

type WatchlistFilterPanelProps = {
  filterValues: WatchlistFilterValues
  filterHandlers: WatchlistFilterHandlers
  isResetDisabled: boolean
  hasInputFilterChanges: boolean
  isApplied: boolean
  isApplyDisabled: boolean
  onResetFilters: () => void
  onApplyFilters: (event: React.SubmitEvent<HTMLFormElement>) => void
}

/**
 * Watchlist のフィルタ領域を描画する。
 *
 * @param props フィルタ設定値と更新関数を含む props。
 * @returns フィルタ UI を置くセクション。
 */
export function WatchlistFilterPanel(props: WatchlistFilterPanelProps) {
  const {
    filterValues,
    filterHandlers,
    isResetDisabled,
    hasInputFilterChanges,
    isApplied,
    isApplyDisabled,
    onResetFilters,
    onApplyFilters,
  } = props

  const { ticker, systemCode, categoryCode, isActive } = filterValues

  return (
    <section
      className="watchlist-panel"
      aria-labelledby="watchlist-filter-title"
    >
      <div className="watchlist-section-head">
        <h2 id="watchlist-filter-title" className="watchlist-section-title">
          フィルタ
        </h2>
      </div>
      <form
        className="watchlist-filter-form"
        aria-label="Watchlist filters"
        onSubmit={onApplyFilters}
      >
        <div className="watchlist-filter-grid">
          <label className="watchlist-field">
            <span>Ticker</span>
            <input
              className="watchlist-field-control"
              placeholder="AAPL"
              value={ticker}
              onChange={(event) => {
                filterHandlers.onTickerChange(event.target.value)
              }}
            />
          </label>
          <label className="watchlist-field">
            <span>System Code</span>
            <input
              className="watchlist-field-control"
              placeholder="DMP"
              value={systemCode}
              onChange={(event) => {
                filterHandlers.onSystemCodeChange(event.target.value)
              }}
            />
          </label>
          <label className="watchlist-field">
            <span>Category Code</span>
            <input
              className="watchlist-field-control"
              placeholder="growth"
              value={categoryCode}
              onChange={(event) => {
                filterHandlers.onCategoryCodeChange(event.target.value)
              }}
            />
          </label>
          <label className="watchlist-field">
            <span>Active</span>
            <select
              className="watchlist-field-control"
              value={isActive}
              onChange={(event) => {
                filterHandlers.onIsActiveChange(event.target.value)
              }}
            >
              <option value="">all</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
        </div>

        <div className="watchlist-filter-footer">
          <div className="watchlist-filter-meta">
            <p className="watchlist-sort-note">updated_at_desc 固定で表示</p>
            <div className="watchlist-filter-status" aria-live="polite">
              {hasInputFilterChanges && (
                <span className="watchlist-filter-state">フィルタ条件あり</span>
              )}
              {isApplied && (
                <span className="watchlist-filter-state watchlist-filter-state--applied">
                  フィルタを適用しました
                </span>
              )}
            </div>
          </div>

          <div className="watchlist-filter-actions">
            <button
              className="watchlist-filter-button watchlist-filter-button--secondary"
              type="button"
              onClick={onResetFilters}
              disabled={isResetDisabled}
            >
              リセット
            </button>
            <button
              className="watchlist-filter-button watchlist-filter-button--primary"
              type="submit"
              disabled={isApplyDisabled}
            >
              検索
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
