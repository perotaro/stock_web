"""watchlist query parser。"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

from domain.cursor import WatchlistCursorFilters
from domain.watchlist import WatchlistQuery
from lib.errors import InvalidQueryError


class WatchlistQueryParser:
    """watchlist の query parameter を検証する。"""

    def parse(self, raw_query: Mapping[str, str | None] | None) -> WatchlistQuery:
        """query parameter を watchlist query へ変換する。

        Args:
            raw_query: API Gateway event の query parameter。

        Returns:
            既定値補完済みの watchlist query。

        Raises:
            InvalidQueryError: query parameter が不正な場合。
        """

        query = {} if raw_query is None else dict(raw_query)
        is_active = self._parse_bool(query.get("is_active"))
        limit = self._parse_limit(query.get("limit"))
        raw_sort = query.get("sort") or "updated_at_desc"
        if raw_sort != "updated_at_desc":
            raise InvalidQueryError("sort は updated_at_desc を指定してください。")
        sort: Literal["updated_at_desc"] = "updated_at_desc"
        return WatchlistQuery(
            q_ticker=self._empty_to_none(query.get("q_ticker")),
            is_active=True if is_active is None else is_active,
            system_code=self._empty_to_none(query.get("system_code")),
            category_code=self._empty_to_none(query.get("category_code")),
            sort=sort,
            limit=50 if limit is None else limit,
            cursor=self._empty_to_none(query.get("cursor")),
        )

    def to_cursor_filters(self, query: WatchlistQuery) -> WatchlistCursorFilters:
        """watchlist query を cursor filter へ変換する。

        Args:
            query: watchlist API の query。

        Returns:
            cursor 一致検証用 filter。
        """

        return WatchlistCursorFilters(
            is_active=query.is_active,
            system_code=query.system_code,
            category_code=query.category_code,
            q_ticker=query.q_ticker,
            sort=query.sort,
            limit=query.limit,
        )

    def _parse_bool(self, value: str | None) -> bool | None:
        """文字列の boolean query を変換する。

        Args:
            value: query parameter の値。

        Returns:
            boolean または None。

        Raises:
            InvalidQueryError: true / false 以外が指定された場合。
        """

        if value is None or value == "":
            return None
        if value == "true":
            return True
        if value == "false":
            return False
        raise InvalidQueryError("is_active は true または false を指定してください。")

    def _parse_limit(self, value: str | None) -> int | None:
        """limit query を整数へ変換する。

        Args:
            value: query parameter の値。

        Returns:
            1 以上 100 以下の整数または None。

        Raises:
            InvalidQueryError: 整数以外または範囲外が指定された場合。
        """

        if value is None or value == "":
            return None
        try:
            limit = int(value)
        except ValueError as error:
            raise InvalidQueryError(
                "limit は 1 以上 100 以下の整数を指定してください。",
            ) from error
        if limit < 1 or limit > 100:
            raise InvalidQueryError(
                "limit は 1 以上 100 以下の整数を指定してください。"
            )
        return limit

    def _empty_to_none(self, value: str | None) -> str | None:
        """空文字を None へ変換する。

        Args:
            value: query parameter の値。

        Returns:
            空でなければ元の文字列、空なら None。
        """

        if value is None or value == "":
            return None
        return value
