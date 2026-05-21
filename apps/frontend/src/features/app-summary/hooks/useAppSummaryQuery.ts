import { useQuery } from '@tanstack/react-query'

import { fetchAppSummary } from '@/features/app-summary/api/fetchAppSummary'

const APP_SUMMARY_QUERY_KEY = ['appSummary'] as const

/**
 * 認証後トップページ向けサマリの Query を返す。
 *
 * @returns ログイン後サマリ取得用の Query 結果。
 */
export function useAppSummaryQuery() {
  return useQuery({
    queryKey: APP_SUMMARY_QUERY_KEY,
    queryFn: fetchAppSummary,
  })
}
