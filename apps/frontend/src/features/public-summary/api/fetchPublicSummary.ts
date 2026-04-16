import { z } from 'zod'

import { apiRequest } from '@/lib/api/httpClient'

export const publicSummarySchema = z.object({
  operating_days: z.number().nonnegative(),
  batch_runs_total: z.number().nonnegative(),
  success_rate: z.number().nonnegative(),
  avg_duration_sec: z.number().nonnegative(),
  updated_at: z.string().min(1),
})

export type PublicSummary = z.infer<typeof publicSummarySchema>

/**
 * 公開トップページ向けの匿名集計サマリを取得する。
 *
 * @returns 検証済みの公開サマリ。
 */
export async function fetchPublicSummary(): Promise<PublicSummary> {
  return apiRequest({
    path: '/v1/public/summary',
    schema: publicSummarySchema,
  })
}
