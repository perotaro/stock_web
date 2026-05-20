"""バックエンド本実装の中核テスト。"""

from __future__ import annotations

import base64
import json
from decimal import Decimal
from typing import Any

import pytest

from assemblers.app_summary_assembler import AppSummaryAssembler
from assemblers.public_summary_assembler import PublicSummaryAssembler
from domain.app_summary import SystemLatestStatusItem
from domain.cursor import WatchlistCursorPayload
from domain.public_summary import PublicSummaryItem
from domain.watchlist import WatchlistItem, WatchlistRepositoryPage
from handlers._shared import handle_json
from lib.cursor_codec import CursorCodec
from lib.errors import InvalidCursorError, InvalidQueryError
from lib.response import ApiResponseBuilder
from lib.settings import BackendSettings, SettingsError
from parsers.watchlist_query_parser import WatchlistQueryParser
from repositories.watchlist_repository import (
    extract_dynamodb_error,
    format_dynamodb_bool_key,
)
from usecases.get_public_summary import GetPublicSummaryUseCase


class FakePublicSummaryRepository:
    """公開サマリ repository fake。"""

    def __init__(self, item: PublicSummaryItem | None) -> None:
        """fake を初期化する。

        Args:
            item: repository が返す item。

        Returns:
            なし。
        """

        self._item = item

    def get_current(self) -> PublicSummaryItem | None:
        """現在の公開サマリを返す。

        Args:
            なし。

        Returns:
            初期化時に渡された item。
        """

        return self._item


def test_public_summary_usecase_converts_success_rate_to_percent() -> None:
    """公開サマリ API が success_rate を百分率へ変換することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    usecase = GetPublicSummaryUseCase(
        repository=FakePublicSummaryRepository(
            PublicSummaryItem(
                operating_days=18,
                batch_runs_total=1345,
                success_rate=0.9444,
                avg_duration_sec=87.2,
                updated_at="2026-02-28T12:00:00+09:00",
            ),
        ),
        assembler=PublicSummaryAssembler(),
    )

    response = usecase.execute()

    assert response.success_rate == 94.44
    assert response.model_dump(mode="json") == {
        "operating_days": 18,
        "batch_runs_total": 1345,
        "success_rate": 94.44,
        "avg_duration_sec": 87.2,
        "updated_at": "2026-02-28T12:00:00+09:00",
    }


def test_app_summary_assembler_counts_status_and_latest_run_at() -> None:
    """認証後サマリ assembler が件数と最新実行日時を算出することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    response = AppSummaryAssembler().assemble(
        [
            SystemLatestStatusItem(
                system_code="DMP",
                system_name="Dynamic Momentum Pullback",
                latest_status="SUCCEEDED",
                latest_run_at="2026-02-28T06:30:00+09:00",
                updated_at="2026-02-28T06:31:00+09:00",
            ),
            SystemLatestStatusItem(
                system_code="TGB",
                system_name="Trend Guard Breakout",
                latest_status="NOT_RUN",
                latest_run_at=None,
                updated_at="2026-02-28T06:31:00+09:00",
            ),
        ],
    )

    assert response.system_count == 2
    assert response.latest_run_at == "2026-02-28T06:30:00+09:00"
    assert response.status_counts.succeeded == 1
    assert response.status_counts.failed == 0
    assert response.status_counts.not_run == 1


def test_watchlist_query_parser_applies_defaults() -> None:
    """watchlist query parser が既定値を補完することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    query = WatchlistQueryParser().parse(None)

    assert query.is_active is True
    assert query.sort == "updated_at_desc"
    assert query.limit == 50
    assert query.q_ticker is None


def test_watchlist_query_parser_rejects_invalid_limit() -> None:
    """watchlist query parser が不正な limit を拒否することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with pytest.raises(InvalidQueryError):
        WatchlistQueryParser().parse({"limit": "0"})


def test_cursor_codec_rejects_tampered_cursor() -> None:
    """cursor codec が改ざん済み cursor を拒否することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    parser = WatchlistQueryParser()
    query = parser.parse({"limit": "10", "system_code": "DMP"})
    payload = WatchlistCursorPayload(
        exclusive_start_key={"ticker": "AAPL", "GSI1PK": True, "GSI1SK": 1},
        filters=parser.to_cursor_filters(query),
    )
    codec = CursorCodec("test-secret")
    cursor = codec.encode(payload)

    with pytest.raises(InvalidCursorError):
        codec.decode(cursor[:-1] + ("A" if cursor[-1] != "A" else "B"))


def test_cursor_codec_rejects_filter_mismatch() -> None:
    """cursor codec が query 条件不一致を拒否することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    parser = WatchlistQueryParser()
    first_query = parser.parse({"limit": "10", "system_code": "DMP"})
    second_query = parser.parse({"limit": "20", "system_code": "DMP"})
    codec = CursorCodec("test-secret")
    decoded = codec.decode(
        codec.encode(
            WatchlistCursorPayload(
                exclusive_start_key={"ticker": "AAPL", "GSI1PK": True, "GSI1SK": 1},
                filters=parser.to_cursor_filters(first_query),
            ),
        ),
    )

    with pytest.raises(InvalidCursorError):
        codec.assert_filters_match(decoded, parser.to_cursor_filters(second_query))


