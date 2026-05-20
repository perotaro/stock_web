export type WatchlistSystemDecision = {
  systemCode: string
  decision: string | null
}

export type WatchlistItem = {
  ticker: string
  categoryCode: string
  systems: readonly string[]
  latestDecisionsBySystem: readonly WatchlistSystemDecision[]
  isActive: boolean
  updatedAt: string
}

export type WatchlistItemsPage = {
  items: WatchlistItem[]
  nextCursor: string | null
}

export type WatchlistFilterValues = {
  ticker: string
  systemCode: string
  categoryCode: string
  isActive: string
}

export type WatchlistResultValues = {
  items: WatchlistItem[]
  nextCursor: string | null
  isLoading: boolean
  isLoadingMore: boolean
  errorMessage: string | null
}

export type WatchlistQuery = {
  q_ticker?: string
  system_code?: string
  category_code?: string
  is_active?: boolean
  limit?: number
  cursor?: string
}
