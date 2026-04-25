import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { SystemLatestPage } from '@/pages/app/SystemLatestPage'
import { renderWithProviders } from '@/tests/renderWithProviders'

/**
 * システム別最新結果ページをルートパラメータ付きで描画する。
 *
 * @param route 表示対象のテスト用 URL。
 * @returns Testing Library の描画結果。
 */
function renderSystemLatestPage(route = '/app/systems/DMP') {
  return renderWithProviders(
    <Routes>
      <Route path="/app/systems/:system_code" element={<SystemLatestPage />} />
    </Routes>,
    { route },
  )
}

describe('SystemLatestPage', () => {
  it('設計どおりにページヘッダ、ナビ、実行メタ、シグナル一覧を表示する', () => {
    renderSystemLatestPage()

    expect(
      screen.getByRole('heading', {
        name: 'Dynamic Momentum Pullback',
      }),
    ).toBeVisible()
    expect(screen.getByText('DMP / 最新実行 2026/04/10 6:30 JST')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Summary' })).toHaveAttribute(
      'href',
      '/app',
    )
    expect(screen.getByRole('link', { name: 'Watchlist' })).toHaveAttribute(
      'href',
      '/app/watchlist',
    )

    const metadataSection = screen
      .getByRole('heading', { name: '実行メタ' })
      .closest('section')

    expect(metadataSection).not.toBeNull()

    if (!metadataSection) {
      throw new Error('実行メタ section が見つかりません。')
    }

    expect(
      within(metadataSection).getByText('DMP-20260410-063000'),
    ).toBeVisible()
    expect(
      within(metadataSection).getByText('2026/04/10 6:30 JST'),
    ).toBeVisible()
    expect(
      within(metadataSection).getByText('2026/04/10 6:31 JST'),
    ).toBeVisible()

    const signalsSection = screen
      .getByRole('heading', { name: 'シグナル一覧' })
      .closest('section')

    expect(signalsSection).not.toBeNull()

    if (!signalsSection) {
      throw new Error('シグナル一覧 section が見つかりません。')
    }

    expect(
      within(signalsSection).getByRole('heading', { name: 'Apple Inc.' }),
    ).toBeVisible()
    expect(within(signalsSection).getByText('AAPL')).toBeVisible()
    expect(within(signalsSection).getAllByText('BUY')).toHaveLength(2)
    expect(
      within(signalsSection).getByRole('heading', {
        name: 'Microsoft Corporation',
      }),
    ).toBeVisible()
    expect(within(signalsSection).getByText('NO_SIGNAL')).toBeVisible()

    const articles = within(signalsSection).getAllByRole('article')
    expect(articles).toHaveLength(3)

    const topSignal = within(signalsSection).getByRole('article', {
      name: '1. Apple Inc.',
    })

    expect(topSignal).toHaveClass('bg-[color:var(--color-surface)]')
    expect(topSignal).toHaveClass('border-[color:var(--color-accent)]')
    expect(topSignal).not.toHaveClass('bg-[color:var(--color-accent-soft)]')

    expect(articles[0]).toHaveTextContent('Apple Inc.')
    expect(articles[1]).toHaveTextContent('Microsoft Corporation')
    expect(articles[2]).toHaveTextContent('NVIDIA Corporation')
  })

  it('URL の system_code をページヘッダに反映する', () => {
    renderSystemLatestPage('/app/systems/TGB')

    expect(screen.getByText('TGB / 最新実行 2026/04/10 6:30 JST')).toBeVisible()
  })
})
