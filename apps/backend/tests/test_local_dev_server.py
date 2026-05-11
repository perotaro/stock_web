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
from typing import cast
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


def test_system_latest_endpoint_returns_dmp_payload() -> None:
    """DMP のシステム別最新結果 API が固定レスポンスを返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(
            base_url,
            "/api/v1/systems/DMP/latest",
        )

    signals = cast(list[dict[str, object]], body["signals"])
    assert status_code == HTTPStatus.OK
    assert body["system_code"] == "DMP"
    assert body["system_name"] == "Dynamic Momentum Pullback"
    assert body["latest_run_id"] == "DMP-20260410-063000"
    assert body["latest_run_at"] == "2026-04-10T06:30:00+09:00"
    assert body["updated_at"] == "2026-04-10T06:31:00+09:00"
    assert len(signals) >= 5
    assert signals[0] == {
        "priority_rank": 1,
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "decision": "BUY",
        "reason": "EMA20 support and ATR contraction",
        "run_id": "DMP-20260410-063000",
    }
    assert [signal["priority_rank"] for signal in signals] == [1, 2, 3, 4, 5]


def test_system_latest_endpoint_returns_tgb_payload() -> None:
    """TGB のシステム別最新結果 API が固定レスポンスを返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(
            base_url,
            "/api/v1/systems/TGB/latest",
        )

    signals = cast(list[dict[str, object]], body["signals"])
    assert status_code == HTTPStatus.OK
    assert body["system_code"] == "TGB"
    assert body["system_name"] == "Trend Guard Breakout"
    assert body["latest_run_id"] == "TGB-20260410-062000"
    assert body["latest_run_at"] == "2026-04-10T06:20:00+09:00"
    assert len(signals) >= 5
    assert signals[0] == {
        "priority_rank": 1,
        "ticker": "AVGO",
        "name": "Broadcom Inc.",
        "decision": "BUY",
        "reason": "Breakout strength remained above the guard band",
        "run_id": "TGB-20260410-062000",
    }
    assert [signal["priority_rank"] for signal in signals] == [1, 2, 3, 4, 5]


def test_system_latest_endpoint_returns_not_found_for_unknown_system() -> None:
    """未知のシステムコードに 404 を返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(
            base_url,
            "/api/v1/systems/UNKNOWN/latest",
        )

    assert status_code == HTTPStatus.NOT_FOUND
    assert body == {
        "code": "not_found",
        "message": "対象データが存在しません。",
    }


def test_watchlist_endpoint_returns_sixty_items() -> None:
    """watchlist API が 60 件分の固定レスポンスを返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(base_url, "/api/v1/watchlist")

    items = body["items"]
    assert status_code == HTTPStatus.OK
    assert isinstance(items, list)
    assert len(items) == 60
    assert body["next_cursor"] is None
    assert items[0] == {
        "ticker": "AAPL",
        "is_active": True,
        "category_code": "MEGA_TECH",
        "systems": ["DMP", "TGB"],
        "latest_decisions_by_system": {
            "DMP": "BUY",
            "TGB": "NO_SIGNAL",
        },
        "updated_at": "2026-04-10T06:31:00+09:00",
    }
    assert items[-1]["ticker"] == "BKNG"
    assert set(items[-1]) == {
        "ticker",
        "is_active",
        "category_code",
        "systems",
        "latest_decisions_by_system",
        "updated_at",
    }


def test_watchlist_endpoint_applies_filter_query_params() -> None:
    """watchlist API が検索条件を反映することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(
            base_url,
            "/api/v1/watchlist?"
            "q_ticker=AAPL&"
            "system_code=DMP&"
            "category_code=MEGA_TECH&"
            "is_active=true&"
            "sort=updated_at_desc&"
            "limit=10",
        )

    assert status_code == HTTPStatus.OK
    assert body["next_cursor"] is None
    assert body["items"] == [
        {
            "ticker": "AAPL",
            "is_active": True,
            "category_code": "MEGA_TECH",
            "systems": ["DMP", "TGB"],
            "latest_decisions_by_system": {
                "DMP": "BUY",
                "TGB": "NO_SIGNAL",
            },
            "updated_at": "2026-04-10T06:31:00+09:00",
        },
    ]


def test_watchlist_endpoint_applies_pagination_query_params() -> None:
    """watchlist API が limit と cursor を反映することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        first_status_code, first_body = request_json(
            base_url,
            "/api/v1/watchlist?is_active=true&sort=updated_at_desc&limit=5",
        )
        second_status_code, second_body = request_json(
            base_url,
            "/api/v1/watchlist?"
            "is_active=true&sort=updated_at_desc&limit=5&cursor=offset:5",
        )

    assert first_status_code == HTTPStatus.OK
    assert first_body["next_cursor"] == "offset:5"
    first_items = cast(list[dict[str, object]], first_body["items"])
    assert [item["ticker"] for item in first_items] == [
        "CAT",
        "NEE",
        "RTX",
        "UBER",
        "PFE",
    ]

    assert second_status_code == HTTPStatus.OK
    assert second_body["next_cursor"] == "offset:10"
    second_items = cast(list[dict[str, object]], second_body["items"])
    assert [item["ticker"] for item in second_items] == [
        "LOW",
        "GS",
        "HON",
        "UNP",
        "AXP",
    ]


def test_watchlist_endpoint_rejects_invalid_query_params() -> None:
    """watchlist API が不正な query parameter を拒否することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with run_test_server() as base_url:
        status_code, body = request_json(
            base_url,
            "/api/v1/watchlist?limit=0",
        )

    assert status_code == HTTPStatus.BAD_REQUEST
    assert body == {
        "code": "invalid_query",
        "message": "limit は 1 以上 100 以下の整数を指定してください。",
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
