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
})
