"""ローカル開発用サーバーのテスト。"""

from __future__ import annotations

import importlib.util
import json
import threading
from collections.abc import Generator
from contextlib import contextmanager
from http import HTTPStatus
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen


BACKEND_SRC_PATH = Path(__file__).resolve().parents[1] / "src"
LOCAL_DEV_SERVER_MODULE_PATH = BACKEND_SRC_PATH / "local_dev_server.py"
LOCAL_DEV_SERVER_SPEC = importlib.util.spec_from_file_location(
    "local_dev_server",
    LOCAL_DEV_SERVER_MODULE_PATH,
)

if LOCAL_DEV_SERVER_SPEC is None or LOCAL_DEV_SERVER_SPEC.loader is None:
    raise ImportError(
        f"local_dev_server.py を読み込めません: {LOCAL_DEV_SERVER_MODULE_PATH}",
    )

local_dev_server = importlib.util.module_from_spec(LOCAL_DEV_SERVER_SPEC)
LOCAL_DEV_SERVER_SPEC.loader.exec_module(local_dev_server)
LocalDevRequestHandler = local_dev_server.LocalDevRequestHandler


@contextmanager
def run_test_server() -> Generator[str, None, None]:
    """テスト用 HTTP サーバーを起動する。

    Args:
        なし。

    Yields:
        テスト対象サーバーのベース URL。
    """

    server = ThreadingHTTPServer(("127.0.0.1", 0), LocalDevRequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()

    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        server.server_close()
        server_thread.join(timeout=5)


def request_json(base_url: str, path: str) -> tuple[int, dict[str, object]]:
    """JSON レスポンスを取得する。

    Args:
        base_url: テスト対象サーバーのベース URL。
        path: リクエストするパス。

    Returns:
        HTTP ステータスコードと JSON デコード済みレスポンス本文。
    """

    try:
        with urlopen(f"{base_url}{path}") as response:
            status_code = response.status
            payload = response.read()
    except HTTPError as error:
        status_code = error.code
        payload = error.read()

    return status_code, json.loads(payload.decode("utf-8"))


def test_public_summary_endpoint_returns_expected_payload() -> None:
    """公開トップ向け API が固定レスポンスを返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/public/summary")

    assert status_code == HTTPStatus.OK
    assert body == {
        "operating_days": 7,
        "batch_runs_total": 1284,
        "success_rate": 98.4,
        "avg_duration_sec": 12.4,
        "updated_at": "2026-04-10T12:00:00+09:00",
    }


def test_app_summary_endpoint_returns_expected_payload() -> None:
    """認証後トップ向け API が固定レスポンスを返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/summary")

    assert status_code == HTTPStatus.OK
    assert body == {
        "system_count": 3,
        "latest_run_at": "2026-04-10T06:30:00+09:00",
        "status_counts": {
            "succeeded": 1,
            "failed": 1,
            "not_run": 1,
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
            {
                "system_code": "RVS",
                "system_name": "Range Volatility Switch",
                "latest_status": "NOT_RUN",
                "latest_run_at": None,
                "updated_at": "2026-04-10T06:31:00+09:00",
            },
        ],
    }


def test_root_endpoint_points_to_public_summary_api() -> None:
    """ルートが公開トップ向け API を案内することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/")

    assert status_code == HTTPStatus.OK
    assert body == {
        "service": "backend_dev",
        "message": "Local backend development server is running.",
        "public_summary_endpoint": "/api/v1/public/summary",
    }


def test_healthz_endpoint_returns_backend_status() -> None:
    """ヘルスチェックが既存の状態情報を返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/healthz")

    assert status_code == HTTPStatus.OK
    assert body["status"] == "ok"
    assert body["service"] == "backend_dev"
    assert isinstance(body["dynamodb_endpoint_url"], str)


def test_unknown_path_returns_not_implemented() -> None:
    """未実装パスが 501 を返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/unknown")

    assert status_code == HTTPStatus.NOT_IMPLEMENTED
    assert body == {
        "message": "Backend API is not implemented yet.",
        "path": "/api/v1/unknown",
    }
