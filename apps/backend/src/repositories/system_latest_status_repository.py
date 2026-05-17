"""システム最新状態 repository。"""

from __future__ import annotations

from typing import Any, Protocol

from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from domain.app_summary import SystemLatestStatusItem
from lib.errors import RepositoryError


class SystemLatestStatusRepository(Protocol):
    """システム最新状態 repository の Protocol。"""

    def list_all(self) -> list[SystemLatestStatusItem]:
        """全システムの最新状態を取得する。

        Args:
            なし。

        Returns:
            システム最新状態 item の一覧。
        """

        ...


class DynamoDbSystemLatestStatusRepository:
    """DynamoDB からシステム最新状態を取得する repository。"""

    def __init__(self, dynamodb_resource: Any, table_name: str) -> None:
        """repository を初期化する。

        Args:
            dynamodb_resource: boto3 DynamoDB resource。
            table_name: システム最新状態テーブル名。

        Returns:
            なし。
        """

        self._table = dynamodb_resource.Table(table_name)

    def list_all(self) -> list[SystemLatestStatusItem]:
        """全システムの最新状態を取得する。

        Args:
            なし。

        Returns:
            システム最新状態 item の一覧。

        Raises:
            RepositoryError: DynamoDB 取得に失敗した場合。
        """

        items: list[dict[str, Any]] = []
        exclusive_start_key: dict[str, Any] | None = None
        try:
            while True:
                kwargs: dict[str, Any] = {}
                if exclusive_start_key is not None:
                    kwargs["ExclusiveStartKey"] = exclusive_start_key
                response = self._table.scan(**kwargs)
                items.extend(response.get("Items", []))
                exclusive_start_key = response.get("LastEvaluatedKey")
                if exclusive_start_key is None:
                    break
        except (BotoCoreError, ClientError) as error:
            raise RepositoryError() from error
        return [SystemLatestStatusItem.model_validate(item) for item in items]
