import { useQuery } from '@tanstack/react-query'

import { fetchSystemLatest } from '@/features/system-latest/api/fetchSystemLatest'

/**
 * システム別最新結果の Query Key を組み立てる。
 *
 * @param systemCode 対象システムコード。
 * @returns Query Key。
 */
function buildSystemLatestQueryKey(systemCode: string) {
  return ['systemLatest', systemCode] as const
}

/**
 * システム別最新結果の Query を返す。
 *
 * @param systemCode 対象システムコード。
 * @returns 最新結果取得用の Query 結果。
 */
export function useSystemLatestQuery(systemCode: string) {
  return useQuery({
    queryKey: buildSystemLatestQueryKey(systemCode),
    queryFn: () => fetchSystemLatest(systemCode),
    enabled: systemCode.length > 0,
  })
}
