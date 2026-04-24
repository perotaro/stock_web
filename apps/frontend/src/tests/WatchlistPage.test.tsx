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
})
