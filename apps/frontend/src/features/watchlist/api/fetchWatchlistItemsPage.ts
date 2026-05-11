import { fetchWatchlistPage } from '@/features/watchlist/api/fetchWatchlistPage'
import { mapWatchlistPage } from '@/features/watchlist/api/mapWatchlistPage'
import {
  type WatchlistItemsPage,
  type WatchlistQuery,
} from '@/features/watchlist/types'

/**
 * Watchlist API ページを取得し、UI 用ページ形式へ変換する。
 *
 * @param watchlistQuery API に渡すクエリパラメータ。
 * @returns UI 表示用の Watchlist ページ。
 */
export async function fetchWatchlistItemsPage(
  watchlistQuery: WatchlistQuery,
): Promise<WatchlistItemsPage> {
  const page = await fetchWatchlistPage(watchlistQuery)

  return {
    items: mapWatchlistPage(page),
    nextCursor: page.next_cursor,
  }
}
