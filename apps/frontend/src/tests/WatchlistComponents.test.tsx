import { fireEvent, render, screen, within } from '@testing-library/react'
import { type ComponentProps, type SubmitEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { WatchlistFilterPanel } from '@/features/watchlist/components/WatchlistFilterPanel'
import {
  ActivePill,
  CodePill,
  DecisionPill,
} from '@/features/watchlist/components/WatchlistPills'
import { WatchlistResultCard } from '@/features/watchlist/components/WatchlistResultCard'
import { WatchlistResultsPanel } from '@/features/watchlist/components/WatchlistResultsPanel'
import {
  type WatchlistFilterValues,
  type WatchlistItem,
  type WatchlistQuery,
} from '@/features/watchlist/types'

const defaultFilterValues: WatchlistFilterValues = {
  ticker: 'AAPL',
  systemCode: 'DMP',
  categoryCode: 'growth',
  isActive: 'true',
}

const activeWatchlistItem: WatchlistItem = {
  ticker: 'AAPL',
  categoryCode: 'growth',
  systems: ['DMP', 'TGB'],
  latestDecisionsBySystem: [
    { systemCode: 'DMP', decision: 'BUY' },
    { systemCode: 'TGB', decision: 'NO_SIGNAL' },
  ],
  isActive: true,
  updatedAt: '2026/04/20 9:05',
}

const inactiveWatchlistItem: WatchlistItem = {
  ticker: 'TSLA',
  categoryCode: 'speculative',
  systems: ['RSI', 'DMP'],
  latestDecisionsBySystem: [
    { systemCode: 'RSI', decision: 'SELL' },
    { systemCode: 'DMP', decision: null },
  ],
  isActive: false,
  updatedAt: '2026/04/20 9:01',
}

const watchlistItems: WatchlistItem[] = [
  activeWatchlistItem,
  inactiveWatchlistItem,
]

const watchlistItemsEmpty: WatchlistItem[] = []

const watchlistQueryInit: WatchlistQuery = {
  is_active: true,
}

const appliedWatchlistQuery: WatchlistQuery = {
  q_ticker: 'AAPL',
  category_code: 'growth',
  system_code: 'DMP',
  is_active: false,
}

/**
 * WatchlistFilterPanel をテスト用の標準 props で描画する。
 *
 * @param overrides props の上書き値。
 * @returns 描画結果とイベントハンドラー。
 */
function renderWatchlistFilterPanel(
  overrides: Partial<ComponentProps<typeof WatchlistFilterPanel>> = {},
) {
  const filterHandlers = {
    onTickerChange: vi.fn(),
    onSystemCodeChange: vi.fn(),
    onCategoryCodeChange: vi.fn(),
    onIsActiveChange: vi.fn(),
  }
  const onResetFilters = vi.fn()
  const onApplyFilters = vi.fn((event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
  })

  const props: ComponentProps<typeof WatchlistFilterPanel> = {
    filterValues: defaultFilterValues,
    filterHandlers,
    isResetDisabled: false,
    hasInputFilterChanges: true,
    isApplied: false,
    isApplyDisabled: false,
    onResetFilters,
    onApplyFilters,
    ...overrides,
  }

  return {
    filterHandlers,
    onResetFilters,
    onApplyFilters,
    ...render(<WatchlistFilterPanel {...props} />),
  }
}

describe('WatchlistFilterPanel', () => {
  it('受け取ったフィルタ値と状態を表示する', () => {
    renderWatchlistFilterPanel({
      isApplied: true,
      isApplyDisabled: true,
    })

    expect(screen.getByRole('heading', { name: 'フィルタ' })).toBeVisible()
    expect(screen.getByText('updated_at_desc 固定で表示')).toBeVisible()
    expect(screen.getByLabelText('Ticker')).toHaveValue('AAPL')
    expect(screen.getByLabelText('System Code')).toHaveValue('DMP')
    expect(screen.getByLabelText('Category Code')).toHaveValue('growth')
    expect(screen.getByLabelText('Active')).toHaveValue('true')
    expect(screen.getByText('フィルタ条件あり')).toBeVisible()
    expect(screen.getByText('フィルタを適用しました')).toBeVisible()
    expect(screen.getByRole('button', { name: '検索' })).toBeDisabled()
  })

  it('操作ボタンを状態表示とは別の固定領域に表示する', () => {
    renderWatchlistFilterPanel({
      hasInputFilterChanges: false,
      isApplied: false,
      isResetDisabled: true,
    })

    const form = screen.getByRole('form', { name: 'Watchlist filters' })
    const actions = form.querySelector('.watchlist-filter-actions')
    const status = form.querySelector('.watchlist-filter-status')

    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'リセット' }),
    )
    expect(actions).toContainElement(
      screen.getByRole('button', { name: '検索' }),
    )
    expect(status).toBeInTheDocument()
    expect(
      form.querySelector('.watchlist-filter-grid .watchlist-filter-button'),
    ).not.toBeInTheDocument()
  })

  it('フィルタ操作を親コンポーネントへ通知する', () => {
    const { filterHandlers, onApplyFilters, onResetFilters } =
      renderWatchlistFilterPanel()

    fireEvent.change(screen.getByLabelText('Ticker'), {
      target: { value: 'NVDA' },
    })
    fireEvent.change(screen.getByLabelText('System Code'), {
      target: { value: 'TGB' },
    })
    fireEvent.change(screen.getByLabelText('Category Code'), {
      target: { value: 'core' },
    })
    fireEvent.change(screen.getByLabelText('Active'), {
      target: { value: 'false' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'リセット' }))
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    expect(filterHandlers.onTickerChange).toHaveBeenCalledWith('NVDA')
    expect(filterHandlers.onSystemCodeChange).toHaveBeenCalledWith('TGB')
    expect(filterHandlers.onCategoryCodeChange).toHaveBeenCalledWith('core')
    expect(filterHandlers.onIsActiveChange).toHaveBeenCalledWith('false')
    expect(onResetFilters).toHaveBeenCalledTimes(1)
    expect(onApplyFilters).toHaveBeenCalledTimes(1)
  })

  it('フィルタ条件と適用状態がない場合は補助表示を出さない', () => {
    renderWatchlistFilterPanel({
      filterValues: {
        ticker: '',
        systemCode: '',
        categoryCode: '',
        isActive: '',
      },
      hasInputFilterChanges: false,
      isApplied: false,
      isResetDisabled: true,
    })

    expect(screen.queryByText('フィルタ条件あり')).not.toBeInTheDocument()
    expect(screen.queryByText('フィルタを適用しました')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'リセット' })).toBeDisabled()
  })
})

