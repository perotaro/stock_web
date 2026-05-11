import { record, z } from 'zod'

import { apiRequest } from '@/lib/api/httpClient'
import { type WatchlistQuery } from '@/features/watchlist/types'

const watchlistItemSchema = z.object({
  ticker: z.string().min(1),
  is_active: z.boolean(),
  category_code: z.string().min(1),
  systems: z.array(z.string()),
  latest_decisions_by_system: record(z.string(), z.string()),
  updated_at: z.string(),
})

const watchlistPageSchema = z.object({
  items: z.array(watchlistItemSchema),
  next_cursor: z.string().nullable(),
})

export type WatchlistPageSchema = z.infer<typeof watchlistPageSchema>

/**
 * watchlistページの銘柄データを取得する。
 *
 * @param watchlistQuery APIに渡すクエリパラメータ
 * @returns フィルタリングされた銘柄データ
 */
export async function fetchWatchlistPage(
  watchlistQuery: WatchlistQuery,
): Promise<WatchlistPageSchema> {
  return apiRequest({
    path: '/v1/watchlist',
    schema: watchlistPageSchema,
    query: {
      q_ticker: watchlistQuery.q_ticker,
      system_code: watchlistQuery.system_code,
      category_code: watchlistQuery.category_code,
      is_active: watchlistQuery.is_active,
      sort: 'updated_at_desc',
      limit: watchlistQuery.limit ?? 50,
      cursor: watchlistQuery.cursor,
    },
  })
}
