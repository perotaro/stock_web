"""Lambda handler 共通処理。"""

from __future__ import annotations

import logging
from collections.abc import Callable, Mapping
from typing import Any

from lib.errors import AppError
from lib.response import ApiResponseBuilder

logger = logging.getLogger(__name__)


def extract_request_id(event: Mapping[str, Any]) -> str | None:
    """API Gateway event から request id を取得する。

    Args:
        event: Lambda event。

    Returns:
        request id。取得できない場合は None。
    """

    request_context = event.get("requestContext")
    if not isinstance(request_context, dict):
        return None
    request_id = request_context.get("requestId")
    return request_id if isinstance(request_id, str) else None


def handle_json(
    event: Mapping[str, Any],
    response_builder: ApiResponseBuilder,
    action: Callable[[], Mapping[str, Any]],
) -> dict[str, Any]:
    """usecase 実行結果を JSON HTTP response へ変換する。

    Args:
        event: Lambda event。
        response_builder: API response builder。
        action: response body を返す処理。

    Returns:
        API Gateway proxy response。
    """

    request_id = extract_request_id(event)
    try:
        return response_builder.ok(action())
    except AppError as error:
        return response_builder.error(error, request_id)
    except Exception:
        logger.exception("unexpected backend error", extra={"request_id": request_id})
        return response_builder.unexpected_error(request_id)


def model_to_body(model: Any) -> dict[str, Any]:
    """pydantic model を response body へ変換する。

    Args:
        model: `model_dump` を持つ pydantic model。

    Returns:
        JSON 化可能な dict。
    """

    return model.model_dump(mode="json")
