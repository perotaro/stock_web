import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { setCurrentAccessToken } from '@/features/auth/accessTokenStore'
import { ApiClientError, apiRequest } from '@/lib/api/httpClient'

const responseSchema = z.object({
  ok: z.boolean(),
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('apiRequest', () => {
  it('5xx のときだけ再試行する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest({
        path: '/api/v1/public/summary',
        baseUrl: 'http://localhost:8080',
        schema: responseSchema,
        retryCount: 1,
        retryDelayMs: 0,
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('4xx のときは再試行せず失敗する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest({
        path: '/api/v1/public/summary',
        baseUrl: 'http://localhost:8080',
        schema: responseSchema,
        retryCount: 2,
        retryDelayMs: 0,
      }),
    ).rejects.toBeInstanceOf(ApiClientError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('query パラメータを組み立てて呼び出す', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiRequest({
        path: '/api/v1/watchlist',
        baseUrl: 'http://localhost:8080',
        schema: responseSchema,
        query: {
          q_ticker: '7203',
          is_active: true,
          category_code: ['core', 'income'],
          next_cursor: undefined,
        },
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/watchlist?q_ticker=7203&is_active=true&category_code=core&category_code=income',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('oidc モードでは保存済み Access Token を Authorization ヘッダへ付与する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_AUTH_MODE', 'oidc')
    vi.stubEnv('VITE_OIDC_AUTHORITY', 'http://localhost:9000/realms/guppy')
    vi.stubEnv('VITE_OIDC_CLIENT_ID', 'guppy-web-dev')
    vi.stubEnv('VITE_OIDC_REDIRECT_URI', 'http://localhost:5173/auth/callback')
    vi.stubEnv(
      'VITE_OIDC_POST_LOGOUT_REDIRECT_URI',
      'http://localhost:5173/auth/logout/callback',
    )
    vi.stubEnv('VITE_OIDC_SCOPE', 'openid profile email')
    vi.stubGlobal('fetch', fetchMock)
    setCurrentAccessToken('test-access-token')

    await expect(
      apiRequest({
        path: '/api/v1/summary',
        schema: responseSchema,
        retryCount: 0,
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/v1/summary',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-access-token',
        }),
      }),
    )
  })
})
