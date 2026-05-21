import { describe, expect, it } from 'vitest'
import { buildWatchlistQuery } from '@/features/watchlist/api/buildWatchlistQuery'

describe('watchlistQuery', () => {
  it('フィルターの値をクエリオブジェクトに変換する', () => {
    const filterObject = {
      ticker: 'AAPL',
      systemCode: 'DMP',
      categoryCode: 'growth',
      isActive: 'true',
    }

    const watchlistQuery = buildWatchlistQuery(filterObject)

    expect(watchlistQuery).toEqual({
      q_ticker: 'AAPL',
      system_code: 'DMP',
      category_code: 'growth',
      is_active: true,
    })
  })
  it('is_activeがFalseの場合を検証する', () => {
    const filterObject = {
      ticker: 'AAPL',
      systemCode: 'DMP',
      categoryCode: 'growth',
      isActive: 'false',
    }

    const watchlistQuery = buildWatchlistQuery(filterObject)

    expect(watchlistQuery).toEqual({
      q_ticker: 'AAPL',
      system_code: 'DMP',
      category_code: 'growth',
      is_active: false,
    })
  })

  it('フィルターの値が空文字の場合を検証する', () => {
    const filterObject = {
      ticker: '',
      systemCode: '',
      categoryCode: '',
      isActive: '',
    }

    const watchlistQuery = buildWatchlistQuery(filterObject)

    expect(watchlistQuery).toEqual({})
  })
})
