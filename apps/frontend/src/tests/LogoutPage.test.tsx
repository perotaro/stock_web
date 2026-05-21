import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from 'react-oidc-context'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getCurrentAccessToken,
  setCurrentAccessToken,
} from '@/features/auth/accessTokenStore'
import { DEV_AUTH_TRANSITION_DELAY_MS } from '@/features/auth/timing'
import { LogoutCallbackPage } from '@/pages/auth/LogoutCallbackPage'
import { LogoutPage } from '@/pages/public/LogoutPage'

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
 * LogoutPage をルーティング付きで描画する。
 *
 * @returns 描画結果。
 */
function renderLogoutPage() {
  return render(
    <MemoryRouter initialEntries={['/logout']}>
      <Routes>
        <Route path="/logout" element={<LogoutPage />} />
        <Route
          path="/auth/logout/callback"
          element={<div>ログアウトコールバック</div>}
        />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * LogoutCallbackPage をルーティング付きで描画する。
 *
 * @returns 描画結果。
 */
function renderLogoutCallbackPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/logout/callback']}>
      <Routes>
        <Route path="/auth/logout/callback" element={<LogoutCallbackPage />} />
        <Route path="/" element={<div>公開トップ</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('LogoutPage', () => {
  it('dev-bypass ではローカル状態を破棄してログアウト完了導線へ進む', () => {
    vi.useFakeTimers()
    stubRequiredEnv('dev-bypass')
    setCurrentAccessToken('dev-token')

    renderLogoutPage()

    expect(screen.getByText('ローカルログアウト中')).toBeVisible()

    expect(getCurrentAccessToken()).toBeUndefined()
    expect(screen.queryByText('ログアウトコールバック')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(DEV_AUTH_TRANSITION_DELAY_MS)
    })

    expect(screen.getByText('ログアウトコールバック')).toBeVisible()
    expect(mockedUseAuth).not.toHaveBeenCalled()
  })

  it('oidc では OIDC Provider へのログアウトリダイレクトを開始する', async () => {
    const signoutRedirect = vi.fn().mockResolvedValue(undefined)
    stubRequiredEnv('oidc')
    setCurrentAccessToken('access-token')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      signoutRedirect,
    } as unknown as ReturnType<typeof useAuth>)

    renderLogoutPage()

    fireEvent.click(screen.getByRole('button', { name: 'ログアウトを続行' }))

    expect(getCurrentAccessToken()).toBeUndefined()
    await waitFor(() => {
      expect(signoutRedirect).toHaveBeenCalledTimes(1)
    })
  })

  it('oidc のログアウトリダイレクト失敗時に再試行できる', async () => {
    const signoutRedirect = vi
      .fn()
      .mockRejectedValue(new Error('logout failed'))
    stubRequiredEnv('oidc')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      signoutRedirect,
    } as unknown as ReturnType<typeof useAuth>)

    renderLogoutPage()

    fireEvent.click(screen.getByRole('button', { name: 'ログアウトを続行' }))

    expect(
      await screen.findByText('ログアウト処理に失敗しました: logout failed'),
    ).toBeVisible()
  })
})

describe('LogoutCallbackPage', () => {
  it('dev-bypass では認証状態を破棄して公開トップへ戻る', () => {
    vi.useFakeTimers()
    stubRequiredEnv('dev-bypass')
    setCurrentAccessToken('dev-token')

    renderLogoutCallbackPage()

    expect(screen.getByText('ログアウト中')).toBeVisible()
    expect(getCurrentAccessToken()).toBeUndefined()

    act(() => {
      vi.advanceTimersByTime(DEV_AUTH_TRANSITION_DELAY_MS)
    })

    expect(screen.getByText('公開トップ')).toBeVisible()
    expect(mockedUseAuth).not.toHaveBeenCalled()
  })

  it('oidc では残った認証状態を破棄して公開トップへ戻る', async () => {
    const removeUser = vi.fn().mockResolvedValue(undefined)
    stubRequiredEnv('oidc')
    setCurrentAccessToken('access-token')
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      removeUser,
    } as unknown as ReturnType<typeof useAuth>)

    renderLogoutCallbackPage()

    await waitFor(() => {
      expect(removeUser).toHaveBeenCalledTimes(1)
    })
    expect(getCurrentAccessToken()).toBeUndefined()
    expect(screen.getByText('公開トップ')).toBeVisible()
  })
})
