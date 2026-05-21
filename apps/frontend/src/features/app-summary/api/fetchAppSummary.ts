import { z } from 'zod'

import { apiRequest } from '@/lib/api/httpClient'

const appSummaryStatusSchema = z.enum(['SUCCEEDED', 'FAILED', 'NOT_RUN'])

const appSummarySystemSchema = z.object({
  system_code: z.string().min(1),
  system_name: z.string().min(1),
  latest_status: appSummaryStatusSchema,
  latest_run_at: z.string().min(1).nullable(),
  updated_at: z.string().min(1),
})

export const appSummarySchema = z.object({
  system_count: z.number().nonnegative(),
  latest_run_at: z.string().min(1).nullable(),
  status_counts: z.object({
    succeeded: z.number().nonnegative(),
    failed: z.number().nonnegative(),
    not_run: z.number().nonnegative(),
  }),
  systems: z.array(appSummarySystemSchema),
})

export type AppSummary = z.infer<typeof appSummarySchema>
export type AppSummaryStatus = z.infer<typeof appSummaryStatusSchema>
export type AppSummarySystem = z.infer<typeof appSummarySystemSchema>

/**
 * 認証後トップページ向けのシステム横断サマリを取得する。
 *
 * @returns 検証済みのログイン後サマリ。
 */
export async function fetchAppSummary(): Promise<AppSummary> {
  return apiRequest({
    path: '/v1/summary',
    schema: appSummarySchema,
  })
}
