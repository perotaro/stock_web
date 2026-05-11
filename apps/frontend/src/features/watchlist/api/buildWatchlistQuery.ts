import {
  type WatchlistFilterValues,
  type WatchlistQuery,
} from '@/features/watchlist/types'

/**
 * フィルターの値からAPIクエリオブジェクトを組み立てる
 *
 * @param filterValues 画面から受け取ったフィルターの値
 * @returns APIクエリオブジェクト
 */
export function buildWatchlistQuery(
  filterValues: WatchlistFilterValues,
): WatchlistQuery {
  const { ticker, categoryCode, systemCode, isActive } = filterValues

  const watchlistQuery: WatchlistQuery = {}

  if (ticker !== '') watchlistQuery.q_ticker = ticker
  if (categoryCode !== '') watchlistQuery.category_code = categoryCode
  if (systemCode !== '') watchlistQuery.system_code = systemCode
  if (isActive === 'true') {
    watchlistQuery.is_active = true
  } else if (isActive === 'false') {
    watchlistQuery.is_active = false
  }

  return watchlistQuery
}
