import { z } from 'zod'

const authModeSchema = z.enum(['oidc', 'dev-bypass'])

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1),
  VITE_AUTH_MODE: authModeSchema.default('dev-bypass'),
  VITE_OIDC_AUTHORITY: z.string().url(),
  VITE_OIDC_CLIENT_ID: z.string().min(1),
  VITE_OIDC_REDIRECT_URI: z.string().url(),
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: z.string().url(),
  VITE_OIDC_LOGOUT_ENDPOINT: z.string().url().optional(),
  VITE_OIDC_SCOPE: z.string().min(1),
})

export type AuthMode = z.infer<typeof authModeSchema>

type ClientEnv = {
  apiBaseUrl: string
  authMode: AuthMode
  oidcAuthority: string
  oidcClientId: string
  oidcRedirectUri: string
  oidcPostLogoutRedirectUri: string
  oidcLogoutEndpoint: string | undefined
  oidcScope: string
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
 * 認証モードが実行環境で許可されているか検証する。
 *
 * @param authMode 検証対象の認証モード。
 * @param isProduction 本番ビルドとして扱うかどうか。
 * @returns 何も返さない。
 */
export function assertAllowedAuthMode(
  authMode: AuthMode,
  isProduction: boolean,
): void {
  if (isProduction && authMode === 'dev-bypass') {
    throw new Error(
      '本番環境で dev-bypass 認証は使用できません。VITE_AUTH_MODE=oidc を指定してください。',
    )
  }
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

  assertAllowedAuthMode(parsedEnv.data.VITE_AUTH_MODE, import.meta.env.PROD)

  cachedClientEnv = {
    apiBaseUrl: normalizeBaseUrl(parsedEnv.data.VITE_API_BASE_URL),
    authMode: parsedEnv.data.VITE_AUTH_MODE,
    oidcAuthority: parsedEnv.data.VITE_OIDC_AUTHORITY,
    oidcClientId: parsedEnv.data.VITE_OIDC_CLIENT_ID,
    oidcRedirectUri: parsedEnv.data.VITE_OIDC_REDIRECT_URI,
    oidcPostLogoutRedirectUri:
      parsedEnv.data.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
    oidcLogoutEndpoint: parsedEnv.data.VITE_OIDC_LOGOUT_ENDPOINT,
    oidcScope: parsedEnv.data.VITE_OIDC_SCOPE,
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
