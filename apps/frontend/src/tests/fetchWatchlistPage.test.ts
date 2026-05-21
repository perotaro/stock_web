import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchWatchlistPage } from '@/features/watchlist/api/fetchWatchlistPage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchWatchlistPage', () => {
  it('正常系', async () => {
    const res = {
      items: [
        {
          ticker: 'AAPL',
          is_active: true,
          category_code: 'MEGA_TECH',
          systems: ['DMP', 'TGB'],
          latest_decisions_by_system: {
            DMP: 'BUY',
            TGB: 'NO_SIGNAL',
          },
          updated_at: '2026-04-10T06:31:00+09:00',
        },
      ],
      next_cursor: 'opaque-cursor-example',
    }

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(res), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchWatchlistPage({
        q_ticker: 'AAPL',
        system_code: 'TGB',
        category_code: 'MEGA_TECH',
        is_active: true,
        cursor: 'test',
      }),
    ).resolves.toEqual(res)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/watchlist?q_ticker=AAPL&system_code=TGB&category_code=MEGA_TECH&is_active=true&sort=updated_at_desc&limit=50&cursor=test',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('正常系(limit変更,cursorなし)', async () => {
    const res = {
      items: [
        {
          ticker: 'AAPL',
          is_active: true,
          category_code: 'MEGA_TECH',
          systems: ['DMP', 'TGB'],
          latest_decisions_by_system: {
            DMP: 'BUY',
            TGB: 'NO_SIGNAL',
          },
          updated_at: '2026-04-10T06:31:00+09:00',
        },
      ],
      next_cursor: 'opaque-cursor-example',
    }

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(res), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchWatchlistPage({
        q_ticker: 'AAPL',
        system_code: 'TGB',
        category_code: 'MEGA_TECH',
        is_active: true,
        limit: 10,
      }),
    ).resolves.toEqual(res)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/watchlist?q_ticker=AAPL&system_code=TGB&category_code=MEGA_TECH&is_active=true&sort=updated_at_desc&limit=10',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('異常系', async () => {
    const res = {
      items: [
        {
          ticker: 'AAPL',
          is_active: true,
          category_code: 'MEGA_TECH',
          systems: ['DMP', 'TGB'],
          latest_decisions_by_system: {
            DMP: 'BUY',
            TGB: 'NO_SIGNAL',
          },
        },
      ],
      next_cursor: 'opaque-cursor-example',
    }

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(res), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchWatchlistPage({
        q_ticker: 'AAPL',
        system_code: 'TGB',
        category_code: 'MEGA_TECH',
        is_active: true,
        cursor: 'test',
      }),
    ).rejects.toThrow()
  })
})