def test_cursor_codec_preserves_dynamodb_number_key_type() -> None:
    """cursor codec が DynamoDB number key を数値として復元することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    parser = WatchlistQueryParser()
    query = parser.parse({"limit": "10"})
    codec = CursorCodec("test-secret")
    decoded = codec.decode(
        codec.encode(
            WatchlistCursorPayload(
                exclusive_start_key={
                    "ticker": "AAPL",
                    "is_active": "true",
                    "updated_at_epoch": Decimal("1772237460"),
                },
                filters=parser.to_cursor_filters(query),
            ),
        ),
    )

    assert decoded.exclusive_start_key == {
        "ticker": "AAPL",
        "is_active": "true",
        "updated_at_epoch": 1772237460,
    }


def test_cursor_codec_normalizes_legacy_string_number_key() -> None:
    """cursor codec が旧形式の文字列 number key を補正することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    parser = WatchlistQueryParser()
    query = parser.parse({"limit": "10"})
    codec = CursorCodec("test-secret")
    payload = WatchlistCursorPayload(
        exclusive_start_key={
            "ticker": "AAPL",
            "is_active": "true",
            "updated_at_epoch": "1772237460",
        },
        filters=parser.to_cursor_filters(query),
    ).model_dump(mode="json")
    raw = json.dumps(
        {"payload": payload, "sig": codec._sign(payload)},  # noqa: SLF001
        separators=(",", ":"),
        sort_keys=True,
    )
    cursor = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")

    decoded = codec.decode(cursor)

    assert decoded.exclusive_start_key["updated_at_epoch"] == 1772237460


def test_response_builder_returns_safe_error_body_with_request_id() -> None:
    """response builder が安全なエラー本文を返すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    response = handle_json(
        {"requestContext": {"requestId": "req-123"}},
        ApiResponseBuilder(),
        lambda: _raise_invalid_query(),
    )

    assert response["statusCode"] == 400
    assert json.loads(response["body"]) == {
        "code": "invalid_query",
        "message": "不正な条件です。",
        "request_id": "req-123",
    }


def test_settings_rejects_dummy_values_in_prd() -> None:
    """本番設定が dummy 値を拒否することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with pytest.raises(SettingsError):
        BackendSettings.from_env(
            {
                "ENV_NAME": "prd",
                "COGNITO_ISSUER_URL": "http://localhost:9000/dummy",
                "COGNITO_AUDIENCE": "guppy-web-local",
                "ALLOWED_ORIGINS": "http://localhost:5173",
                "CURSOR_SIGNING_SECRET": "local-dev-cursor-secret",
            },
        )


def test_watchlist_repository_page_model_accepts_items() -> None:
    """watchlist repository page model が item shape を検証することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    page = WatchlistRepositoryPage(
        items=[
            WatchlistItem(
                ticker="AAPL",
                is_active=True,
                category_code="MEGA_TECH",
                systems=["DMP", "TGB"],
                latest_decisions_by_system={"DMP": "BUY"},
                updated_at="2026-02-28T06:31:00+09:00",
                updated_at_epoch=1772237460,
            ),
        ],
        last_evaluated_key={"ticker": "AAPL"},
    )

    assert page.items[0].ticker == "AAPL"
    assert page.last_evaluated_key == {"ticker": "AAPL"}


def test_extract_dynamodb_error_returns_client_error_code() -> None:
    """DynamoDB ClientError から安全なログ情報を取り出すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    from botocore.exceptions import ClientError  # type: ignore[import-untyped]

    error = ClientError(
        {
            "Error": {
                "Code": "ValidationException",
                "Message": "The table does not have the specified index: GSI1",
            },
        },
        "Query",
    )

    assert extract_dynamodb_error(error) == {
        "type": "ClientError",
        "code": "ValidationException",
        "message": "The table does not have the specified index: GSI1",
    }


def test_format_dynamodb_bool_key_returns_lowercase_string() -> None:
    """DynamoDB の文字列 boolean key に変換することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    assert format_dynamodb_bool_key(True) == "true"
    assert format_dynamodb_bool_key(False) == "false"


def _raise_invalid_query() -> dict[str, Any]:
    """入力不正エラーを送出する。

    Args:
        なし。

    Returns:
        戻らないが、型検査のため dict を宣言する。

    Raises:
        InvalidQueryError: 常に送出する。
    """

    raise InvalidQueryError("不正な条件です。")
