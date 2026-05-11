import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WatchlistPage } from '@/pages/app/WatchlistPage'
import { renderWithProviders } from '@/tests/renderWithProviders'

const watchlistApiResponse = {
  items: [
    {
      ticker: 'AAPL',
      is_active: true,
      category_code: 'MEGA_TECH',
      systems: ['DMP', 'TGB'],
      latest_decisions_by_system: {
        DMP: 'BUY',
        TGB: 'NO_SIGNAL',
      },
      updated_at: '2026-04-10T06:31:00+09:00',
    },
  ],
  next_cursor: 'cursor-2',
}

/**
 * Watchlist API のモックレスポンスを生成する。
 *
 * @param body API が返す JSON body。
 * @returns fetch mock で返す Response。
 */
function createWatchlistResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Watchlist API の HTTP エラーレスポンスを生成する。
 *
 * @returns fetch mock で返す Response。
 */
function createWatchlistErrorResponse(): Response {
  return new Response(JSON.stringify({ message: 'error' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Watchlist API の成功レスポンスを返す fetch mock を設定する。
 *
 * @param body API が返す JSON body。
 * @returns 設定済み fetch mock。
 */
function stubWatchlistFetch(body: unknown = watchlistApiResponse) {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockImplementation(() => Promise.resolve(createWatchlistResponse(body)))

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

/**
 * Watchlist API の複数ページ分レスポンスを返す fetch mock を設定する。
 *
 * @param bodies API が順番に返す JSON body。
 * @returns 設定済み fetch mock。
 */
function stubWatchlistFetchSequence(bodies: unknown[]) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => {
    const body = bodies.shift()

    return Promise.resolve(createWatchlistResponse(body))
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

beforeEach(() => {
  stubWatchlistFetch()
})

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

  it('WatchlistPageの主要セクションが表示される', async () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(
      screen.getByRole('heading', {
        name: 'Watchlist',
      }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'フィルタ' })).toBeVisible()
    expect(screen.getByText('updated_at_desc 固定で表示')).toBeVisible()
    expect(screen.getByRole('heading', { name: '結果一覧' })).toBeVisible()
    expect(screen.getByLabelText('Ticker')).toHaveValue('')
    expect(screen.getByLabelText('System Code')).toHaveValue('')
    expect(screen.getByLabelText('Category Code')).toHaveValue('')
    expect(screen.getByLabelText('Active')).toHaveValue('true')
    expect(await screen.findAllByRole('article')).toHaveLength(1)

    const aaplCard = screen.getByRole('article', { name: 'AAPL' })

    expect(
      within(aaplCard).getByRole('heading', { name: 'AAPL' }),
    ).toBeVisible()
    expect(within(aaplCard).getByText('active')).toBeVisible()
    expect(within(aaplCard).getByText('MEGA_TECH')).toBeVisible()
    expect(within(aaplCard).getByText('DMP')).toBeVisible()
    expect(within(aaplCard).getByText('TGB')).toBeVisible()
    expect(within(aaplCard).getByText('BUY')).toBeVisible()
    expect(within(aaplCard).getByText('NO_SIGNAL')).toBeVisible()
    expect(
      within(aaplCard).getByText('2026-04-10T06:31:00+09:00'),
    ).toBeVisible()

    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByRole('button', { name: 'さらに読み込む' })).toBeVisible()
  })

  it('初回表示で初期 query を使って Watchlist API を呼ぶ', async () => {
    const fetchMock = stubWatchlistFetch()

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    await screen.findByRole('article', { name: 'AAPL' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/watchlist?is_active=true&sort=updated_at_desc&limit=50',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('読み込み中は loading state を表示する', () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(
      () =>
        new Promise<Response>(() => {
          // pending のままにして loading state を観測する
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(screen.getByText('銘柄一覧を読み込んでいます…')).toBeVisible()
  })

  it('空配列 response なら empty state を表示する', async () => {
    stubWatchlistFetch({
      items: [],
      next_cursor: null,
    })

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(await screen.findByText('表示できる銘柄がありません')).toBeVisible()
  })

  it('不正 response なら error state を表示する', async () => {
    stubWatchlistFetch({
      items: [
        {
          ticker: 'AAPL',
          is_active: true,
          category_code: 'MEGA_TECH',
          systems: ['DMP'],
          latest_decisions_by_system: {
            DMP: 'BUY',
          },
        },
      ],
      next_cursor: null,
    })

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(await screen.findByText(/API レスポンス/)).toBeVisible()
  })

  it('再試行押下で API を再取得し、成功したら銘柄を表示する', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(createWatchlistErrorResponse())
      .mockResolvedValueOnce(createWatchlistErrorResponse())
      .mockResolvedValueOnce(createWatchlistResponse(watchlistApiResponse))

    vi.stubGlobal('fetch', fetchMock)

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(await screen.findByText(/API 呼び出しに失敗/)).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    expect(screen.getByText('銘柄一覧を読み込んでいます…')).toBeVisible()
    expect(await screen.findByRole('article', { name: 'AAPL' })).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/watchlist?is_active=true&sort=updated_at_desc&limit=50',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('フィルタ値を入力して条件あり表示へ切り替えられる', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')
    const systemCodeInput = screen.getByLabelText('System Code')
    const categoryCodeInput = screen.getByLabelText('Category Code')
    const activeSelect = screen.getByLabelText('Active')

    expect(screen.queryByText('フィルタ条件あり')).not.toBeInTheDocument()

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.change(systemCodeInput, { target: { value: 'DMP' } })
    fireEvent.change(categoryCodeInput, { target: { value: 'growth' } })
    fireEvent.change(activeSelect, { target: { value: 'true' } })

    expect(tickerInput).toHaveValue('AAPL')
    expect(systemCodeInput).toHaveValue('DMP')
    expect(categoryCodeInput).toHaveValue('growth')
    expect(activeSelect).toHaveValue('true')
    expect(screen.getByText('フィルタ条件あり')).toBeVisible()
  })

  it('フィルタ値を入力してフィルタ条件を反映予定表示に切り替えられる', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')

    expect(screen.queryByText('フィルタ条件を反映予定')).not.toBeInTheDocument()

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })

    expect(tickerInput).toHaveValue('AAPL')
    expect(screen.getByText('フィルタ条件を反映予定')).toBeVisible()
  })

  it('リセットでフィルタ値を初期状態に戻せる', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')
    const systemCodeInput = screen.getByLabelText('System Code')
    const categoryCodeInput = screen.getByLabelText('Category Code')
    const activeSelect = screen.getByLabelText('Active')
    const resetButton = screen.getByRole('button', { name: 'リセット' })

    expect(resetButton).toBeDisabled()

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.change(systemCodeInput, { target: { value: 'DMP' } })
    fireEvent.change(categoryCodeInput, { target: { value: 'growth' } })
    fireEvent.change(activeSelect, { target: { value: 'true' } })

    expect(resetButton).toBeEnabled()
    expect(screen.getByText('フィルタ条件を反映予定')).toBeVisible()

    fireEvent.click(resetButton)

    expect(tickerInput).toHaveValue('')
    expect(systemCodeInput).toHaveValue('')
    expect(categoryCodeInput).toHaveValue('')
    expect(activeSelect).toHaveValue('true')
    expect(resetButton).toBeDisabled()
    expect(screen.queryByText('フィルタ条件あり')).not.toBeInTheDocument()
    expect(screen.queryByText('フィルタ条件を反映予定')).not.toBeInTheDocument()
  })

  it('Apply後にフィルタを適用しましたが表示される', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')
    const systemCodeInput = screen.getByLabelText('System Code')
    const categoryCodeInput = screen.getByLabelText('Category Code')
    const activeSelect = screen.getByLabelText('Active')
    const applyButton = screen.getByRole('button', { name: '検索' })

    expect(screen.queryByText('フィルタを適用しました')).not.toBeInTheDocument()

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.change(systemCodeInput, { target: { value: 'DMP' } })
    fireEvent.change(categoryCodeInput, { target: { value: 'growth' } })
    fireEvent.change(activeSelect, { target: { value: 'true' } })

    fireEvent.click(applyButton)

    expect(screen.getByText('フィルタを適用しました')).toBeInTheDocument()
  })

  it('初期条件では検索とリセットを無効化する', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const applyButton = screen.getByRole('button', { name: '検索' })
    const resetButton = screen.getByRole('button', { name: 'リセット' })

    expect(applyButton).toBeDisabled()
    expect(resetButton).toBeDisabled()
  })

  it('Apply後に値を変更するとフィルタを適用しましたとが消え、反映予定が表示される', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')
    const systemCodeInput = screen.getByLabelText('System Code')
    const categoryCodeInput = screen.getByLabelText('Category Code')
    const activeSelect = screen.getByLabelText('Active')
    const applyButton = screen.getByRole('button', { name: '検索' })

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.change(systemCodeInput, { target: { value: 'DMP' } })
    fireEvent.change(categoryCodeInput, { target: { value: 'growth' } })
    fireEvent.change(activeSelect, { target: { value: 'true' } })

    fireEvent.click(applyButton)

    expect(screen.queryByText('フィルタ条件を反映予定')).not.toBeInTheDocument()

    fireEvent.change(tickerInput, { target: { value: 'NVDA' } })

    expect(screen.queryByText('フィルタを適用しました')).not.toBeInTheDocument()
    expect(screen.queryByText('フィルタ条件を反映予定')).toBeInTheDocument()
    expect(applyButton).toBeEnabled()
  })

  it('Apply後にリセットすると適用状態とボタン状態を初期化する', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')
    const applyButton = screen.getByRole('button', { name: '検索' })
    const resetButton = screen.getByRole('button', { name: 'リセット' })

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.click(applyButton)

    expect(screen.getByText('フィルタを適用しました')).toBeVisible()
    expect(applyButton).toBeDisabled()
    expect(resetButton).toBeEnabled()

    fireEvent.click(resetButton)

    expect(tickerInput).toHaveValue('')
    expect(screen.queryByText('フィルタ条件あり')).not.toBeInTheDocument()
    expect(screen.queryByText('フィルタを適用しました')).not.toBeInTheDocument()
    expect(screen.queryByText('フィルタ条件を反映予定')).not.toBeInTheDocument()
    expect(applyButton).toBeDisabled()
    expect(resetButton).toBeDisabled()
  })

  it('初回表示時に Active select が true を選択していることを確認する', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const activeSelect = screen.getByLabelText('Active')
    expect(activeSelect).toHaveValue('true')
  })

  it('リセット後も Active select が true に戻ることを確認する', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    const tickerInput = screen.getByLabelText('Ticker')
    const activeSelect = screen.getByLabelText('Active')
    const resetButton = screen.getByRole('button', { name: 'リセット' })

    fireEvent.change(tickerInput, { target: { value: 'AAPL' } })
    fireEvent.click(resetButton)

    expect(activeSelect).toHaveValue('true')
  })

  it('Apply後に現在のフィルタ値から appliedQuery を作る', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    fireEvent.change(screen.getByLabelText('Ticker'), {
      target: { value: 'AAPL' },
    })
    fireEvent.change(screen.getByLabelText('System Code'), {
      target: { value: 'DMP' },
    })
    fireEvent.change(screen.getByLabelText('Category Code'), {
      target: { value: 'growth' },
    })
    fireEvent.change(screen.getByLabelText('Active'), {
      target: { value: 'false' },
    })

    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.queryByText('Ticker: AAPL')).toBeInTheDocument()
    expect(screen.queryByText('Category: growth')).toBeInTheDocument()
    expect(screen.queryByText('System: DMP')).toBeInTheDocument()
    expect(screen.queryByText('Active: false')).toBeInTheDocument()
  })

  it('検索押下で現在のフィルタ値を Watchlist API query に渡す', async () => {
    const fetchMock = stubWatchlistFetch()

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    await screen.findByRole('article', { name: 'AAPL' })

    fireEvent.change(screen.getByLabelText('Ticker'), {
      target: { value: 'AAPL' },
    })
    fireEvent.change(screen.getByLabelText('System Code'), {
      target: { value: 'DMP' },
    })
    fireEvent.change(screen.getByLabelText('Category Code'), {
      target: { value: 'MEGA_TECH' },
    })
    fireEvent.change(screen.getByLabelText('Active'), {
      target: { value: 'false' },
    })

    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    await screen.findByText('Active: false')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/watchlist?q_ticker=AAPL&system_code=DMP&category_code=MEGA_TECH&is_active=false&sort=updated_at_desc&limit=50',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('さらに読み込む押下で next cursor を使って次ページを追記する', async () => {
    const fetchMock = stubWatchlistFetchSequence([
      {
        items: [
          {
            ticker: 'AAPL',
            is_active: true,
            category_code: 'MEGA_TECH',
            systems: ['DMP'],
            latest_decisions_by_system: {
              DMP: 'BUY',
            },
            updated_at: '2026-04-10T06:31:00+09:00',
          },
        ],
        next_cursor: 'cursor-2',
      },
      {
        items: [
          {
            ticker: 'MSFT',
            is_active: true,
            category_code: 'MEGA_TECH',
            systems: ['TGB'],
            latest_decisions_by_system: {
              TGB: 'NO_SIGNAL',
            },
            updated_at: '2026-04-10T06:15:00+09:00',
          },
        ],
        next_cursor: null,
      },
    ])

    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    expect(await screen.findByRole('article', { name: 'AAPL' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'さらに読み込む' }))

    expect(await screen.findByRole('article', { name: 'MSFT' })).toBeVisible()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(
      screen.queryByRole('button', { name: 'さらに読み込む' }),
    ).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/watchlist?is_active=true&sort=updated_at_desc&limit=50&cursor=cursor-2',
      expect.objectContaining({
        method: 'GET',
      }),
    )
  })

  it('Reset後に appliedQuery を初期 query に戻す', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    fireEvent.change(screen.getByLabelText('Ticker'), {
      target: { value: 'AAPL' },
    })
    fireEvent.change(screen.getByLabelText('Active'), {
      target: { value: 'false' },
    })

    fireEvent.click(screen.getByRole('button', { name: '検索' }))
    fireEvent.click(screen.getByRole('button', { name: 'リセット' }))

    expect(screen.queryByText('Ticker: AAPL')).not.toBeInTheDocument()
    expect(screen.queryByText('Active: true')).toBeInTheDocument()
  })

  it('入力変更しただけでは適用済み条件表示は変わらない', () => {
    renderWithProviders(<WatchlistPage />, { route: '/app/watchlist' })

    fireEvent.change(screen.getByLabelText('Ticker'), {
      target: { value: 'AAPL' },
    })
    fireEvent.change(screen.getByLabelText('System Code'), {
      target: { value: 'DMP' },
    })
    fireEvent.change(screen.getByLabelText('Category Code'), {
      target: { value: 'growth' },
    })
    fireEvent.change(screen.getByLabelText('Active'), {
      target: { value: 'false' },
    })

    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(screen.queryByText('Ticker: AAPL')).toBeInTheDocument()
    expect(screen.queryByText('Category: growth')).toBeInTheDocument()
    expect(screen.queryByText('System: DMP')).toBeInTheDocument()
    expect(screen.queryByText('Active: false')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Ticker'), {
      target: { value: 'NVDA' },
    })

    expect(screen.queryByText('Ticker: AAPL')).toBeInTheDocument()
    expect(screen.queryByText('Ticker: NVDA')).not.toBeInTheDocument()
    expect(screen.queryByText('Category: growth')).toBeInTheDocument()
    expect(screen.queryByText('System: DMP')).toBeInTheDocument()
    expect(screen.queryByText('Active: false')).toBeInTheDocument()
  })
})
