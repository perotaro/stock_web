import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AppSectionNav } from '@/features/app-summary/components/AppSectionNav'
import { WatchlistFilterPanel } from '@/features/watchlist/components/WatchlistFilterPanel'
import { WatchlistResultsPanel } from '@/features/watchlist/components/WatchlistResultsPanel'
import { fetchWatchlistItemsPage } from '@/features/watchlist/api/fetchWatchlistItemsPage'
import { type WatchlistFilterValues } from '@/features/watchlist/types'
import { buildWatchlistQuery } from '@/features/watchlist/api/buildWatchlistQuery'
import { areWatchlistQueriesEqual } from '@/features/watchlist/api/areWatchlistQueriesEqual'

const initWatchlistValues: WatchlistFilterValues = {
  ticker: '',
  systemCode: '',
  categoryCode: '',
  isActive: 'true',
}

/**
 * Watchlist の一覧画面を描画する。
 *
 * @returns 絞り込み条件と結果一覧を配置するページ。
 */
export function WatchlistPage() {
  const [filterValues, setFilterValues] =
    useState<WatchlistFilterValues>(initWatchlistValues)
  const [isApplied, setIsApplied] = useState(false)
  const [appliedQuery, setQuery] = useState(
    buildWatchlistQuery(initWatchlistValues),
  )

  const { data, isPending, isFetchingNextPage, error, fetchNextPage, refetch } =
    useInfiniteQuery({
      queryKey: ['watchlistItems', appliedQuery],
      queryFn: ({ pageParam }) => {
        return fetchWatchlistItemsPage({
          ...appliedQuery,
          ...(pageParam === null ? {} : { cursor: pageParam }),
        })
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    })

  const items = data?.pages.flatMap((page) => page.items) ?? []
  const errorMessage = error === null ? null : String(error)
  const lastPage = data?.pages.at(-1)
  const nextCursor = lastPage?.nextCursor ?? null

  /**
   * フィルタ条件を初期状態へ戻す。
   *
   * @returns なし
   */
  const handleResetFilters = () => {
    setFilterValues(initWatchlistValues)
    setIsApplied(false)
    setQuery(buildWatchlistQuery(initWatchlistValues))
  }

  //初期値からフィルタが変化しているか
  const hasInputFilterChanges =
    filterValues.ticker !== '' ||
    filterValues.systemCode !== '' ||
    filterValues.categoryCode !== '' ||
    filterValues.isActive !== initWatchlistValues.isActive

  // フィルタ条件入力か検索ボタン押下でフィルタリセット可能にする
  const canResetFilters = hasInputFilterChanges || isApplied

  /**
   * フィルタ適用時のイベント制御。
   *
   * @param event submit押下時のイベント
   * @returns なし
   */
  const handleApplyFilters = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsApplied(true)
    setQuery(buildWatchlistQuery(filterValues))
  }

  /**
   * フィルタ条件変更時のイベント制御
   *
   * @param field フィルタの項目名
   * @param value 検索内容
   * @returns なし
   */
  const handleFilterValueChange = (
    field: keyof WatchlistFilterValues,
    value: string,
  ) => {
    setFilterValues({ ...filterValues, [field]: value })
    setIsApplied(false)
  }

  const currentQuery = buildWatchlistQuery(filterValues)
  const isApplyDisabled = areWatchlistQueriesEqual(currentQuery, appliedQuery)

  const hasPendingFilterChanges = !isApplyDisabled

  /**
   * TanStack Query に次ページ取得を依頼する。
   *
   * @returns なし
   */
  const handleLoadMore = () => {
    void fetchNextPage()
  }

  /**
   * エラー表示から現在の query key で Watchlist API を再取得する。
   *
   * @returns なし
   */
  const handleRetry = () => {
    void refetch()
  }

  return (
    <div className="watchlist-page">
      <div className="watchlist-page-head">
        <header className="watchlist-page-header">
          <h1 className="watchlist-page-title">Watchlist</h1>
          <p className="watchlist-page-lead">
            監視対象の銘柄を絞り込み条件付きで確認
          </p>
        </header>
        <AppSectionNav currentSection="Watchlist" />
      </div>

      <WatchlistFilterPanel
        filterValues={filterValues}
        filterHandlers={{
          onTickerChange: (value) => handleFilterValueChange('ticker', value),
          onSystemCodeChange: (value) =>
            handleFilterValueChange('systemCode', value),
          onCategoryCodeChange: (value) =>
            handleFilterValueChange('categoryCode', value),
          onIsActiveChange: (value) =>
            handleFilterValueChange('isActive', value),
        }}
        isResetDisabled={!canResetFilters}
        hasInputFilterChanges={hasInputFilterChanges}
        isApplied={isApplied}
        isApplyDisabled={isApplyDisabled}
        onResetFilters={handleResetFilters}
        onApplyFilters={handleApplyFilters}
      />
      <WatchlistResultsPanel
        items={items}
        nextCursor={nextCursor}
        hasPendingFilterChanges={hasPendingFilterChanges}
        appliedQuery={appliedQuery}
        isLoading={isPending}
        isLoadingMore={isFetchingNextPage}
        errorMessage={errorMessage}
        onLoadMore={handleLoadMore}
        onRetry={handleRetry}
      />
    </div>
  )
}
