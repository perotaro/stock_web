import { QueryClient } from '@tanstack/react-query'
import type { DefaultOptions } from '@tanstack/react-query'

type QueryRetryOption = NonNullable<
  NonNullable<DefaultOptions['queries']>['retry']
>

let sharedAppQueryClient: QueryClient | undefined

/**
 * Query の既定設定を組み立てる。
 *
 * @param retry Query ごとの再試行設定。
 * @returns QueryClient に渡す既定設定。
 */
function buildDefaultQueryOptions(retry: QueryRetryOption): DefaultOptions {
  return {
    queries: {
      retry,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  }
}

/**
 * 再試行対象かどうかを判定する。
 *
 * @param failureCount 失敗回数。
 * @param error 発生したエラー。
 * @returns 再試行する場合は true。
 */
export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 2) {
    return false
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status >= 500
  }

  return true
}

/**
 * アプリ本体向けの QueryClient を生成する。
 *
 * @returns 本番利用向けの QueryClient。
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: buildDefaultQueryOptions(shouldRetryQuery),
  })
}

/**
 * テスト向けの QueryClient を生成する。
 *
 * @returns 再試行を止めた QueryClient。
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: buildDefaultQueryOptions(false),
  })
}

/**
 * アプリ全体で共有する QueryClient を返す。
 *
 * @returns シングルトンの QueryClient。
 */
export function getSharedAppQueryClient(): QueryClient {
  if (!sharedAppQueryClient) {
    sharedAppQueryClient = createAppQueryClient()
  }

  return sharedAppQueryClient
}

/**
 * 共有 QueryClient を初期化する。
 *
 * @returns 何も返さない。
 */
export function resetSharedAppQueryClient(): void {
  sharedAppQueryClient?.clear()
  sharedAppQueryClient = undefined
}
