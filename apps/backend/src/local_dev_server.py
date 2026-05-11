"""ローカル開発用の簡易バックエンドサーバー。"""

from __future__ import annotations

import json
import os
from collections.abc import Mapping
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Literal, TypedDict
from urllib.parse import urlsplit


DEFAULT_PORT = 8080


class PublicSummaryResponse(TypedDict):
    """公開トップ向け匿名集計 API のレスポンス。"""

    operating_days: int
    batch_runs_total: int
    success_rate: float
    avg_duration_sec: float
    updated_at: str


class AppSummaryStatusCountsResponse(TypedDict):
    """認証後トップ向けサマリ件数のレスポンス。"""

    succeeded: int
    failed: int
    not_run: int


class AppSummarySystemResponse(TypedDict):
    """認証後トップ向けシステム別最新状態のレスポンス。"""

    system_code: str
    system_name: str
    latest_status: Literal["SUCCEEDED", "FAILED", "NOT_RUN"]
    latest_run_at: str | None
    updated_at: str


class AppSummaryResponse(TypedDict):
    """認証後トップ向けシステム横断サマリ API のレスポンス。"""

    system_count: int
    latest_run_at: str | None
    status_counts: AppSummaryStatusCountsResponse
    systems: list[AppSummarySystemResponse]


class SystemLatestSignalResponse(TypedDict):
    """システム別最新結果 API のシグナルレスポンス。"""

    priority_rank: int
    ticker: str
    name: str
    decision: str
    reason: str | None
    run_id: str


class SystemLatestResponse(TypedDict):
    """システム別最新結果 API のレスポンス。"""

    system_code: str
    system_name: str
    latest_run_id: str | None
    latest_run_at: str | None
    updated_at: str
    signals: list[SystemLatestSignalResponse]


def build_json_response(body: Mapping[str, Any]) -> bytes:
    """JSON レスポンス本文を組み立てる。

    Args:
        body: JSON 化するレスポンス本文。

    Returns:
        UTF-8 エンコード済みのレスポンス本文。
    """

    return json.dumps(body, ensure_ascii=False).encode("utf-8")


def build_public_summary_response() -> PublicSummaryResponse:
    """公開トップ向け匿名集計レスポンスを返す。

    Args:
        なし。

    Returns:
        ローカル開発用の固定レスポンス。
    """

    return {
        "operating_days": 7,
        "batch_runs_total": 1284,
        "success_rate": 98.4,
        "avg_duration_sec": 12.4,
        "updated_at": "2026-04-10T12:00:00+09:00",
    }


def build_app_summary_response() -> AppSummaryResponse:
    """認証後トップ向けシステム横断サマリレスポンスを返す。

    Args:
        なし。

    Returns:
        ローカル開発用の固定レスポンス。
    """

    return {
        "system_count": 2,
        "latest_run_at": "2026-04-10T06:30:00+09:00",
        "status_counts": {
            "succeeded": 1,
            "failed": 1,
            "not_run": 0,
        },
        "systems": [
            {
                "system_code": "DMP",
                "system_name": "Dynamic Momentum Pullback",
                "latest_status": "SUCCEEDED",
                "latest_run_at": "2026-04-10T06:30:00+09:00",
                "updated_at": "2026-04-10T06:31:00+09:00",
            },
            {
                "system_code": "TGB",
                "system_name": "Trend Guard Breakout",
                "latest_status": "FAILED",
                "latest_run_at": "2026-04-10T06:20:00+09:00",
                "updated_at": "2026-04-10T06:31:00+09:00",
            },
        ],
    }


