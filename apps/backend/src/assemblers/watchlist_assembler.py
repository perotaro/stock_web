"""watchlist assembler。"""

from __future__ import annotations

from domain.watchlist import (
    WatchlistItemResponse,
    WatchlistRepositoryPage,
    WatchlistResponse,
)


class WatchlistAssembler:
    """watchlist repository page を API response へ変換する。"""

    def assemble(
        self,
        page: WatchlistRepositoryPage,
        next_cursor: str | None,
    ) -> WatchlistResponse:
        """watchlist response を組み立てる。

        Args:
            page: repository から取得したページ。
            next_cursor: 次ページがある場合の cursor。

        Returns:
            API 契約に沿った watchlist response。
        """

        return WatchlistResponse(
            items=[
                WatchlistItemResponse(
                    ticker=item.ticker,
                    is_active=item.is_active,
                    category_code=item.category_code,
                    systems=item.systems,
                    latest_decisions_by_system=item.latest_decisions_by_system,
                    updated_at=item.updated_at,
                )
                for item in page.items
            ],
            next_cursor=next_cursor,
        )
