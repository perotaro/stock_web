import { describe, expect, it } from 'vitest'

import { type WatchlistPageSchema } from '@/features/watchlist/api/fetchWatchlistPage'
import { mapWatchlistPage } from '@/features/watchlist/api/mapWatchlistPage'

describe('mapWatchlistPage', () => {
  it('全項目マッピング', () => {
    const watchlistPage: WatchlistPageSchema = {
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
        {
          ticker: 'MSFT',
          is_active: true,
          category_code: 'MEGA_TECH',
          systems: ['DMP'],
          latest_decisions_by_system: {
            DMP: 'NO_SIGNAL',
          },
          updated_at: '2026-04-10T06:15:00+09:00',
        },
      ],
      next_cursor: 'opaque-cursor-example',
    }

    const items = mapWatchlistPage(watchlistPage)

    expect(items).toEqual([
      {
        ticker: 'AAPL',
        systems: ['DMP', 'TGB'],
        isActive: true,
        categoryCode: 'MEGA_TECH',
        latestDecisions: ['BUY', 'NO_SIGNAL'],
        updatedAt: '2026-04-10T06:31:00+09:00',
      },
      {
        ticker: 'MSFT',
        systems: ['DMP'],
        isActive: true,
        categoryCode: 'MEGA_TECH',
        latestDecisions: ['NO_SIGNAL'],
        updatedAt: '2026-04-10T06:15:00+09:00',
      },
    ])
  })

  it('items が空配列なら空配列へ変換する', () => {
    const watchlistPage: WatchlistPageSchema = {
      items: [],
      next_cursor: null,
    }

    expect(mapWatchlistPage(watchlistPage)).toEqual([])
  })

  it('systems に対応する decision がない場合は例外を投げる', () => {
    const watchlistPage: WatchlistPageSchema = {
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

    expect(() => mapWatchlistPage(watchlistPage)).toThrow('TGB')
    expect(() => mapWatchlistPage(watchlistPage)).toThrow('AAPL')
  })
})
