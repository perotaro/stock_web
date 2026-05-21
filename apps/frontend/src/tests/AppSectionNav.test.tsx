import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppSectionNav } from '@/features/app-summary/components/AppSectionNav'
import { renderWithProviders } from '@/tests/renderWithProviders'

describe('AppSectionNav', () => {
  it('現在セクションをテキスト表示し、他セクションをリンク表示する', () => {
    renderWithProviders(<AppSectionNav currentSection="Watchlist" />, {
      route: '/app/watchlist',
    })

    const navigation = screen.getByRole('navigation', {
      name: 'App sections',
    })

    expect(
      within(navigation).getByRole('link', { name: 'Summary' }),
    ).toHaveAttribute('href', '/app')
    expect(within(navigation).getByText('Watchlist')).toBeVisible()
    expect(
      within(navigation).queryByRole('link', { name: 'Watchlist' }),
    ).not.toBeInTheDocument()
  })

  it('Summary が現在セクションの場合は Watchlist だけをリンク表示する', () => {
    renderWithProviders(<AppSectionNav currentSection="Summary" />, {
      route: '/app',
    })

    const navigation = screen.getByRole('navigation', {
      name: 'App sections',
    })

    expect(within(navigation).getByText('Summary')).toBeVisible()
    expect(
      within(navigation).queryByRole('link', { name: 'Summary' }),
    ).not.toBeInTheDocument()
    expect(
      within(navigation).getByRole('link', { name: 'Watchlist' }),
    ).toHaveAttribute('href', '/app/watchlist')
  })

  it('現在セクションがない場合は全セクションをリンク表示する', () => {
    renderWithProviders(<AppSectionNav />, { route: '/app' })

    const navigation = screen.getByRole('navigation', {
      name: 'App sections',
    })

    expect(
      within(navigation).getByRole('link', { name: 'Summary' }),
    ).toHaveAttribute('href', '/app')
    expect(
      within(navigation).getByRole('link', { name: 'Watchlist' }),
    ).toHaveAttribute('href', '/app/watchlist')
  })
})
