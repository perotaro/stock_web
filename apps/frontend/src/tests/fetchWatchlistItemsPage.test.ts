import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchWatchlistItemsPage } from '@/features/watchlist/api/fetchWatchlistItemsPage'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchWatchlistItemsPage', () => {
  it('API レスポンスを UI 用ページへ変換する', async () => {
    const response = {
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
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchWatchlistItemsPage({
        q_ticker: 'AAPL',
        system_code: 'DMP',
        category_code: 'MEGA_TECH',
        is_active: true,
        limit: 10,
      }),
    ).resolves.toEqual({
      items: [
        {
          ticker: 'AAPL',
          categoryCode: 'MEGA_TECH',
          systems: ['DMP', 'TGB'],
          latestDecisionsBySystem: [
            { systemCode: 'DMP', decision: 'BUY' },
            { systemCode: 'TGB', decision: 'NO_SIGNAL' },
          ],
          isActive: true,
          updatedAt: '2026-04-10T06:31:00+09:00',
        },
      ],
      nextCursor: 'opaque-cursor-example',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/watchlist?q_ticker=AAPL&system_code=DMP&category_code=MEGA_TECH&is_active=true&sort=updated_at_desc&limit=10',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('next_cursor が null の場合も nextCursor として保持する', async () => {
    const response = {
      items: [],
      next_cursor: null,
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchWatchlistItemsPage({
        is_active: true,
      }),
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
    })
  })

  it('decision が欠落している場合は未判定として変換する', async () => {
    const response = {
      items: [
        {
          ticker: 'AAPL',
          is_active: true,
          category_code: 'MEGA_TECH',
          systems: ['DMP', 'TGB'],
          latest_decisions_by_system: {
            DMP: 'BUY',
          },
          updated_at: '2026-04-10T06:31:00+09:00',
        },
      ],
      next_cursor: null,
    }
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchWatchlistItemsPage({
        is_active: true,
      }),
    ).resolves.toEqual({
      items: [
        {
          ticker: 'AAPL',
          categoryCode: 'MEGA_TECH',
          systems: ['DMP', 'TGB'],
          latestDecisionsBySystem: [
            { systemCode: 'DMP', decision: 'BUY' },
            { systemCode: 'TGB', decision: null },
          ],
          isActive: true,
          updatedAt: '2026-04-10T06:31:00+09:00',
        },
      ],
      nextCursor: null,
    })
  })
})
