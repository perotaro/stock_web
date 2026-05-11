import { type WatchlistPageSchema } from '@/features/watchlist/api/fetchWatchlistPage'
import { type WatchlistItem } from '@/features/watchlist/types'

/**
 * APIデータをマッピングする。
 *
 * @param page APIデータ
 * @returns マッピング済みデータ
 */
export function mapWatchlistPage(page: WatchlistPageSchema): WatchlistItem[] {
  return page.items.map((item) => {
    const {
      ticker,
      is_active,
      category_code,
      systems,
      latest_decisions_by_system,
      updated_at,
    } = item

    return {
      ticker,
      systems,
      isActive: is_active,
      categoryCode: category_code,
      updatedAt: updated_at,
      latestDecisions: systems.map((system) => {
        const decision = latest_decisions_by_system[system]
        if (decision === undefined) {
          throw new Error(
            `watchlist decision が見つかりません: ticker=${ticker}, system=${system}`,
          )
        }
        return decision
      }),
    }
  })
}
