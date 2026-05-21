import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/public/HomePage'
import { renderWithProviders } from '@/tests/renderWithProviders'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('公開サマリ API の結果を表示する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          operating_days: 7,
          batch_runs_total: 1284,
          success_rate: 98.4,
          avg_duration_sec: 12.4,
          updated_at: '2026-04-10T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<HomePage />)

    expect(
      screen.getByRole('heading', {
        name: '売買判断を、感覚ではなく戦略で。',
      }),
    ).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'ログインして詳細を見る' }),
    ).not.toBeInTheDocument()

    expect(await screen.findByText('7日')).toBeVisible()
    expect(screen.getByText('1,284')).toBeVisible()
    expect(screen.getByText('98.4%')).toBeVisible()
    expect(screen.getByText('12.4 秒')).toBeVisible()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/public/summary',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('公開サマリを読み込めませんでした。\
    時間をおいて再試行してください。 が画面に出ることを確認する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError('Failed to fetch'))

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<HomePage />)

    expect(
      await screen.findByText(
        '公開サマリを読み込めませんでした。時間をおいて再試行してください。',
      ),
    ).toBeVisible()
  })

  it('公開サマリの形式が不正です。\
    時間をおいて再試行してください。 が画面に出ることを確認する', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          operating_days: 7,
          batch_runs_total: 1284,
          success_rate: 98.4,
          updated_at: '2026-04-10T00:00:00Z',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<HomePage />)

    expect(
      await screen.findByText(
        '公開サマリの形式が不正です。時間をおいて再試行してください。',
      ),
    ).toBeVisible()
  })
})
