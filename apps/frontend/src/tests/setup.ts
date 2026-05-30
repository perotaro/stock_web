import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

import { resetSharedAppQueryClient } from '@/app/providers/queryClient'
import { resetCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { resetClientEnvCache } from '@/lib/env/clientEnv'

/**
 * テスト共通の Vite 公開環境変数を設定する。
 *
 * @returns なし。
 */
function stubDefaultClientEnv(): void {
  vi.stubEnv('VITE_API_BASE_URL', '/api')
  vi.stubEnv('VITE_AUTH_MODE', 'dev-bypass')
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:9000/realms/guppy')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'guppy-web-dev')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/auth/callback')
  vi.stubEnv(
    'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
    'http://localhost:5173/auth/logout/callback',
  )
  vi.stubEnv(
    'VITE_OIDC_LOGOUT_ENDPOINT',
    'http://localhost:9000/realms/guppy/protocol/openid-connect/logout',
  )
  vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile email')
}

beforeEach(() => {
  stubDefaultClientEnv()
  resetClientEnvCache()
})

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  resetCurrentAccessToken()
  resetClientEnvCache()
  resetSharedAppQueryClient()
})