describe('WatchlistResultsPanel', () => {
  it('結果カード、表、読み込みボタンを表示する', () => {
    render(
      <WatchlistResultsPanel
        items={watchlistItems}
        nextCursor="next-cursor"
        hasPendingFilterChanges={false}
        appliedQuery={watchlistQueryInit}
        errorMessage={null}
        isLoading={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: '結果一覧' })).toBeVisible()
    expect(screen.getByText('適用済み条件')).toBeVisible()
    expect(screen.getByText('Active: true')).toBeVisible()
    expect(screen.queryByText('フィルタ条件を反映予定')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('article', { name: 'AAPL' })).toBeVisible()
    expect(screen.getByRole('article', { name: 'TSLA' })).toBeVisible()
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Ticker' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Active' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'さらに読み込む' })).toBeVisible()
  })

  it('表に各 Watchlist item の値を表示する', () => {
    render(
      <WatchlistResultsPanel
        items={watchlistItems}
        nextCursor="next-cursor"
        hasPendingFilterChanges={true}
        appliedQuery={watchlistQueryInit}
        errorMessage={null}
        isLoading={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('フィルタ条件を反映予定')).toBeVisible()
    const rows = screen.getAllByRole('row')
    const tslaRow = rows.find((row) => within(row).queryByText('TSLA'))

    expect(tslaRow).toBeDefined()
    expect(within(tslaRow as HTMLElement).getByText('inactive')).toBeVisible()
    expect(
      within(tslaRow as HTMLElement).getByText('speculative'),
    ).toBeVisible()
    expect(within(tslaRow as HTMLElement).getByText('RSI')).toBeVisible()
    expect(within(tslaRow as HTMLElement).getByText('SELL')).toBeVisible()
    expect(
      within(tslaRow as HTMLElement).getByText('2026/04/20 9:01'),
    ).toBeVisible()
  })

  it('適用済み query の条件を表示する', () => {
    render(
      <WatchlistResultsPanel
        items={watchlistItems}
        nextCursor="next-cursor"
        hasPendingFilterChanges={false}
        appliedQuery={appliedWatchlistQuery}
        errorMessage={null}
        isLoading={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    )

    expect(screen.getByText('適用済み条件')).toBeVisible()
    expect(screen.getByText('Ticker: AAPL')).toBeVisible()
    expect(screen.getByText('Category: growth')).toBeVisible()
    expect(screen.getByText('System: DMP')).toBeVisible()
    expect(screen.getByText('Active: false')).toBeVisible()
  })

  it('ロード画面を表示する', () => {
    render(
      <WatchlistResultsPanel
        items={watchlistItemsEmpty}
        nextCursor={null}
        hasPendingFilterChanges={false}
        appliedQuery={watchlistQueryInit}
        errorMessage={null}
        isLoading={true}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: '結果一覧' })).toBeVisible()
    expect(screen.getByText('適用済み条件')).toBeVisible()
    expect(screen.getByText('銘柄一覧を読み込んでいます…')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('ロードエラー画面を表示する', () => {
    const onRetry = vi.fn()

    render(
      <WatchlistResultsPanel
        items={watchlistItemsEmpty}
        nextCursor={null}
        hasPendingFilterChanges={false}
        appliedQuery={watchlistQueryInit}
        errorMessage="タイムアウト。ロードに失敗"
        isLoading={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onRetry={onRetry}
      />,
    )
    expect(screen.getByRole('heading', { name: '結果一覧' })).toBeVisible()
    expect(screen.getByText('適用済み条件')).toBeVisible()
    expect(screen.getByText('読み込み失敗')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '再試行' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('empty画面を表示する', () => {
    render(
      <WatchlistResultsPanel
        items={watchlistItemsEmpty}
        nextCursor={null}
        hasPendingFilterChanges={false}
        appliedQuery={watchlistQueryInit}
        errorMessage={null}
        isLoading={false}
        isLoadingMore={false}
        onLoadMore={vi.fn()}
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: '結果一覧' })).toBeVisible()
    expect(screen.getByText('適用済み条件')).toBeVisible()
    expect(screen.getByText('表示できる銘柄がありません')).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('WatchlistResultCard', () => {
  it('1銘柄分の詳細をカードに表示する', () => {
    render(<WatchlistResultCard item={inactiveWatchlistItem} />)

    const card = screen.getByRole('article', { name: 'TSLA' })

    expect(within(card).getByRole('heading', { name: 'TSLA' })).toBeVisible()
    expect(within(card).getByText('inactive')).toBeVisible()
    expect(within(card).getByText('speculative')).toBeVisible()
    expect(within(card).getByText('RSI')).toBeVisible()
    expect(within(card).getByText('SELL')).toBeVisible()
    expect(within(card).getByText('DMP:')).toBeVisible()
    expect(within(card).getByText('未判定')).toBeVisible()
    expect(within(card).getByText('2026/04/20 9:01')).toBeVisible()
  })
})

describe('WatchlistPills', () => {
  it('システムコードのラベルを表示する', () => {
    render(<CodePill label="DMP" />)

    expect(screen.getByText('DMP')).toHaveClass('watchlist-code-pill')
  })

  it('判定結果ごとの tone クラスを表示する', () => {
    render(
      <>
        <DecisionPill decision="BUY" />
        <DecisionPill decision="NO_SIGNAL" />
        <DecisionPill decision="SELL" />
        <DecisionPill decision={null} />
      </>,
    )

    expect(screen.getByText('BUY')).toHaveClass(
      'watchlist-decision-pill--success',
    )
    expect(screen.getByText('NO_SIGNAL')).toHaveClass(
      'watchlist-decision-pill--info',
    )
    expect(screen.getByText('SELL')).toHaveClass(
      'watchlist-decision-pill--warning',
    )
    expect(screen.getByText('未判定')).toHaveClass(
      'watchlist-decision-pill--warning',
    )
  })

  it('active 状態を表示用ラベルへ変換する', () => {
    render(
      <>
        <ActivePill isActive={true} />
        <ActivePill isActive={false} />
      </>,
    )

    expect(screen.getByText('active')).toHaveClass('watchlist-active-pill')
    expect(screen.getByText('inactive')).toHaveClass('watchlist-active-pill')
  })
})
