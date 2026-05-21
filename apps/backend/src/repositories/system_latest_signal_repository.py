"""システム別最新結果 repository。"""

from __future__ import annotations

from typing import Any, Protocol

from boto3.dynamodb.conditions import Key  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from domain.system_latest import SystemLatestSignalItem
from lib.errors import RepositoryError


class SystemLatestSignalRepository(Protocol):
    """システム別最新結果 repository の Protocol。"""

    def list_by_system_code(self, system_code: str) -> list[SystemLatestSignalItem]:
        """指定システムの最新結果 item を取得する。

        Args:
            system_code: 対象システムコード。

        Returns:
            メタ item と signal item の一覧。
        """

        ...


class DynamoDbSystemLatestSignalRepository:
    """DynamoDB からシステム別最新結果を取得する repository。"""

    def __init__(self, dynamodb_resource: Any, table_name: str) -> None:
        """repository を初期化する。

        Args:
            dynamodb_resource: boto3 DynamoDB resource。
            table_name: システム別最新結果テーブル名。

        Returns:
            なし。
        """

        self._table = dynamodb_resource.Table(table_name)

    def list_by_system_code(self, system_code: str) -> list[SystemLatestSignalItem]:
        """指定システムの最新結果 item を取得する。

        Args:
            system_code: 対象システムコード。

        Returns:
            メタ item と signal item の一覧。

        Raises:
            RepositoryError: DynamoDB 取得に失敗した場合。
        """

        try:
            response = self._table.query(
                KeyConditionExpression=Key("system_code").eq(system_code),
            )
        except (BotoCoreError, ClientError) as error:
            raise RepositoryError() from error
        return [
            SystemLatestSignalItem.model_validate(item)
            for item in response.get("Items", [])
        ]
