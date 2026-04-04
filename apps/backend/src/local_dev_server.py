"""ローカル開発用の簡易バックエンドサーバー。"""

from __future__ import annotations

import json
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any


DEFAULT_PORT = 8080


def build_json_response(body: dict[str, Any]) -> bytes:
    """JSON レスポンス本文を組み立てる。

    Args:
        body: JSON 化するレスポンス本文。

    Returns:
        UTF-8 エンコード済みのレスポンス本文。
    """

    return json.dumps(body, ensure_ascii=False).encode("utf-8")


class LocalDevRequestHandler(BaseHTTPRequestHandler):
    """ローカル開発用の HTTP リクエストを処理する。"""

    server_version = "GuppyBackendDev/0.1"

    def do_GET(self) -> None:
        """GET リクエストを処理する。

        Returns:
            なし。
        """

        if self.path == "/healthz":
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

        if self.path == "/":
            self._send_json(
                HTTPStatus.OK,
                {
                    "service": "backend_dev",
                    "message": "Local backend placeholder server is running.",
                    "next_step": "Replace apps/backend/src/local_dev_server.py with the real local entrypoint when backend handlers are implemented.",
                },
            )
            return

        self._send_json(
            HTTPStatus.NOT_IMPLEMENTED,
            {
                "message": "Backend API is not implemented yet.",
                "path": self.path,
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

    def _send_json(self, status: HTTPStatus, body: dict[str, Any]) -> None:
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
