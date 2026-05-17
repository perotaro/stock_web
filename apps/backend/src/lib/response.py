"""API Gateway レスポンス生成。"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

from lib.errors import AppError


class ApiResponseBuilder:
    """API Gateway proxy response を生成する。"""

    def __init__(self, allowed_origins: tuple[str, ...] = ()) -> None:
        """レスポンスビルダーを初期化する。

        Args:
            allowed_origins: CORS で許可する origin の一覧。

        Returns:
            なし。
        """

        self._allowed_origins = allowed_origins

    def ok(self, body: Mapping[str, Any]) -> dict[str, Any]:
        """正常系レスポンスを生成する。

        Args:
            body: JSON として返すレスポンス本文。

        Returns:
            API Gateway proxy response。
        """

        return self._build_response(200, dict(body))

    def error(
        self,
        error: AppError,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        """制御可能なエラーレスポンスを生成する。

        Args:
            error: API エラー。
            request_id: リクエスト ID。

        Returns:
            API Gateway proxy response。
        """

        body: dict[str, Any] = {
            "code": error.code,
            "message": error.message,
        }
        if request_id:
            body["request_id"] = request_id
        return self._build_response(error.status_code, body)

    def unexpected_error(self, request_id: str | None = None) -> dict[str, Any]:
        """想定外エラーのレスポンスを生成する。

        Args:
            request_id: リクエスト ID。

        Returns:
            API Gateway proxy response。
        """

        body: dict[str, Any] = {
            "code": "internal_server_error",
            "message": "内部エラーが発生しました。",
        }
        if request_id:
            body["request_id"] = request_id
        return self._build_response(500, body)

    def _build_response(
        self,
        status_code: int,
        body: Mapping[str, Any],
    ) -> dict[str, Any]:
        """共通レスポンスを生成する。

        Args:
            status_code: HTTP ステータスコード。
            body: JSON として返すレスポンス本文。

        Returns:
            API Gateway proxy response。
        """

        headers = {
            "Content-Type": "application/json",
        }
        if len(self._allowed_origins) == 1:
            headers["Access-Control-Allow-Origin"] = self._allowed_origins[0]
        return {
            "statusCode": status_code,
            "headers": headers,
            "body": json.dumps(body, ensure_ascii=False),
        }
