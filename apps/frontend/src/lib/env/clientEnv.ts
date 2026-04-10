import { z } from 'zod'

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1),
  VITE_OIDC_AUTHORITY: z.string().url(),
  VITE_OIDC_CLIENT_ID: z.string().min(1),
  VITE_OIDC_REDIRECT_URI: z.string().url(),
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: z.string().url(),
  VITE_OIDC_SCOPE: z.string().min(1),
  VITE_ENABLE_DEV_AUTH_BYPASS: z.enum(['true', 'false']).default('true'),
})

type ClientEnv = {
  apiBaseUrl: string
  oidcAuthority: string
  oidcClientId: string
  oidcRedirectUri: string
  oidcPostLogoutRedirectUri: string
  oidcScope: string
  enableDevAuthBypass: boolean
}

let cachedClientEnv: ClientEnv | undefined

/**
 * 末尾スラッシュを取り除いたベース URL を返す。
 *
 * @param value 正規化前の文字列。
 * @returns 末尾スラッシュを除去した文字列。
 */
function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

/**
 * Vite の公開環境変数を検証して返す。
 *
 * @returns フロントエンドで利用する設定値。
 */
export function getClientEnv(): ClientEnv {
  if (cachedClientEnv) {
    return cachedClientEnv
  }

  const parsedEnv = clientEnvSchema.safeParse(import.meta.env)

  if (!parsedEnv.success) {
    throw new Error(
      `フロントエンド環境変数の検証に失敗しました: ${parsedEnv.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ')}`,
    )
  }

  cachedClientEnv = {
    apiBaseUrl: normalizeBaseUrl(parsedEnv.data.VITE_API_BASE_URL),
    oidcAuthority: parsedEnv.data.VITE_OIDC_AUTHORITY,
    oidcClientId: parsedEnv.data.VITE_OIDC_CLIENT_ID,
    oidcRedirectUri: parsedEnv.data.VITE_OIDC_REDIRECT_URI,
    oidcPostLogoutRedirectUri:
      parsedEnv.data.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
    oidcScope: parsedEnv.data.VITE_OIDC_SCOPE,
    enableDevAuthBypass: parsedEnv.data.VITE_ENABLE_DEV_AUTH_BYPASS === 'true',
  }

  return cachedClientEnv
}

/**
 * テスト用に環境変数キャッシュを初期化する。
 *
 * @returns 何も返さない。
 */
export function resetClientEnvCache(): void {
  cachedClientEnv = undefined
}
