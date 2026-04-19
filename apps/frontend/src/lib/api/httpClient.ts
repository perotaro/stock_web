import type { output, ZodType } from 'zod'

import { getClientEnv } from '@/lib/env/clientEnv'


const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRY_DELAY_MS = 250

type ApiRequestQueryPrimitive = string | number | boolean

export type ApiRequestQueryValue =
  | ApiRequestQueryPrimitive
  | null
  | undefined
  | readonly ApiRequestQueryPrimitive[]

export type ApiRequestQuery = Record<string, ApiRequestQueryValue>

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
  query?: ApiRequestQuery
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
 * @param apiError APIエラークラス。
 * @returns リトライ対象なら true。
 */
function shouldRetryRequest(apiError: ApiClientError): boolean {
  
  if (apiError.code==="network_error") return true
  if (apiError.code==="response_invalid") return false
  return (typeof apiError.status =="number" && apiError.status >= 500)
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
 * クエリ値を URLSearchParams へ追加する。
 *
 * @param searchParams 組み立て先の検索パラメータ。
 * @param key パラメータ名。
 * @param value パラメータ値。
 * @returns 何も返さない。
 */
function appendQueryParameter(
  searchParams: URLSearchParams,
  key: string,
  value: ApiRequestQueryValue,
): void {
  if (value === undefined || value === null) {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => {
      searchParams.append(key, String(entry))
    })
    return
  }

  searchParams.append(key, String(value))
}

/**
 * クエリ文字列を組み立てる。
 *
 * @param query クエリパラメータ。
 * @returns `?` を含むクエリ文字列。
 */
function buildQueryString(query?: ApiRequestQuery): string {
  if (!query) {
    return ''
  }

  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    appendQueryParameter(searchParams, key, value)
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

/**
 * ベース URL、パス、クエリから最終 URL を組み立てる。
 *
 * @param baseUrl ベース URL。
 * @param path API パス。
 * @param query クエリパラメータ。
 * @returns 完成した URL。
 */
function buildRequestUrl(
  baseUrl: string,
  path: string,
  query?: ApiRequestQuery,
): string {
  const requestUrl =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : path.startsWith('/')
        ? `${baseUrl}${path}`
        : `${baseUrl}/${path}`
  const queryString = buildQueryString(query)

  if (!queryString) {
    return requestUrl
  }

  const separator = requestUrl.includes('?') ? '&' : '?'
  return `${requestUrl}${separator}${queryString.slice(1)}`
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
    query,
    headers,
    body,
    authToken,
    baseUrl = getClientEnv().apiBaseUrl,
    retryCount = 1,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options

  const requestUrl = buildRequestUrl(baseUrl, path, query)
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
        !shouldRetryRequest(normalizedError)
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
