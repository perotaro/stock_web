"""watchlist repository。"""

from __future__ import annotations

import logging
from typing import Any, Protocol

from boto3.dynamodb.conditions import Attr, Key  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from domain.watchlist import (
    WatchlistItem,
    WatchlistRepositoryPage,
    WatchlistRepositoryQuery,
)
from lib.errors import RepositoryError

logger = logging.getLogger(__name__)

WATCHLIST_ACTIVE_UPDATED_AT_INDEX_NAME = "gsi_active_updated_at"


class WatchlistRepository(Protocol):
    """watchlist repository の Protocol。"""

    def get_by_ticker(self, ticker: str) -> WatchlistItem | None:
        """ticker 完全一致で watchlist item を取得する。

        Args:
            ticker: 銘柄コード。

        Returns:
            watchlist item。存在しなければ None。
        """

        ...

    def query_page(self, query: WatchlistRepositoryQuery) -> WatchlistRepositoryPage:
        """条件に一致する watchlist ページを取得する。

        Args:
            query: repository 向け query。

        Returns:
            watchlist のページング結果。
        """

        ...


class DynamoDbWatchlistRepository:
    """DynamoDB から watchlist を取得する repository。"""

    def __init__(self, dynamodb_resource: Any, table_name: str) -> None:
        """repository を初期化する。

        Args:
            dynamodb_resource: boto3 DynamoDB resource。
            table_name: watchlist テーブル名。

        Returns:
            なし。
        """

        self._table = dynamodb_resource.Table(table_name)

    def get_by_ticker(self, ticker: str) -> WatchlistItem | None:
        """ticker 完全一致で watchlist item を取得する。

        Args:
            ticker: 銘柄コード。

        Returns:
            watchlist item。存在しなければ None。

        Raises:
            RepositoryError: DynamoDB 取得に失敗した場合。
        """

        try:
            response = self._table.get_item(Key={"ticker": ticker})
        except (BotoCoreError, ClientError) as error:
            logger.exception(
                "watchlist get_item failed",
                extra={
                    "table_name": self._table.name,
                    "ticker": ticker,
                    "error": extract_dynamodb_error(error),
                },
            )
            raise RepositoryError() from error
        item = response.get("Item")
        if item is None:
            return None
        return WatchlistItem.model_validate(item)

    def query_page(self, query: WatchlistRepositoryQuery) -> WatchlistRepositoryPage:
        """条件に一致する watchlist ページを取得する。

        Args:
            query: repository 向け query。

        Returns:
            watchlist のページング結果。

        Raises:
            RepositoryError: DynamoDB 取得に失敗した場合。
        """

        if query.q_ticker is not None:
            item = self.get_by_ticker(query.q_ticker)
            items = [] if item is None else [item]
            return WatchlistRepositoryPage(
                items=self._filter_items(items, query)[: query.limit],
                last_evaluated_key=None,
            )

        filter_expression = self._build_filter_expression(query)
        kwargs: dict[str, Any] = {
            "IndexName": WATCHLIST_ACTIVE_UPDATED_AT_INDEX_NAME,
            "KeyConditionExpression": Key("is_active").eq(
                format_dynamodb_bool_key(query.is_active),
            ),
            "ScanIndexForward": False,
            "Limit": query.limit,
        }
        if filter_expression is not None:
            kwargs["FilterExpression"] = filter_expression
        if query.exclusive_start_key is not None:
            kwargs["ExclusiveStartKey"] = query.exclusive_start_key

        try:
            response = self._table.query(**kwargs)
        except (BotoCoreError, ClientError) as error:
            logger.exception(
                "watchlist query failed",
                extra={
                    "table_name": self._table.name,
                    "index_name": kwargs["IndexName"],
                    "is_active": query.is_active,
                    "system_code": query.system_code,
                    "category_code": query.category_code,
                    "limit": query.limit,
                    "has_exclusive_start_key": query.exclusive_start_key is not None,
                    "error": extract_dynamodb_error(error),
                },
            )
            raise RepositoryError() from error
        return WatchlistRepositoryPage(
            items=[
                WatchlistItem.model_validate(item) for item in response.get("Items", [])
            ],
            last_evaluated_key=response.get("LastEvaluatedKey"),
        )

    def _build_filter_expression(self, query: WatchlistRepositoryQuery) -> Any | None:
        """DynamoDB filter expression を組み立てる。

        Args:
            query: repository 向け query。

        Returns:
            DynamoDB filter expression。不要な場合は None。
        """

        expression = None
        if query.system_code is not None:
            expression = Attr("systems").contains(query.system_code)
        if query.category_code is not None:
            category_expression = Attr("category_code").eq(query.category_code)
            expression = (
                category_expression
                if expression is None
                else expression & category_expression
            )
        return expression

    def _filter_items(
        self,
        items: list[WatchlistItem],
        query: WatchlistRepositoryQuery,
    ) -> list[WatchlistItem]:
        """GetItem 結果に query 条件を適用する。

        Args:
            items: GetItem で取得した item。
            query: repository 向け query。

        Returns:
            条件に一致する item の一覧。
        """

        filtered = [item for item in items if item.is_active is query.is_active]
        if query.system_code is not None:
            filtered = [item for item in filtered if query.system_code in item.systems]
        if query.category_code is not None:
            filtered = [
                item for item in filtered if item.category_code == query.category_code
            ]
        return filtered


def format_dynamodb_bool_key(value: bool) -> str:
    """DynamoDB の文字列 boolean key 表現へ変換する。

    Args:
        value: boolean 値。

    Returns:
        DynamoDB の GSI partition key に保存されている文字列。
    """

    return "true" if value else "false"


def extract_dynamodb_error(error: Exception) -> dict[str, str]:
    """DynamoDB 例外から安全にログ出力できる情報を取り出す。

    Args:
        error: DynamoDB 操作で発生した例外。

    Returns:
        エラー種別、コード、メッセージを含む dict。
    """

    if isinstance(error, ClientError):
        error_body = error.response.get("Error", {})
        return {
            "type": type(error).__name__,
            "code": str(error_body.get("Code", "")),
            "message": str(error_body.get("Message", "")),
        }
    return {
        "type": type(error).__name__,
        "code": "",
        "message": str(error),
    }
