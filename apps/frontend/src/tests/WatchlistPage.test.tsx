import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WatchlistPage } from '@/pages/app/WatchlistPage'
import { renderWithProviders } from '@/tests/renderWithProviders'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('WatchlistPage', () => {
  it('WatchlistPageのナビが表示される', async () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const navi = screen.getByRole('navigation', { name: 'App sections' })

    expect(navi).toBeVisible()

    expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute(
      'href',
      '/app',
    )

    expect(within(navi).getByText('Watchlist')).toBeVisible()

    expect(
      within(navi).queryByRole('link', { name: 'Watchlist' }),
    ).not.toBeInTheDocument()
  })

  it('WatchlistPageの主要セクションが表示される', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(
      screen.getByRole('heading', {
        name: 'Watchlist',
      }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'フィルタ' })).toBeVisible()
    expect(screen.getByText('updated_at_desc 固定')).toBeVisible()
    expect(screen.getByRole('heading', { name: '結果一覧' })).toBeVisible()
    expect(screen.getByLabelText('Ticker')).toHaveValue('AAPL')
    expect(screen.getByLabelText('System Code')).toHaveValue('DMP')
    expect(screen.getByLabelText('Category Code')).toHaveValue('growth')
    expect(screen.getByLabelText('Active')).toHaveValue('true')

    const aaplCard = screen.getByRole('article', { name: 'AAPL' })

    expect(
      within(aaplCard).getByRole('heading', { name: 'AAPL' }),
    ).toBeVisible()
    expect(within(aaplCard).getByText('active')).toBeVisible()
    expect(within(aaplCard).getByText('growth')).toBeVisible()
    expect(within(aaplCard).getByText('DMP')).toBeVisible()
    expect(within(aaplCard).getByText('TGB')).toBeVisible()
    expect(within(aaplCard).getByText('BUY')).toBeVisible()
    expect(within(aaplCard).getByText('NO_SIGNAL')).toBeVisible()
    expect(within(aaplCard).getByText('2026/04/20 9:05')).toBeVisible()

    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByRole('button', { name: 'さらに読み込む' })).toBeVisible()
  })
})
