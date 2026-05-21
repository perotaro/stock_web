"""認証後サマリ Lambda handler。"""

from __future__ import annotations

from typing import Any

from assemblers.app_summary_assembler import AppSummaryAssembler
from handlers._shared import handle_json, model_to_body
from lib.response import ApiResponseBuilder
from lib.settings import BackendSettings
from repositories.dynamodb_client import create_dynamodb_resource
from repositories.system_latest_status_repository import (
    DynamoDbSystemLatestStatusRepository,
)
from usecases.get_app_summary import GetAppSummaryUseCase


def build_usecase(settings: BackendSettings | None = None) -> GetAppSummaryUseCase:
    """認証後サマリ usecase を生成する。

    Args:
        settings: バックエンド設定。未指定時は環境変数から読み込む。

    Returns:
        認証後サマリ usecase。
    """

    resolved_settings = BackendSettings.from_env() if settings is None else settings
    dynamodb = create_dynamodb_resource(resolved_settings)
    return GetAppSummaryUseCase(
        repository=DynamoDbSystemLatestStatusRepository(
            dynamodb,
            resolved_settings.system_latest_status_table_name,
        ),
        assembler=AppSummaryAssembler(),
    )


def lambda_handler(event: dict[str, Any], context: object) -> dict[str, Any]:
    """認証後サマリ API の Lambda entrypoint。

    Args:
        event: API Gateway event。
        context: Lambda context。

    Returns:
        API Gateway proxy response。
    """

    del context
    settings = BackendSettings.from_env()
    response_builder = ApiResponseBuilder(settings.allowed_origins)
    usecase = build_usecase(settings)
    return handle_json(
        event,
        response_builder,
        lambda: model_to_body(usecase.execute()),
    )
