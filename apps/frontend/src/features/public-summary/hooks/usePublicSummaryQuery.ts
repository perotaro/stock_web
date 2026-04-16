import { useQuery } from '@tanstack/react-query'

import { fetchPublicSummary } from '@/features/public-summary/api/fetchPublicSummary'

const PUBLIC_SUMMARY_QUERY_KEY = ['publicSummary'] as const

/**
 * 公開トップページ向け匿名集計の Query を返す。
 *
 * @returns 公開サマリ取得用の Query 結果。
 */
export function usePublicSummaryQuery() {
  return useQuery({
    queryKey: PUBLIC_SUMMARY_QUERY_KEY,
    queryFn: fetchPublicSummary,
  })
}
