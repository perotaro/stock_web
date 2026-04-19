import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ApiClientError, apiRequest } from '@/lib/api/httpClient'

const responseSchema = z.object({
  ok: z.boolean(),
})

afterEach(() => {
  vi.restoreAllMocks()
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
})
