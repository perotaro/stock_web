import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppSummaryPage } from '@/pages/app/AppSummaryPage'
import { renderWithProviders } from '@/tests/renderWithProviders'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AppSummaryPage', () => {
  it('認証後サマリ API の結果を表示する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          system_count: 2,
          latest_run_at: '2026-04-10T06:30:00+09:00',
          status_counts: {
            succeeded: 1,
            failed: 1,
            not_run: 0,
          },
          systems: [
            {
              system_code: 'DMP',
              system_name: 'Dynamic Momentum Pullback',
              latest_status: 'SUCCEEDED',
              latest_run_at: '2026-04-10T06:30:00+09:00',
              updated_at: '2026-04-10T06:31:00+09:00',
            },
            {
              system_code: 'TGB',
              system_name: 'Trend Guard Breakout',
              latest_status: 'FAILED',
              latest_run_at: '2026-04-10T06:20:00+09:00',
              updated_at: '2026-04-10T06:31:00+09:00',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<AppSummaryPage />, { route: '/app' })

    expect(
      screen.getByRole('heading', {
        name: 'Summary',
      }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Watchlist' })).toHaveAttribute(
      'href',
      '/app/watchlist',
    )

    const summarySection = (
      await screen.findByRole('heading', {
        name: 'システム横断サマリ',
      })
    ).closest('section')

    expect(summarySection).not.toBeNull()

    if (!summarySection) {
      throw new Error('システム横断サマリ section が見つかりません。')
    }

    expect(await within(summarySection).findByText('システム数')).toBeVisible()
    expect(within(summarySection).getByText('2')).toBeVisible()
    expect(within(summarySection).getByText('全体の最終実行')).toBeVisible()
    expect(
      within(summarySection).getByText('2026/04/10 6:30 JST'),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: 'Dynamic Momentum Pullback',
      }),
    ).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/summary',
      expect.objectContaining({
        method: 'GET',
      }),
    )

    const detailLinks = screen.getAllByRole('link', { name: '詳細を見る' })
    expect(detailLinks).toHaveLength(2)
    expect(detailLinks[0]).toHaveAttribute('href', '/app/systems/DMP')
  })

  it('通信失敗時に再試行付きのエラーを表示する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch'))

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<AppSummaryPage />, { route: '/app' })

    expect(
      await screen.findByText(
        'システム横断サマリを読み込めませんでした。時間をおいて再試行してください。',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: '再試行' })).toBeVisible()
  })

  it('レスポンス不正時に専用エラーを表示する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          system_count: 2,
          latest_run_at: '2026-04-10T06:30:00+09:00',
          systems: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<AppSummaryPage />, { route: '/app' })

    expect(
      await screen.findByText(
        'システム横断サマリの形式が不正です。時間をおいて再試行してください。',
      ),
    ).toBeVisible()
  })

  it('システムが 0 件のとき空状態を表示する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          system_count: 0,
          latest_run_at: null,
          status_counts: {
            succeeded: 0,
            failed: 0,
            not_run: 0,
          },
          systems: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<AppSummaryPage />, { route: '/app' })

    expect(
      await screen.findByText('表示できるシステムがありません'),
    ).toBeVisible()

    const summarySection = screen
      .getByRole('heading', {
        name: 'システム横断サマリ',
      })
      .closest('section')

    expect(summarySection).not.toBeNull()

    if (!summarySection) {
      throw new Error('システム横断サマリ section が見つかりません。')
    }

    expect(within(summarySection).getAllByText('未実行')[0]).toBeVisible()
  })
})
