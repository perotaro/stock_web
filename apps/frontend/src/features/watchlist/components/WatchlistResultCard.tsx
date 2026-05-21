import {
  CodePill,
  DecisionPill,
  ActivePill,
} from '@/features/watchlist/components/WatchlistPills'
import { type WatchlistItem } from '@/features/watchlist/types'

type WatchlistResultCardProps = {
  item: WatchlistItem
}

/**
 * モバイル向けの Watchlist 結果カードを描画する。
 *
 * @param props 表示対象の Watchlist item を含む props。
 * @returns 1 銘柄分の結果カード。
 */
export function WatchlistResultCard(props: WatchlistResultCardProps) {
  const { item } = props

  return (
    <article className="watchlist-result-card" aria-label={item.ticker}>
      <div className="watchlist-card-head">
        <h3 className="watchlist-ticker">{item.ticker}</h3>
        <ActivePill isActive={item.isActive} />
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
            {item.latestDecisionsBySystem.map(({ systemCode, decision }) => (
              <span key={`${item.ticker}-${systemCode}`}>
                {systemCode}: <DecisionPill decision={decision} />
              </span>
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
