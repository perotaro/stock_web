import { z } from 'zod'

import { apiRequest } from '@/lib/api/httpClient'

const systemLatestSignalSchema = z.object({
  priority_rank: z.number().int().positive(),
  ticker: z.string().min(1),
  name: z.string(),
  decision: z.string().min(1),
  reason: z.string().nullable(),
  run_id: z.string().min(1),
})

export const systemLatestSchema = z.object({
  system_code: z.string().min(1),
  system_name: z.string().min(1),
  latest_run_id: z.string().min(1).nullable(),
  latest_run_at: z.string().min(1).nullable(),
  updated_at: z.string().min(1),
  signals: z.array(systemLatestSignalSchema),
})

export type SystemLatest = z.infer<typeof systemLatestSchema>
export type SystemLatestSignal = z.infer<typeof systemLatestSignalSchema>

/**
 * システム別の最新実行結果を取得する。
 *
 * @param systemCode 取得対象のシステムコード。
 * @returns 検証済みのシステム別最新結果。
 */
export async function fetchSystemLatest(
  systemCode: string,
): Promise<SystemLatest> {
  return apiRequest({
    path: `/v1/systems/${encodeURIComponent(systemCode)}/latest`,
    schema: systemLatestSchema,
  })
}
