import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { LoginPage } from '@/pages/public/LoginPage'

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
 * LoginPage をルーティング付きで描画する。
 *
 * @returns 描画結果。
 */
function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<div>アプリ画面</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('dev-bypass では遷移中表示後に /app へ進む', () => {
    vi.useFakeTimers()
    stubRequiredEnv('dev-bypass')

    renderLoginPage()

    expect(screen.getByText('ローカル認証中')).toBeVisible()
    expect(screen.queryByText('アプリ画面')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(DEV_AUTH_TRANSITION_DELAY_MS)
    })

    expect(screen.getByText('アプリ画面')).toBeVisible()
    expect(mockedUseAuth).not.toHaveBeenCalled()
  })

  it('oidc では Cognito などの OIDC Provider へのリダイレクトを開始する', async () => {
    const signinRedirect = vi.fn().mockResolvedValue(undefined)
    stubRequiredEnv('oidc')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      signinRedirect,
    } as unknown as ReturnType<typeof useAuth>)

    renderLoginPage()

    expect(screen.getByText('認証サービスへ移動中')).toBeVisible()
    expect(
      screen.queryByRole('link', { name: '/app へ進む' }),
    ).not.toBeInTheDocument()

    await waitFor(() => {
      expect(signinRedirect).toHaveBeenCalledTimes(1)
    })
  })

  it('oidc のリダイレクト失敗時に再試行導線を表示する', async () => {
    const signinRedirect = vi
      .fn()
      .mockRejectedValue(new Error('redirect failed'))
    stubRequiredEnv('oidc')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      signinRedirect,
    } as unknown as ReturnType<typeof useAuth>)

    renderLoginPage()

    expect(
      await screen.findByText(
        '認証サービスへの移動に失敗しました: redirect failed',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '再試行' })).toBeVisible()
  })
})
