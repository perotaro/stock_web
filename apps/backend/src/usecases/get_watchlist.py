"""watchlist 取得 usecase。"""

from __future__ import annotations

from collections.abc import Mapping

from assemblers.watchlist_assembler import WatchlistAssembler
from domain.cursor import WatchlistCursorPayload
from domain.watchlist import (
    WatchlistRepositoryQuery,
    WatchlistResponse,
)
from lib.cursor_codec import CursorCodec
from parsers.watchlist_query_parser import WatchlistQueryParser
from repositories.watchlist_repository import WatchlistRepository


class GetWatchlistUseCase:
    """watchlist API の実行手順を調整する。"""

    def __init__(
        self,
        repository: WatchlistRepository,
        parser: WatchlistQueryParser,
        cursor_codec: CursorCodec,
        assembler: WatchlistAssembler,
    ) -> None:
        """usecase を初期化する。

        Args:
            repository: watchlist repository。
            parser: watchlist query parser。
            cursor_codec: cursor codec。
            assembler: watchlist assembler。

        Returns:
            なし。
        """

        self._repository = repository
        self._parser = parser
        self._cursor_codec = cursor_codec
        self._assembler = assembler

    def execute(self, raw_query: Mapping[str, str | None] | None) -> WatchlistResponse:
        """watchlist を取得する。

        Args:
            raw_query: API Gateway event の query parameter。

        Returns:
            watchlist API response。
        """

        query = self._parser.parse(raw_query)
        filters = self._parser.to_cursor_filters(query)
        exclusive_start_key = None
        if query.cursor is not None:
            cursor_payload = self._cursor_codec.decode(query.cursor)
            self._cursor_codec.assert_filters_match(cursor_payload, filters)
            exclusive_start_key = cursor_payload.exclusive_start_key

        page = self._repository.query_page(
            WatchlistRepositoryQuery(
                q_ticker=query.q_ticker,
                is_active=query.is_active,
                system_code=query.system_code,
                category_code=query.category_code,
                limit=query.limit,
                exclusive_start_key=exclusive_start_key,
            ),
        )
        next_cursor = None
        if page.last_evaluated_key is not None:
            next_cursor = self._cursor_codec.encode(
                WatchlistCursorPayload(
                    exclusive_start_key=page.last_evaluated_key,
                    filters=filters,
                ),
            )
        return self._assembler.assemble(page, next_cursor)
