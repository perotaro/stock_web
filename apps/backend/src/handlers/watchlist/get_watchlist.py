"""watchlist Lambda handler。"""

from __future__ import annotations

from typing import Any

from assemblers.watchlist_assembler import WatchlistAssembler
from handlers._shared import handle_json, model_to_body
from lib.cursor_codec import CursorCodec
from lib.response import ApiResponseBuilder
from lib.settings import BackendSettings
from parsers.watchlist_query_parser import WatchlistQueryParser
from repositories.dynamodb_client import create_dynamodb_resource
from repositories.watchlist_repository import DynamoDbWatchlistRepository
from usecases.get_watchlist import GetWatchlistUseCase


def build_usecase(settings: BackendSettings | None = None) -> GetWatchlistUseCase:
    """watchlist usecase を生成する。

    Args:
        settings: バックエンド設定。未指定時は環境変数から読み込む。

    Returns:
        watchlist usecase。
    """

    resolved_settings = BackendSettings.from_env() if settings is None else settings
    dynamodb = create_dynamodb_resource(resolved_settings)
    return GetWatchlistUseCase(
        repository=DynamoDbWatchlistRepository(
            dynamodb,
            resolved_settings.watchlist_table_name,
        ),
        parser=WatchlistQueryParser(),
        cursor_codec=CursorCodec(resolved_settings.cursor_signing_secret),
        assembler=WatchlistAssembler(),
    )


def lambda_handler(event: dict[str, Any], context: object) -> dict[str, Any]:
    """watchlist API の Lambda entrypoint。

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
    raw_query = event.get("queryStringParameters")
    return handle_json(
        event,
        response_builder,
        lambda: model_to_body(
            usecase.execute(raw_query if isinstance(raw_query, dict) else None),
        ),
    )
