import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthGuard } from '@/app/guards/AuthGuard'

vi.mock('react-oidc-context', () => ({
  useAuth: vi.fn(),
}))

const mockedUseAuth = vi.mocked(useAuth)

/**
 * テスト用の必須環境変数を設定する。
 *
 * @param authMode 認証モード。
 * @returns 何も返さない。
 */
function stubRequiredEnv(authMode: 'oidc' | 'dev-bypass'): void {
  vi.stubEnv('VITE_API_BASE_URL', '/api/')
  vi.stubEnv('VITE_AUTH_MODE', authMode)
  vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:9000/realms/guppy')
  vi.stubEnv('VITE_OIDC_CLIENT_ID', 'guppy-web-dev')
  vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/auth/callback')
  vi.stubEnv(
    'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
    'http://localhost:5173/auth/logout/callback',
  )
  vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile email')
}

/**
 * AuthGuard をルーティング付きで描画する。
 *
 * @returns 描画結果。
 */
function renderAuthGuard() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route
          path="/app"
          element={
            <AuthGuard>
              <div>保護画面</div>
            </AuthGuard>
          }
        />
        <Route path="/login" element={<div>ログイン導線</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('AuthGuard', () => {
  it('dev-bypass では認証状態を見ずに保護画面を表示する', () => {
    stubRequiredEnv('dev-bypass')

    renderAuthGuard()

    expect(screen.getByText('保護画面')).toBeVisible()
    expect(mockedUseAuth).not.toHaveBeenCalled()
  })

  it('oidc で未認証の場合はログイン導線へ戻す', () => {
    stubRequiredEnv('oidc')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>)

    renderAuthGuard()

    expect(screen.getByText('ログイン導線')).toBeVisible()
  })

  it('oidc で認証済みの場合は保護画面を表示する', () => {
    stubRequiredEnv('oidc')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useAuth>)

    renderAuthGuard()

    expect(screen.getByText('保護画面')).toBeVisible()
  })
})
