"""公開サマリ repository。"""

from __future__ import annotations

from typing import Any, Protocol

from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from domain.public_summary import PublicSummaryItem
from lib.errors import RepositoryError


class PublicSummaryRepository(Protocol):
    """公開サマリ取得 repository の Protocol。"""

    def get_current(self) -> PublicSummaryItem | None:
        """現在の公開サマリを取得する。

        Args:
            なし。

        Returns:
            公開サマリ item。存在しなければ None。
        """

        ...


class DynamoDbPublicSummaryRepository:
    """DynamoDB から公開サマリを取得する repository。"""

    def __init__(self, dynamodb_resource: Any, table_name: str) -> None:
        """repository を初期化する。

        Args:
            dynamodb_resource: boto3 DynamoDB resource。
            table_name: 公開サマリテーブル名。

        Returns:
            なし。
        """

        self._table = dynamodb_resource.Table(table_name)

    def get_current(self) -> PublicSummaryItem | None:
        """現在の公開サマリを取得する。

        Args:
            なし。

        Returns:
            公開サマリ item。存在しなければ None。

        Raises:
            RepositoryError: DynamoDB 取得に失敗した場合。
        """

        try:
            response = self._table.get_item(
                Key={
                    "summary_scope": "PUBLIC",
                    "summary_key": "CURRENT",
                },
            )
        except (BotoCoreError, ClientError) as error:
            raise RepositoryError() from error
        item = response.get("Item")
        if item is None:
            return None
        return PublicSummaryItem.model_validate(item)
