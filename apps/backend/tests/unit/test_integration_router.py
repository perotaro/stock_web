"""結合確認用 HTTP ルーターのテスト。"""

from __future__ import annotations

import json
import threading
from collections.abc import Generator
from contextlib import contextmanager
from http import HTTPStatus
from http.server import ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import main


@contextmanager
def run_test_server() -> Generator[str, None, None]:
    """テスト用 HTTP サーバーを起動する。

    Args:
        なし。

    Yields:
        テスト対象サーバーのベース URL。
    """

    server = ThreadingHTTPServer(("127.0.0.1", 0), main.IntegrationRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=5)


def request_json(
    base_url: str,
    path: str,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, Any]]:
    """JSON response を取得する。

    Args:
        base_url: テスト対象サーバーのベース URL。
        path: リクエスト path。
        headers: リクエストヘッダー。

    Returns:
        HTTP ステータスコードと JSON response body。
    """

    request = Request(f"{base_url}{path}", headers=headers or {}, method="GET")
    try:
        with urlopen(request) as response:
            status_code = response.status
            payload = response.read()
    except HTTPError as error:
        status_code = error.code
        payload = error.read()
    return status_code, json.loads(payload.decode("utf-8"))


def build_fake_handler(
    name: str,
    calls: list[dict[str, Any]],
) -> main.LambdaHandler:
    """テスト用 Lambda handler fake を生成する。

    Args:
        name: fake handler 名。
        calls: 呼び出し event を記録する list。

    Returns:
        Lambda handler fake。
    """

    def fake_handler(event: dict[str, Any], context: object) -> dict[str, Any]:
        """Lambda handler fake を実行する。

        Args:
            event: Lambda event。
            context: Lambda context。

        Returns:
            Lambda proxy response。
        """

        del context
        calls.append(event)
        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"handler": name}),
        }

    return fake_handler


def test_healthz_returns_integration_server_status() -> None:
    """healthz が結合用ルーターの状態を返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/healthz")

    assert status_code == HTTPStatus.OK
    assert body["status"] == "ok"
    assert body["service"] == "backend_integration"
    assert "dynamodb_endpoint_url" in body


def test_public_summary_route_delegates_to_lambda_handler(monkeypatch: Any) -> None:
    """公開サマリ route が Lambda handler に委譲されることを確認する。

    Args:
        monkeypatch: pytest の monkeypatch fixture。

    Returns:
        なし。
    """

    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        main,
        "PUBLIC_SUMMARY_HANDLER",
        build_fake_handler("public_summary", calls),
    )

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/public/summary")

    assert status_code == HTTPStatus.OK
    assert body == {"handler": "public_summary"}
    assert calls[0]["path"] == "/api/v1/public/summary"
    assert calls[0]["queryStringParameters"] is None
    assert calls[0]["pathParameters"] is None


def test_app_summary_route_delegates_to_lambda_handler(monkeypatch: Any) -> None:
    """認証後サマリ route が Lambda handler に委譲されることを確認する。

    Args:
        monkeypatch: pytest の monkeypatch fixture。

    Returns:
        なし。
    """

    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        main,
        "APP_SUMMARY_HANDLER",
        build_fake_handler("app_summary", calls),
    )

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/summary")

    assert status_code == HTTPStatus.OK
    assert body == {"handler": "app_summary"}
    assert calls[0]["path"] == "/api/v1/summary"


def test_system_latest_route_passes_system_code(monkeypatch: Any) -> None:
    """システム別最新結果 route が system_code を渡すことを確認する。

    Args:
        monkeypatch: pytest の monkeypatch fixture。

    Returns:
        なし。
    """

    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        main,
        "SYSTEM_LATEST_HANDLER",
        build_fake_handler("system_latest", calls),
    )

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/systems/DMP/latest")

    assert status_code == HTTPStatus.OK
    assert body == {"handler": "system_latest"}
    assert calls[0]["path"] == "/api/v1/systems/DMP/latest"
    assert calls[0]["pathParameters"] == {"system_code": "DMP"}


def test_watchlist_route_passes_query_parameters(monkeypatch: Any) -> None:
    """watchlist route が query parameter を渡すことを確認する。

    Args:
        monkeypatch: pytest の monkeypatch fixture。

    Returns:
        なし。
    """

    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        main,
        "WATCHLIST_HANDLER",
        build_fake_handler("watchlist", calls),
    )

    with run_test_server() as base_url:
        status_code, body = request_json(
            base_url,
            "/api/v1/watchlist?limit=10&is_active=true&q_ticker=AAPL",
        )

    assert status_code == HTTPStatus.OK
    assert body == {"handler": "watchlist"}
    assert calls[0]["path"] == "/api/v1/watchlist"
    assert calls[0]["queryStringParameters"] == {
        "limit": "10",
        "is_active": "true",
        "q_ticker": "AAPL",
    }


def test_route_passes_request_headers(monkeypatch: Any) -> None:
    """route が request header を event に渡すことを確認する。

    Args:
        monkeypatch: pytest の monkeypatch fixture。

    Returns:
        なし。
    """

    calls: list[dict[str, Any]] = []
    monkeypatch.setattr(
        main,
        "WATCHLIST_HANDLER",
        build_fake_handler("watchlist", calls),
    )

    with run_test_server() as base_url:
        status_code, _body = request_json(
            base_url,
            "/api/v1/watchlist",
            headers={"Authorization": "Bearer local-token"},
        )

    assert status_code == HTTPStatus.OK
    assert calls[0]["headers"]["Authorization"] == "Bearer local-token"


def test_unknown_path_returns_json_not_found() -> None:
    """未定義 path が JSON の 404 を返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/unknown")

    assert status_code == HTTPStatus.NOT_FOUND
    assert body == {
        "code": "not_found",
        "message": "対象の API は存在しません。",
        "path": "/api/v1/unknown",
    }


def test_lambda_response_write_broken_pipe_is_logged(monkeypatch: Any) -> None:
    """Lambda response 送信時の BrokenPipeError が traceback にならないことを確認する。

    Args:
        monkeypatch: pytest の monkeypatch fixture。

    Returns:
        なし。
    """

    handler = object.__new__(main.IntegrationRequestHandler)
    logs: list[str] = []

    def raise_broken_pipe(response: dict[str, Any]) -> None:
        """BrokenPipeError を送出する。

        Args:
            response: Lambda proxy response。

        Returns:
            なし。

        Raises:
            BrokenPipeError: 常に送出する。
        """

        del response
        raise BrokenPipeError

    def record_log(response_kind: str) -> None:
        """切断ログを記録する。

        Args:
            response_kind: response の種別。

        Returns:
            なし。
        """

        logs.append(response_kind)

    monkeypatch.setattr(handler, "_send_lambda_response", raise_broken_pipe)
    monkeypatch.setattr(handler, "_log_client_disconnected", record_log)

    handler._send_lambda_response_safely({"statusCode": 200, "body": "{}"})

    assert logs == ["lambda response"]