def build_system_latest_responses() -> dict[str, SystemLatestResponse]:
    """システム別最新結果のローカル開発用データを返す。

    Args:
        なし。

    Returns:
        システムコードをキーにした固定レスポンス。
    """

    return {
        "DMP": {
            "system_code": "DMP",
            "system_name": "Dynamic Momentum Pullback",
            "latest_run_id": "DMP-20260410-063000",
            "latest_run_at": "2026-04-10T06:30:00+09:00",
            "updated_at": "2026-04-10T06:31:00+09:00",
            "signals": [
                {
                    "priority_rank": 1,
                    "ticker": "AAPL",
                    "name": "Apple Inc.",
                    "decision": "BUY",
                    "reason": "EMA20 support and ATR contraction",
                    "run_id": "DMP-20260410-063000",
                },
                {
                    "priority_rank": 2,
                    "ticker": "MSFT",
                    "name": "Microsoft Corporation",
                    "decision": "NO_SIGNAL",
                    "reason": "Breakout pending",
                    "run_id": "DMP-20260410-063000",
                },
                {
                    "priority_rank": 3,
                    "ticker": "NVDA",
                    "name": "NVIDIA Corporation",
                    "decision": "BUY",
                    "reason": "Relative strength improved after consolidation",
                    "run_id": "DMP-20260410-063000",
                },
                {
                    "priority_rank": 4,
                    "ticker": "META",
                    "name": "Meta Platforms Inc.",
                    "decision": "NO_SIGNAL",
                    "reason": "Pullback depth was not sufficient",
                    "run_id": "DMP-20260410-063000",
                },
                {
                    "priority_rank": 5,
                    "ticker": "TSLA",
                    "name": "Tesla Inc.",
                    "decision": "BUY",
                    "reason": "Momentum recovered above the short-term average",
                    "run_id": "DMP-20260410-063000",
                },
            ],
        },
        "TGB": {
            "system_code": "TGB",
            "system_name": "Trend Guard Breakout",
            "latest_run_id": "TGB-20260410-062000",
            "latest_run_at": "2026-04-10T06:20:00+09:00",
            "updated_at": "2026-04-10T06:31:00+09:00",
            "signals": [
                {
                    "priority_rank": 1,
                    "ticker": "AVGO",
                    "name": "Broadcom Inc.",
                    "decision": "BUY",
                    "reason": "Breakout strength remained above the guard band",
                    "run_id": "TGB-20260410-062000",
                },
                {
                    "priority_rank": 2,
                    "ticker": "AMZN",
                    "name": "Amazon.com Inc.",
                    "decision": "NO_SIGNAL",
                    "reason": "Trend guard threshold was not confirmed",
                    "run_id": "TGB-20260410-062000",
                },
                {
                    "priority_rank": 3,
                    "ticker": "GOOGL",
                    "name": "Alphabet Inc.",
                    "decision": "BUY",
                    "reason": "Price held above the breakout confirmation line",
                    "run_id": "TGB-20260410-062000",
                },
                {
                    "priority_rank": 4,
                    "ticker": "JPM",
                    "name": "JPMorgan Chase & Co.",
                    "decision": "NO_SIGNAL",
                    "reason": "Volume expansion remained below the guard rule",
                    "run_id": "TGB-20260410-062000",
                },
                {
                    "priority_rank": 5,
                    "ticker": "LLY",
                    "name": "Eli Lilly and Company",
                    "decision": "BUY",
                    "reason": "Trend continuation was confirmed after consolidation",
                    "run_id": "TGB-20260410-062000",
                },
            ],
        },
    }


def build_system_latest_response(
    system_code: str,
) -> SystemLatestResponse | None:
    """指定されたシステムコードの最新結果レスポンスを返す。

    Args:
        system_code: 取得対象のシステムコード。

    Returns:
        対象があれば固定レスポンス、なければ None。
    """

    return build_system_latest_responses().get(system_code)


def extract_system_latest_code(path: str) -> str | None:
    """システム別最新結果 API の path からシステムコードを取り出す。

    Args:
        path: リクエスト path。

    Returns:
        対象 API の path ならシステムコード、そうでなければ None。
    """

    prefix = "/api/v1/systems/"
    suffix = "/latest"
    if not path.startswith(prefix) or not path.endswith(suffix):
        return None

    system_code = path[len(prefix) : -len(suffix)]
    return system_code or None


class LocalDevRequestHandler(BaseHTTPRequestHandler):
    """ローカル開発用の HTTP リクエストを処理する。"""

    server_version = "GuppyBackendDev/0.1"

    def do_GET(self) -> None:
        """GET リクエストを処理する。

        Returns:
            なし。
        """

        path = urlsplit(self.path).path

        if path == "/healthz":
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "service": "backend_dev",
                    "dynamodb_endpoint_url": os.getenv(
                        "DYNAMODB_ENDPOINT_URL",
                        "http://host.docker.internal:8000",
                    ),
                },
            )
            return

        if path == "/api/v1/public/summary":
            self._send_json(HTTPStatus.OK, build_public_summary_response())
            return

        if path == "/api/v1/summary":
            self._send_json(HTTPStatus.OK, build_app_summary_response())
            return

        system_latest_code = extract_system_latest_code(path)
        if system_latest_code is not None:
            response = build_system_latest_response(system_latest_code)
            if response is None:
                self._send_json(
                    HTTPStatus.NOT_FOUND,
                    {
                        "code": "not_found",
                        "message": "対象データが存在しません。",
                    },
                )
                return

            self._send_json(HTTPStatus.OK, response)
            return

        if path == "/":
            self._send_json(
                HTTPStatus.OK,
                {
                    "service": "backend_dev",
                    "message": "Local backend development server is running.",
                    "public_summary_endpoint": "/api/v1/public/summary",
                },
            )
            return

        self._send_json(
            HTTPStatus.NOT_IMPLEMENTED,
            {
                "message": "Backend API is not implemented yet.",
                "path": path,
            },
        )

    def log_message(self, format: str, *args: object) -> None:
        """アクセスログを標準出力に出す。

        Args:
            format: ログメッセージの書式。
            *args: 書式に埋め込む引数。

        Returns:
            なし。
        """

        print(
            f"[backend_dev] {self.address_string()} - "
            f"{format % args}",
            flush=True,
        )

    def _send_json(self, status: HTTPStatus, body: Mapping[str, Any]) -> None:
        """JSON レスポンスを返す。

        Args:
            status: HTTP ステータス。
            body: レスポンス本文。

        Returns:
            なし。
        """

        payload = build_json_response(body)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def run_server() -> None:
    """ローカル開発用 HTTP サーバーを起動する。

    Returns:
        なし。
    """

    port = int(os.getenv("BACKEND_PORT", str(DEFAULT_PORT)))
    server = ThreadingHTTPServer(("0.0.0.0", port), LocalDevRequestHandler)
    print(
        "[backend_dev] Local backend placeholder server started "
        f"on port {port}.",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    run_server()
