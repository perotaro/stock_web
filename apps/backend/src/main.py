"""結合確認用 HTTP ルーター。"""

from __future__ import annotations

import json
import os
import uuid
from collections.abc import Callable, Mapping
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, unquote, urlsplit

from handlers.public.get_public_summary import lambda_handler as public_summary_handler
from handlers.summary.get_summary import lambda_handler as app_summary_handler
from handlers.systems.get_system_latest import lambda_handler as system_latest_handler
from handlers.watchlist.get_watchlist import lambda_handler as watchlist_handler

DEFAULT_PORT = 8080

LambdaHandler = Callable[[dict[str, Any], object], dict[str, Any]]

PUBLIC_SUMMARY_HANDLER = public_summary_handler
APP_SUMMARY_HANDLER = app_summary_handler
SYSTEM_LATEST_HANDLER = system_latest_handler
WATCHLIST_HANDLER = watchlist_handler


class IntegrationRequestHandler(BaseHTTPRequestHandler):
    """結合確認用 HTTP リクエストを処理する。"""

    server_version = "GuppyBackendIntegration/0.1"

    def do_GET(self) -> None:
        """GET リクエストを処理する。

        Args:
            なし。

        Returns:
            なし。
        """

        parsed_url = urlsplit(self.path)
        path = parsed_url.path
        query_parameters = parse_single_query_parameters(parsed_url.query)

        if path == "/healthz":
            self._send_json(
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "service": "backend_integration",
                    "dynamodb_endpoint_url": os.getenv("DYNAMODB_ENDPOINT_URL"),
                },
            )
            return

        if path == "/api/v1/public/summary":
            self._handle_lambda(PUBLIC_SUMMARY_HANDLER, path, query_parameters, None)
            return

        if path == "/api/v1/summary":
            self._handle_lambda(APP_SUMMARY_HANDLER, path, query_parameters, None)
            return

        system_code = extract_system_latest_code(path)
        if system_code is not None:
            self._handle_lambda(
                SYSTEM_LATEST_HANDLER,
                path,
                query_parameters,
                {"system_code": system_code},
            )
            return

        if path == "/api/v1/watchlist":
            self._handle_lambda(WATCHLIST_HANDLER, path, query_parameters, None)
            return

        self._send_json(
            HTTPStatus.NOT_FOUND,
            {
                "code": "not_found",
                "message": "対象の API は存在しません。",
                "path": path,
            },
        )

    def _handle_lambda(
        self,
        handler: LambdaHandler,
        path: str,
        query_parameters: dict[str, str] | None,
        path_parameters: dict[str, str] | None,
    ) -> None:
        """HTTP request を Lambda handler に委譲する。

        Args:
            handler: 呼び出す Lambda handler。
            path: リクエスト path。
            query_parameters: API Gateway 互換の query parameter。
            path_parameters: API Gateway 互換の path parameter。

        Returns:
            なし。
        """

        event = build_api_gateway_event(
            path=path,
            headers=extract_headers(self.headers),
            query_parameters=query_parameters,
            path_parameters=path_parameters,
        )
        self._send_lambda_response_safely(handler(event, None))

    def _send_lambda_response_safely(self, response: Mapping[str, Any]) -> None:
        """Lambda proxy response を安全に HTTP response として送信する。

        Args:
            response: Lambda handler が返した proxy response。

        Returns:
            なし。
        """

        try:
            self._send_lambda_response(response)
        except BrokenPipeError:
            self._log_client_disconnected("lambda response")
        except ConnectionResetError:
            self._log_client_disconnected("lambda response")

    def _send_lambda_response(self, response: Mapping[str, Any]) -> None:
        """Lambda proxy response を HTTP response として送信する。

        Args:
            response: Lambda handler が返した proxy response。

        Returns:
            なし。
        """

        status_code = int(response.get("statusCode", HTTPStatus.OK))
        headers = response.get("headers")
        body = response.get("body", "")

        self.send_response(status_code)
        if isinstance(headers, Mapping):
            for name, value in headers.items():
                self.send_header(str(name), str(value))
        if not isinstance(headers, Mapping) or "Content-Type" not in headers:
            self.send_header("Content-Type", "application/json")
        self.end_headers()

        if isinstance(body, bytes):
            payload = body
        else:
            payload = str(body).encode("utf-8")
        try:
            self._write_payload(payload)
        except BrokenPipeError:
            self._log_client_disconnected("json response")
        except ConnectionResetError:
            self._log_client_disconnected("json response")

    def _send_json(self, status_code: HTTPStatus, body: Mapping[str, Any]) -> None:
        """JSON response を送信する。

        Args:
            status_code: HTTP ステータスコード。
            body: JSON として返す response body。

        Returns:
            なし。
        """

        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self._write_payload(payload)

    def _write_payload(self, payload: bytes) -> None:
        """HTTP response body を送信する。

        Args:
            payload: 送信する response body。

        Returns:
            なし。

        Raises:
            BrokenPipeError: クライアントが切断済みの場合。
            ConnectionResetError: クライアント接続が reset された場合。
        """

        self.wfile.write(payload)

    def _log_client_disconnected(self, response_kind: str) -> None:
        """クライアント切断を簡潔に記録する。

        Args:
            response_kind: 送信しようとしていた response の種別。

        Returns:
            なし。
        """

        print(
            f"[backend_integration] client disconnected while writing {response_kind}",
            flush=True,
        )

    def log_message(self, format: str, *args: object) -> None:
        """HTTP server のアクセスログを出力する。

        Args:
            format: ログフォーマット。
            *args: ログフォーマットに埋め込む値。

        Returns:
            なし。
        """

        print(
            f"[backend_integration] {self.address_string()} - {format % args}",
            flush=True,
        )


