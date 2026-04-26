import { AppSectionNav } from '@/features/app-summary/components/AppSectionNav'

const watchlistPreviewItems = [
  {
    ticker: 'AAPL',
    categoryCode: 'growth',
    systems: ['DMP', 'TGB'],
    latestDecisions: ['BUY', 'NO_SIGNAL'],
    isActive: true,
    updatedAt: '2026/04/20 9:05',
  },
  {
    ticker: 'MSFT',
    categoryCode: 'core',
    systems: ['DMP'],
    latestDecisions: ['NO_SIGNAL'],
    isActive: true,
    updatedAt: '2026/04/20 9:04',
  },
  {
    ticker: 'NVDA',
    categoryCode: 'growth',
    systems: ['TGB'],
    latestDecisions: ['BUY'],
    isActive: true,
    updatedAt: '2026/04/20 9:03',
  },
] as const

type WatchlistItem = {
  ticker: string
  categoryCode: string
  systems: readonly string[]
  latestDecisions: readonly string[]
  isActive: boolean
  updatedAt: string
}

type WatchlistResultsPanelProps = {
  items: readonly WatchlistItem[]
}

type CodePillProps = {
  label: string
}

type DecisionPillProps = {
  decision: string
}

type WatchlistResultCardProps = {
  item: WatchlistItem
}

/**
 * active 状態を画面表示用ラベルへ変換する。
 *
 * @param isActive API が返す active 状態。
 * @returns active または inactive の表示ラベル。
 */
function formatActiveLabel(isActive: boolean): string {
  return isActive ? 'active' : 'inactive'
}

/**
 * 判定結果に対応する CSS クラスを返す。
 *
 * @param decision 表示対象の判定文字列。
 * @returns 判定の tone を表す CSS クラス名。
 */
function getDecisionToneClassName(decision: string): string {
  if (decision === 'BUY') {
    return 'watchlist-decision-pill--success'
  }

  if (decision === 'NO_SIGNAL') {
    return 'watchlist-decision-pill--info'
  }

  return 'watchlist-decision-pill--warning'
}

/**
 * システムコードの pill を描画する。
 *
 * @param props 表示するコード文字列を含む props。
 * @returns システムコード用の pill。
 */
function CodePill(props: CodePillProps) {
  const { label } = props

  return <span className="watchlist-code-pill">{label}</span>
}

/**
 * 判定結果の pill を描画する。
 *
 * @param props 表示する判定文字列を含む props。
 * @returns 判定結果用の pill。
 */
function DecisionPill(props: DecisionPillProps) {
  const { decision } = props

  return (
    <span
      className={`watchlist-decision-pill ${getDecisionToneClassName(
        decision,
      )}`}
    >
      {decision}
    </span>
  )
}

/**
 * Watchlist のフィルタ領域を描画する。
 *
 * @returns フィルタ UI を置くセクション。
 */
function WatchlistFilterPanel() {
  return (
    <section
      className="watchlist-panel"
      aria-labelledby="watchlist-filter-title"
    >
      <div className="watchlist-section-head">
        <h2 id="watchlist-filter-title" className="watchlist-section-title">
          フィルタ
        </h2>
        <p className="watchlist-sort-note">updated_at_desc 固定</p>
      </div>
      <form className="watchlist-filter-grid" aria-label="Watchlist filters">
        <label className="watchlist-field">
          <span>Ticker</span>
          <input
            className="watchlist-field-control"
            placeholder="AAPL"
            defaultValue="AAPL"
          />
        </label>
        <label className="watchlist-field">
          <span>System Code</span>
          <input
            className="watchlist-field-control"
            placeholder="DMP"
            defaultValue="DMP"
          />
        </label>
        <label className="watchlist-field">
          <span>Category Code</span>
          <input
            className="watchlist-field-control"
            placeholder="growth"
            defaultValue="growth"
          />
        </label>
        <label className="watchlist-field">
          <span>Active</span>
          <select className="watchlist-field-control" defaultValue="true">
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
      </form>
    </section>
  )
}

/**
 * モバイル向けの Watchlist 結果カードを描画する。
 *
 * @param props 表示対象の Watchlist item を含む props。
 * @returns 1 銘柄分の結果カード。
 */
function WatchlistResultCard(props: WatchlistResultCardProps) {
  const { item } = props

  return (
    <article className="watchlist-result-card" aria-label={item.ticker}>
      <div className="watchlist-card-head">
        <h3 className="watchlist-ticker">{item.ticker}</h3>
        <span className="watchlist-active-pill">
          {formatActiveLabel(item.isActive)}
        </span>
      </div>

      <dl className="watchlist-card-details">
        <div className="watchlist-card-row">
          <dt>Category</dt>
          <dd>{item.categoryCode}</dd>
        </div>
        <div className="watchlist-card-row">
          <dt>Systems</dt>
          <dd className="watchlist-pill-list">
            {item.systems.map((systemCode) => (
              <CodePill
                key={`${item.ticker}-${systemCode}`}
                label={systemCode}
              />
            ))}
          </dd>
        </div>
        <div className="watchlist-card-row">
          <dt>Latest Decisions</dt>
          <dd className="watchlist-pill-list">
            {item.latestDecisions.map((decision) => (
              <DecisionPill
                key={`${item.ticker}-${decision}`}
                decision={decision}
              />
            ))}
          </dd>
        </div>
        <div className="watchlist-card-row">
          <dt>updated_at</dt>
          <dd>{item.updatedAt}</dd>
        </div>
      </dl>
    </article>
  )
}

/**
 * Watchlist の結果一覧領域を描画する。
 *
 * @param props 表示対象の Watchlist items を含む props。
 * @returns 結果一覧のカードと表。
 */
function WatchlistResultsPanel(props: WatchlistResultsPanelProps) {
  const { items } = props

  return (
    <section
      className="watchlist-panel"
      aria-labelledby="watchlist-results-title"
    >
      <div className="watchlist-section-head">
        <h2 id="watchlist-results-title" className="watchlist-section-title">
          結果一覧
        </h2>
      </div>

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
                  <span className="watchlist-active-pill">
                    {formatActiveLabel(item.isActive)}
                  </span>
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

      <div className="watchlist-load-more">
        <button className="watchlist-load-more-button" type="button">
          さらに読み込む
        </button>
      </div>
    </section>
  )
}

/**
 * Watchlist の一覧画面を描画する。
 *
 * @returns 絞り込み条件と結果一覧を配置するページ。
 */
export function WatchlistPage() {
  return (
    <div className="watchlist-page">
      <div className="watchlist-page-head">
        <header className="watchlist-page-header">
          <h1 className="watchlist-page-title">Watchlist</h1>
          <p className="watchlist-page-lead">
            監視対象の銘柄を絞り込み条件付きで確認
          </p>
        </header>
        <AppSectionNav currentSection="Watchlist" />
      </div>

      <WatchlistFilterPanel />
      <WatchlistResultsPanel items={watchlistPreviewItems} />
    </div>
  )
}
