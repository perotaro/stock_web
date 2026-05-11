import { screen, within } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SystemLatestPage } from '@/pages/app/SystemLatestPage'
import { renderWithProviders } from '@/tests/renderWithProviders'

const systemLatestResponse = {
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
    {
      priority_rank: 2,
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      decision: 'NO_SIGNAL',
      reason: 'Breakout pending',
      run_id: 'DMP-20260410-063000',
    },
    {
      priority_rank: 3,
      ticker: 'NVDA',
      name: 'NVIDIA Corporation',
      decision: 'BUY',
      reason: 'Relative strength improved after consolidation',
      run_id: 'DMP-20260410-063000',
    },
  ],
}

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

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SystemLatestPage', () => {
  it('API の結果からページヘッダ、ナビ、実行メタ、シグナル一覧を表示する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(systemLatestResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderSystemLatestPage()

    expect(
      await screen.findByRole('heading', {
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
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/systems/DMP/latest',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('URL の system_code を API パスに反映する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          ...systemLatestResponse,
          system_code: 'TGB',
          system_name: 'Trend Guard Breakout',
          latest_run_id: null,
          latest_run_at: null,
          signals: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderSystemLatestPage('/app/systems/TGB')

    expect(
      await screen.findByRole('heading', {
        name: 'Trend Guard Breakout',
      }),
    ).toBeVisible()
    expect(screen.getByText('TGB / 最新実行 未実行')).toBeVisible()
    expect(
      screen.getByText('表示できるシグナルがありません'),
    ).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/systems/TGB/latest',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('取得失敗時に再試行付きのエラーを表示する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'not_found',
          message: '対象データが存在しません。',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderSystemLatestPage('/app/systems/UNKNOWN')

    expect(
      await screen.findByText('対象システムが見つかりませんでした。'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '再試行' })).toBeVisible()
  })
})