def build_api_gateway_event(
    path: str,
    headers: dict[str, str],
    query_parameters: dict[str, str] | None,
    path_parameters: dict[str, str] | None,
) -> dict[str, Any]:
    """API Gateway proxy event 互換の dict を組み立てる。

    Args:
        path: リクエスト path。
        headers: リクエストヘッダー。
        query_parameters: query parameter。未指定時は None。
        path_parameters: path parameter。未指定時は None。

    Returns:
        Lambda handler に渡す event。
    """

    return {
        "version": "2.0",
        "routeKey": "GET " + path,
        "rawPath": path,
        "path": path,
        "httpMethod": "GET",
        "headers": headers,
        "queryStringParameters": query_parameters,
        "pathParameters": path_parameters,
        "requestContext": {
            "requestId": f"local-{uuid.uuid4()}",
            "http": {
                "method": "GET",
                "path": path,
            },
        },
        "isBase64Encoded": False,
        "body": None,
    }


def parse_single_query_parameters(query_string: str) -> dict[str, str] | None:
    """query string を API Gateway 互換の単値 dict へ変換する。

    Args:
        query_string: URL の query string。

    Returns:
        query parameter。query が空なら None。
    """

    parsed = parse_qs(query_string, keep_blank_values=True)
    if not parsed:
        return None
    return {name: values[0] if values else "" for name, values in parsed.items()}


def extract_headers(headers: Any) -> dict[str, str]:
    """HTTP headers を通常の dict へ変換する。

    Args:
        headers: HTTP request headers。

    Returns:
        文字列 key/value の header dict。
    """

    return {str(name): str(value) for name, value in headers.items()}


def extract_system_latest_code(path: str) -> str | None:
    """システム別最新結果 API の path から system_code を取り出す。

    Args:
        path: リクエスト path。

    Returns:
        対象 API の path なら system_code、そうでなければ None。
    """

    prefix = "/api/v1/systems/"
    suffix = "/latest"
    if not path.startswith(prefix) or not path.endswith(suffix):
        return None
    system_code = path[len(prefix) : -len(suffix)]
    if not system_code or "/" in system_code:
        return None
    return unquote(system_code)


def run_server() -> None:
    """結合確認用 HTTP server を起動する。

    Args:
        なし。

    Returns:
        なし。
    """

    port = int(os.getenv("BACKEND_PORT", str(DEFAULT_PORT)))
    server = ThreadingHTTPServer(("0.0.0.0", port), IntegrationRequestHandler)
    print(
        f"[backend_integration] Integration backend server started on port {port}.",
        flush=True,
    )
    server.serve_forever()


if __name__ == "__main__":
    run_server()
