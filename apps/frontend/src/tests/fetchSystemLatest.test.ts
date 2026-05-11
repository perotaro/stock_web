import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchSystemLatest } from '@/features/system-latest/api/fetchSystemLatest'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('fetchSystemLatest', () => {
  it('指定した system_code の最新結果を取得する', async () => {
    const response = {
      system_code: 'DMP',
      system_name: 'Dynamic Momentum Pullback',
      latest_run_id: 'DMP-20260410-063000',
      latest_run_at: '2026-04-10T06:30:00+09:00',
      updated_at: '2026-04-10T06:31:00+09:00',
      signals: [
        {
          priority_rank: 1,
          ticker: 'AAPL',
          name: 'Apple Inc.',
          decision: 'BUY',
          reason: 'EMA20 support and ATR contraction',
          run_id: 'DMP-20260410-063000',
        },
      ],
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchSystemLatest('DMP')).resolves.toEqual(response)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/systems/DMP/latest',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('レスポンス形式が不正な場合は失敗する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          system_code: 'DMP',
          signals: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchSystemLatest('DMP')).rejects.toThrow()
  })
})
