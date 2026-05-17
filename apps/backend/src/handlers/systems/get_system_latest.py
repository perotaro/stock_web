"""システム別最新結果 Lambda handler。"""

from __future__ import annotations

from typing import Any

from assemblers.system_latest_assembler import SystemLatestAssembler
from handlers._shared import handle_json, model_to_body
from lib.response import ApiResponseBuilder
from lib.settings import BackendSettings
from parsers.system_code_parser import SystemCodeParser
from repositories.dynamodb_client import create_dynamodb_resource
from repositories.system_latest_signal_repository import (
    DynamoDbSystemLatestSignalRepository,
)
from usecases.get_system_latest import GetSystemLatestUseCase


def build_usecase(settings: BackendSettings | None = None) -> GetSystemLatestUseCase:
    """システム別最新結果 usecase を生成する。

    Args:
        settings: バックエンド設定。未指定時は環境変数から読み込む。

    Returns:
        システム別最新結果 usecase。
    """

    resolved_settings = BackendSettings.from_env() if settings is None else settings
    dynamodb = create_dynamodb_resource(resolved_settings)
    return GetSystemLatestUseCase(
        repository=DynamoDbSystemLatestSignalRepository(
            dynamodb,
            resolved_settings.system_latest_signals_table_name,
        ),
        parser=SystemCodeParser(),
        assembler=SystemLatestAssembler(),
    )


def lambda_handler(event: dict[str, Any], context: object) -> dict[str, Any]:
    """システム別最新結果 API の Lambda entrypoint。

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
    path_parameters = event.get("pathParameters")
    system_code = (
        path_parameters.get("system_code")
        if isinstance(path_parameters, dict)
        else None
    )
    return handle_json(
        event,
        response_builder,
        lambda: model_to_body(usecase.execute(system_code)),
    )
