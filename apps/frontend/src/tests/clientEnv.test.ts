import { afterEach, describe, expect, it, vi } from 'vitest'

import { getClientEnv, resetClientEnvCache } from '@/lib/env/clientEnv'

/**
 * テスト用の環境変数を一括投入する。
 *
 * @returns 何も返さない。
 */
function stubRequiredEnv(): void {
  vi.stubEnv('VITE_API_BASE_URL', '/api/')
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:9000/realms/guppy')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'guppy-web-dev')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/auth/callback')
  vi.stubEnv(
    'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
    'http://localhost:5173/auth/logout/callback',
  )
  vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile email')
  vi.stubEnv('VITE_ENABLE_DEV_AUTH_BYPASS', 'true')
}

afterEach(() => {
  vi.unstubAllEnvs()
  resetClientEnvCache()
})

describe('getClientEnv', () => {
  it('公開環境変数を正規化して返す', () => {
    stubRequiredEnv()

    expect(getClientEnv()).toEqual({
      apiBaseUrl: '/api',
      oidcAuthority: 'http://localhost:9000/realms/guppy',
      oidcClientId: 'guppy-web-dev',
      oidcRedirectUri: 'http://localhost:5173/auth/callback',
      oidcPostLogoutRedirectUri: 'http://localhost:5173/auth/logout/callback',
      oidcScope: 'openid profile email',
      enableDevAuthBypass: true,
    })
  })

  it('必須環境変数が不足すると例外を投げる', () => {
    stubRequiredEnv()
    vi.stubEnv('VITE_OIDC_AUTHORITY', 'invalid-url')

    expect(() => getClientEnv()).toThrow(
      'フロントエンド環境変数の検証に失敗しました',
    )
  })
})
