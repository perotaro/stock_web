import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HomePage } from '@/pages/public/HomePage'

/**
 * HomePage を描画する。
 *
 * @returns Testing Library の描画結果。
 */
function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
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

    renderHomePage()

    expect(
      screen.getByRole('heading', {
        name: '日次更新のシグナルを、公開サマリと認証後画面で確認できる。',
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
})
