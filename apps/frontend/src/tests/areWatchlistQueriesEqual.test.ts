import { describe, expect, it } from 'vitest'
import { areWatchlistQueriesEqual } from '@/features/watchlist/api/areWatchlistQueriesEqual'

describe('areWatchlistQueriesEqual', () => {
  it('同じ Watchlist query を同一条件として扱う', () => {
    const left = {
      q_ticker: 'AAPL',
      system_code: 'DMP',
      category_code: 'growth',
      is_active: false,
    }
    const right = {
      system_code: 'DMP',
      is_active: false,
      q_ticker: 'AAPL',
      category_code: 'growth',
    }

    expect(areWatchlistQueriesEqual(left, right)).toBe(true)
  })

  it('is_active の false と undefined を別条件として扱う', () => {
    expect(areWatchlistQueriesEqual({ is_active: false }, {})).toBe(false)
  })

  it('異なる query 値を別条件として扱う', () => {
    expect(
      areWatchlistQueriesEqual(
        { q_ticker: 'AAPL', is_active: true },
        { q_ticker: 'MSFT', is_active: true },
      ),
    ).toBe(false)
  })
})
