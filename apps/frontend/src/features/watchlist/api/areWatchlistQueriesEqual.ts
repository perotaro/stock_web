import { type WatchlistQuery } from '@/features/watchlist/types'

/**
 * Watchlist API query 同士が同じ条件を表すか判定する。
 *
 * @param left 比較元の Watchlist API query。
 * @param right 比較先の Watchlist API query。
 * @returns 同じ query 条件なら true。
 */
export function areWatchlistQueriesEqual(
  left: WatchlistQuery,
  right: WatchlistQuery,
): boolean {
  return (
    left.q_ticker === right.q_ticker &&
    left.system_code === right.system_code &&
    left.category_code === right.category_code &&
    left.is_active === right.is_active
  )
}
