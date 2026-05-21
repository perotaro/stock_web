import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertAllowedAuthMode,
  getClientEnv,
  resetClientEnvCache,
} from '@/lib/env/clientEnv'

/**
 * テスト用の環境変数を一括投入する。
 *
 * @returns 何も返さない。
 */
function stubRequiredEnv(): void {
  vi.stubEnv('VITE_API_BASE_URL', '/api/')
  vi.stubEnv('VITE_AUTH_MODE', 'dev-bypass')
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:9000/realms/guppy')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'guppy-web-dev')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/auth/callback')
  vi.stubEnv(
    'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
    'http://localhost:5173/auth/logout/callback',
  )
  vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile email')
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
      authMode: 'dev-bypass',
      oidcAuthority: 'http://localhost:9000/realms/guppy',
      oidcClientId: 'guppy-web-dev',
      oidcRedirectUri: 'http://localhost:5173/auth/callback',
      oidcPostLogoutRedirectUri: 'http://localhost:5173/auth/logout/callback',
      oidcScope: 'openid profile email',
    })
  })

  it('必須環境変数が不足すると例外を投げる', () => {
    stubRequiredEnv()
    vi.stubEnv('VITE_OIDC_AUTHORITY', 'invalid-url')

    expect(() => getClientEnv()).toThrow(
      'フロントエンド環境変数の検証に失敗しました',
    )
  })

  it('本番環境では dev-bypass 認証を拒否する', () => {
    expect(() => assertAllowedAuthMode('dev-bypass', true)).toThrow(
      '本番環境で dev-bypass 認証は使用できません',
    )
  })

  it('本番環境では oidc 認証を許可する', () => {
    expect(() => assertAllowedAuthMode('oidc', true)).not.toThrow()
  })
})
