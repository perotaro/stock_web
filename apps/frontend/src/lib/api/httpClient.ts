import type { output, ZodType } from 'zod'

import { getClientEnv } from '@/lib/env/clientEnv'

const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRY_DELAY_MS = 250

export class ApiClientError extends Error {
  readonly status: number | undefined
  readonly code: 'network_error' | 'http_error' | 'response_invalid'

  /**
   * API クライアント用の例外を初期化する。
   *
   * @param message エラーメッセージ。
   * @param options 追加の例外情報。
   * @returns 初期化済みの例外インスタンス。
   */
  constructor(
    message: string,
    options: {
      status?: number
      code: 'network_error' | 'http_error' | 'response_invalid'
      cause?: unknown
    },
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiClientError'
    this.status = options.status
    this.code = options.code
  }
}

type ApiRequestOptions<TSchema extends ZodType> = {
  path: string
  schema: TSchema
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: HeadersInit
  body?: BodyInit | null
  authToken?: string
  baseUrl?: string
  retryCount?: number
  retryDelayMs?: number
  timeoutMs?: number
  signal?: AbortSignal
}

/**
 * リトライ対象かどうかを判定する。
 *
 * @param status HTTP ステータス。
 * @returns リトライ対象なら true。
 */
function shouldRetryRequest(status?: number): boolean {
  if (typeof status !== 'number') {
    return true
  }

  return status >= 500
}

/**
 * 指定ミリ秒だけ待機する。
 *
 * @param milliseconds 待機時間。
 * @returns 待機完了を表す Promise。
 */
async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

/**
 * ベース URL とパスから最終 URL を組み立てる。
 *
 * @param baseUrl ベース URL。
 * @param path API パス。
 * @returns 完成した URL。
 */
function buildRequestUrl(baseUrl: string, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  return path.startsWith('/') ? `${baseUrl}${path}` : `${baseUrl}/${path}`
}

/**
 * タイムアウト付き AbortController を生成する。
 *
 * @param timeoutMs タイムアウト時間。
 * @param signal 外部シグナル。
 * @returns AbortController と解除関数。
 */
function createRequestController(
  timeoutMs: number,
  signal?: AbortSignal,
): {
  controller: AbortController
  cleanup: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('request timeout'))
  }, timeoutMs)

  if (signal) {
    signal.addEventListener(
      'abort',
      () => {
        controller.abort(signal.reason)
      },
      { once: true },
    )
  }

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  }
}

/**
 * Zod 検証付きで JSON API を呼び出す。
 *
 * @param options リクエスト条件。
 * @returns スキーマ検証済みレスポンス。
 */
export async function apiRequest<TSchema extends ZodType>(
  options: ApiRequestOptions<TSchema>,
): Promise<output<TSchema>> {
  const {
    path,
    schema,
    method = 'GET',
    headers,
    body,
    authToken,
    baseUrl = getClientEnv().apiBaseUrl,
    retryCount = 1,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options

  const requestUrl = buildRequestUrl(baseUrl, path)
  let currentAttempt = 0

  while (currentAttempt <= retryCount) {
    const { controller, cleanup } = createRequestController(timeoutMs, signal)
    const requestHeaders = {
      'Content-Type': 'application/json',
      ...headers,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }
    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    }

    if (body !== undefined) {
      requestInit.body = body
    }

    try {
      const response = await fetch(requestUrl, requestInit)

      if (!response.ok) {
        throw new ApiClientError(
          `API 呼び出しに失敗しました: ${response.status}`,
          {
            status: response.status,
            code: 'http_error',
          },
        )
      }

      const jsonValue = (await response.json()) as unknown
      const parsedResponse = schema.safeParse(jsonValue)

      if (!parsedResponse.success) {
        throw new ApiClientError('API レスポンスの検証に失敗しました。', {
          code: 'response_invalid',
          cause: parsedResponse.error,
        })
      }

      cleanup()
      return parsedResponse.data
    } catch (error) {
      cleanup()

      const normalizedError =
        error instanceof ApiClientError
          ? error
          : new ApiClientError('通信に失敗しました。', {
              code: 'network_error',
              cause: error,
            })

      if (
        currentAttempt >= retryCount ||
        !shouldRetryRequest(normalizedError.status)
      ) {
        throw normalizedError
      }

      currentAttempt += 1
      await sleep(retryDelayMs * currentAttempt)
    }
  }

  throw new ApiClientError('API 呼び出しに失敗しました。', {
    code: 'network_error',
  })
}
