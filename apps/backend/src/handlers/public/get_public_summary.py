"""公開サマリ Lambda handler。"""

from __future__ import annotations

from typing import Any

from assemblers.public_summary_assembler import PublicSummaryAssembler
from handlers._shared import handle_json, model_to_body
from lib.response import ApiResponseBuilder
from lib.settings import BackendSettings
from repositories.dynamodb_client import create_dynamodb_resource
from repositories.public_summary_repository import DynamoDbPublicSummaryRepository
from usecases.get_public_summary import GetPublicSummaryUseCase


def build_usecase(settings: BackendSettings | None = None) -> GetPublicSummaryUseCase:
    """公開サマリ usecase を生成する。

    Args:
        settings: バックエンド設定。未指定時は環境変数から読み込む。

    Returns:
        公開サマリ usecase。
    """

    resolved_settings = BackendSettings.from_env() if settings is None else settings
    dynamodb = create_dynamodb_resource(resolved_settings)
    return GetPublicSummaryUseCase(
        repository=DynamoDbPublicSummaryRepository(
            dynamodb,
            resolved_settings.public_summary_table_name,
        ),
        assembler=PublicSummaryAssembler(),
    )


def lambda_handler(event: dict[str, Any], context: object) -> dict[str, Any]:
    """公開サマリ API の Lambda entrypoint。

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
