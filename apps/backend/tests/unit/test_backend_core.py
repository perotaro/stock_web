"""バックエンド本実装の中核テスト。"""

from __future__ import annotations

import base64
import json
from decimal import Decimal
from typing import Any

import pytest

from assemblers.app_summary_assembler import AppSummaryAssembler
from assemblers.public_summary_assembler import PublicSummaryAssembler
from assemblers.system_latest_assembler import SystemLatestAssembler
from assemblers.watchlist_assembler import WatchlistAssembler
from domain.app_summary import SystemLatestStatusItem
from domain.cursor import WatchlistCursorPayload
from domain.public_summary import PublicSummaryItem
from domain.system_latest import SystemLatestSignalItem
from domain.watchlist import WatchlistItem, WatchlistRepositoryPage, WatchlistRepositoryQuery
from handlers._shared import handle_json
from lib.cursor_codec import CursorCodec
from lib.errors import InvalidCursorError, InvalidQueryError, NotFoundError
from lib.response import ApiResponseBuilder
from lib.settings import BackendSettings, SettingsError
from parsers.watchlist_query_parser import WatchlistQueryParser
from parsers.system_code_parser import SystemCodeParser
from repositories.system_latest_signal_repository import (
    DynamoDbSystemLatestSignalRepository,
)
from repositories.system_latest_status_repository import (
    DynamoDbSystemLatestStatusRepository,
)
from repositories.watchlist_repository import (
    DynamoDbWatchlistRepository,
    extract_dynamodb_error,
    format_dynamodb_bool_key,
)
from usecases.get_app_summary import GetAppSummaryUseCase
from usecases.get_public_summary import GetPublicSummaryUseCase
from usecases.get_system_latest import GetSystemLatestUseCase
from usecases.get_watchlist import GetWatchlistUseCase


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


class FakeWatchlistRepository:
    """watchlist repository fake。"""

    def __init__(self, page: WatchlistRepositoryPage) -> None:
        """fake を初期化する。

        Args:
            page: repository が返すページ。

        Returns:
            なし。
        """

        self._page = page
        self.queries: list[WatchlistRepositoryQuery] = []

    def query_page(self, query: WatchlistRepositoryQuery) -> WatchlistRepositoryPage:
        """query を記録してページを返す。

        Args:
            query: usecase から渡された repository query。

        Returns:
            初期化時に渡されたページ。
        """

        self.queries.append(query)
        return self._page


class FakeAppSummaryRepository:
    """認証後サマリ repository fake。"""

    def __init__(self, items: list[SystemLatestStatusItem]) -> None:
        """fake を初期化する。

        Args:
            items: repository が返す item 一覧。

        Returns:
            なし。
        """

        self._items = items
        self.called = False

    def list_all(self) -> list[SystemLatestStatusItem]:
        """全 item を返す。

        Args:
            なし。

        Returns:
            初期化時に渡された item 一覧。
        """

        self.called = True
        return self._items


class FakeSystemLatestRepository:
    """システム別最新結果 repository fake。"""

    def __init__(self, items: list[SystemLatestSignalItem]) -> None:
        """fake を初期化する。

        Args:
            items: repository が返す item 一覧。

        Returns:
            なし。
        """

        self._items = items
        self.system_codes: list[str] = []

    def list_by_system_code(self, system_code: str) -> list[SystemLatestSignalItem]:
        """system_code を記録して item 一覧を返す。

        Args:
            system_code: usecase から渡された system_code。

        Returns:
            初期化時に渡された item 一覧。
        """

        self.system_codes.append(system_code)
        return self._items


class FakeDynamoDbTable:
    """DynamoDB table fake。"""

    def __init__(
        self,
        get_item_response: dict[str, Any] | None = None,
        query_response: dict[str, Any] | None = None,
        scan_responses: list[dict[str, Any]] | None = None,
    ) -> None:
        """fake table を初期化する。

        Args:
            get_item_response: get_item が返す response。
            query_response: query が返す response。
            scan_responses: scan が順に返す response。

        Returns:
            なし。
        """

        self.name = "watchlist"
        self.get_item_response = get_item_response or {}
        self.query_response = query_response or {"Items": []}
        self.scan_responses = scan_responses or [{"Items": []}]
        self.get_item_calls: list[dict[str, Any]] = []
        self.query_calls: list[dict[str, Any]] = []
        self.scan_calls: list[dict[str, Any]] = []

    def get_item(self, **kwargs: Any) -> dict[str, Any]:
        """get_item の呼び出しを記録する。

        Args:
            **kwargs: DynamoDB get_item の引数。

        Returns:
            初期化時に渡された get_item response。
        """

        self.get_item_calls.append(kwargs)
        return self.get_item_response

    def query(self, **kwargs: Any) -> dict[str, Any]:
        """query の呼び出しを記録する。

        Args:
            **kwargs: DynamoDB query の引数。

        Returns:
            初期化時に渡された query response。
        """

        self.query_calls.append(kwargs)
        return self.query_response

    def scan(self, **kwargs: Any) -> dict[str, Any]:
        """scan の呼び出しを記録する。

        Args:
            **kwargs: DynamoDB scan の引数。

        Returns:
            初期化時に渡された scan response を順に返す。
        """

        self.scan_calls.append(kwargs)
        response_index = min(len(self.scan_calls) - 1, len(self.scan_responses) - 1)
        return self.scan_responses[response_index]


class FakeDynamoDbResource:
    """DynamoDB resource fake。"""

    def __init__(self, table: FakeDynamoDbTable) -> None:
        """fake resource を初期化する。

        Args:
            table: Table 呼び出しで返す fake table。

        Returns:
            なし。
        """

        self._table = table

    def Table(self, table_name: str) -> FakeDynamoDbTable:  # noqa: N802
        """table 名に対応する fake table を返す。

        Args:
            table_name: DynamoDB table 名。

        Returns:
            fake table。
        """

        del table_name
        return self._table


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


def test_get_app_summary_usecase_delegates_to_repository_and_assembler() -> None:
    """認証後サマリ usecase が repository と assembler を連携することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    repository = FakeAppSummaryRepository(
        [
            SystemLatestStatusItem(
                system_code="DMP",
                system_name="Dynamic Momentum Pullback",
                latest_status="FAILED",
                latest_run_at="2026-02-28T06:30:00+09:00",
                updated_at="2026-02-28T06:31:00+09:00",
            ),
        ],
    )

    response = GetAppSummaryUseCase(
        repository=repository,
        assembler=AppSummaryAssembler(),
    ).execute()

    assert repository.called is True
    assert response.system_count == 1
    assert response.status_counts.failed == 1


def test_system_latest_assembler_sorts_complete_signals_and_ignores_incomplete_items() -> None:
    """システム別最新結果 assembler が signal を整列して不完全 item を除外することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    response = SystemLatestAssembler().assemble(
        "DMP",
        [
            SystemLatestSignalItem(
                system_code="DMP",
                record_key="SIGNAL#002",
                updated_at="2026-02-28T06:31:00+09:00",
                priority_rank=2,
                ticker="MSFT",
                name="Microsoft",
                decision="BUY",
                reason=None,
                run_id="run-1",
            ),
            SystemLatestSignalItem(
                system_code="DMP",
                record_key="META#LATEST",
                system_name="Dynamic Momentum Pullback",
                latest_run_id="run-1",
                latest_run_at="2026-02-28T06:30:00+09:00",
                updated_at="2026-02-28T06:31:00+09:00",
            ),
            SystemLatestSignalItem(
                system_code="DMP",
                record_key="SIGNAL#001",
                updated_at="2026-02-28T06:31:00+09:00",
                priority_rank=1,
                ticker="AAPL",
                name="Apple",
                decision="BUY",
                reason="momentum",
                run_id="run-1",
            ),
            SystemLatestSignalItem(
                system_code="DMP",
                record_key="SIGNAL#BROKEN",
                updated_at="2026-02-28T06:31:00+09:00",
                priority_rank=3,
                ticker="NVDA",
                name=None,
                decision="BUY",
                run_id="run-1",
            ),
        ],
    )

    assert response.system_name == "Dynamic Momentum Pullback"
    assert response.latest_run_id == "run-1"
    assert [signal.ticker for signal in response.signals] == ["AAPL", "MSFT"]
    assert response.signals[0].reason == "momentum"


def test_system_latest_assembler_raises_not_found_without_meta() -> None:
    """システム別最新結果 assembler が meta 不在を NotFoundError にすることを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    with pytest.raises(NotFoundError):
        SystemLatestAssembler().assemble(
            "DMP",
            [
                SystemLatestSignalItem(
                    system_code="DMP",
                    record_key="SIGNAL#001",
                    updated_at="2026-02-28T06:31:00+09:00",
                    priority_rank=1,
                    ticker="AAPL",
                    name="Apple",
                    decision="BUY",
                    run_id="run-1",
                ),
            ],
        )


def test_get_system_latest_usecase_parses_system_code_and_delegates() -> None:
    """システム別最新結果 usecase が system_code を検証して repository へ渡すことを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    repository = FakeSystemLatestRepository(
        [
            SystemLatestSignalItem(
                system_code="DMP",
                record_key="META#LATEST",
                latest_run_id=None,
                latest_run_at=None,
                updated_at="2026-02-28T06:31:00+09:00",
            ),
        ],
    )

    response = GetSystemLatestUseCase(
        repository=repository,
        parser=SystemCodeParser(),
        assembler=SystemLatestAssembler(),
    ).execute("DMP")

    assert repository.system_codes == ["DMP"]
    assert response.system_code == "DMP"
    assert response.system_name == "DMP"


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


def test_get_watchlist_usecase_decodes_cursor_and_returns_next_cursor() -> None:
    """watchlist usecase が cursor を復元し次 cursor を発行することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    parser = WatchlistQueryParser()
    codec = CursorCodec("test-secret")
    first_query = parser.parse({"limit": "10", "system_code": "DMP"})
    cursor = codec.encode(
        WatchlistCursorPayload(
            exclusive_start_key={
                "ticker": "AAPL",
                "is_active": "true",
                "updated_at_epoch": 1772237460,
            },
            filters=parser.to_cursor_filters(first_query),
        ),
    )
    repository = FakeWatchlistRepository(
        WatchlistRepositoryPage(
            items=[
                WatchlistItem(
                    ticker="MSFT",
                    is_active=True,
                    category_code="MEGA_TECH",
                    systems=["DMP"],
                    latest_decisions_by_system={"DMP": "BUY"},
                    updated_at="2026-02-28T06:31:00+09:00",
                ),
            ],
            last_evaluated_key={
                "ticker": "MSFT",
                "is_active": "true",
                "updated_at_epoch": 1772237400,
            },
        ),
    )

    response = GetWatchlistUseCase(
        repository=repository,
        parser=parser,
        cursor_codec=codec,
        assembler=WatchlistAssembler(),
    ).execute({"limit": "10", "system_code": "DMP", "cursor": cursor})

    assert repository.queries[0].exclusive_start_key == {
        "ticker": "AAPL",
        "is_active": "true",
        "updated_at_epoch": 1772237460,
    }
    assert repository.queries[0].system_code == "DMP"
    assert response.items[0].ticker == "MSFT"
    assert response.next_cursor is not None
    decoded_next_cursor = codec.decode(response.next_cursor)
    assert decoded_next_cursor.exclusive_start_key["ticker"] == "MSFT"


def test_watchlist_repository_filters_get_item_result_for_exact_ticker_query() -> None:
    """watchlist repository が ticker 完全一致結果にも追加条件を適用することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    table = FakeDynamoDbTable(
        get_item_response={
            "Item": {
                "ticker": "AAPL",
                "is_active": True,
                "category_code": "MEGA_TECH",
                "systems": ["DMP"],
                "latest_decisions_by_system": {"DMP": "BUY"},
                "updated_at": "2026-02-28T06:31:00+09:00",
            },
        },
    )
    repository = DynamoDbWatchlistRepository(FakeDynamoDbResource(table), "watchlist")

    page = repository.query_page(
        WatchlistRepositoryQuery(
            q_ticker="AAPL",
            is_active=True,
            system_code="TGB",
            category_code="MEGA_TECH",
            limit=50,
        ),
    )

    assert table.get_item_calls == [{"Key": {"ticker": "AAPL"}}]
    assert page.items == []
    assert page.last_evaluated_key is None


def test_watchlist_repository_passes_query_options_to_dynamodb() -> None:
    """watchlist repository が DynamoDB Query の条件を組み立てることを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    table = FakeDynamoDbTable(
        query_response={
            "Items": [
                {
                    "ticker": "AAPL",
                    "is_active": True,
                    "category_code": "MEGA_TECH",
                    "systems": ["DMP", "TGB"],
                    "latest_decisions_by_system": {"DMP": "BUY"},
                    "updated_at": "2026-02-28T06:31:00+09:00",
                },
            ],
            "LastEvaluatedKey": {"ticker": "AAPL"},
        },
    )
    repository = DynamoDbWatchlistRepository(FakeDynamoDbResource(table), "watchlist")

    page = repository.query_page(
        WatchlistRepositoryQuery(
            q_ticker=None,
            is_active=True,
            system_code="DMP",
            category_code="MEGA_TECH",
            limit=25,
            exclusive_start_key={"ticker": "MSFT"},
        ),
    )

    assert page.items[0].ticker == "AAPL"
    assert page.last_evaluated_key == {"ticker": "AAPL"}
    assert table.query_calls[0]["IndexName"] == "gsi_active_updated_at"
    assert table.query_calls[0]["ScanIndexForward"] is False
    assert table.query_calls[0]["Limit"] == 25
    assert table.query_calls[0]["ExclusiveStartKey"] == {"ticker": "MSFT"}
    assert "FilterExpression" in table.query_calls[0]


def test_system_latest_status_repository_scans_all_pages() -> None:
    """システム最新状態 repository が scan の全ページを取得することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    table = FakeDynamoDbTable(
        scan_responses=[
            {
                "Items": [
                    {
                        "system_code": "DMP",
                        "system_name": "Dynamic Momentum Pullback",
                        "latest_status": "SUCCEEDED",
                        "latest_run_at": "2026-02-28T06:30:00+09:00",
                        "updated_at": "2026-02-28T06:31:00+09:00",
                    },
                ],
                "LastEvaluatedKey": {"system_code": "DMP"},
            },
            {
                "Items": [
                    {
                        "system_code": "TGB",
                        "system_name": "Trend Guard Breakout",
                        "latest_status": "NOT_RUN",
                        "latest_run_at": None,
                        "updated_at": "2026-02-28T06:31:00+09:00",
                    },
                ],
            },
        ],
    )
    repository = DynamoDbSystemLatestStatusRepository(
        FakeDynamoDbResource(table),
        "system_latest_status",
    )

    items = repository.list_all()

    assert [item.system_code for item in items] == ["DMP", "TGB"]
    assert table.scan_calls == [{}, {"ExclusiveStartKey": {"system_code": "DMP"}}]


def test_system_latest_signal_repository_queries_by_system_code() -> None:
    """システム別最新結果 repository が system_code で Query することを確認する。

    Args:
        なし。

    Returns:
        なし。
    """

    table = FakeDynamoDbTable(
        query_response={
            "Items": [
                {
                    "system_code": "DMP",
                    "record_key": "META#LATEST",
                    "latest_run_id": "run-1",
                    "latest_run_at": "2026-02-28T06:30:00+09:00",
                    "updated_at": "2026-02-28T06:31:00+09:00",
                },
            ],
        },
    )
    repository = DynamoDbSystemLatestSignalRepository(
        FakeDynamoDbResource(table),
        "system_latest_signals",
    )

    items = repository.list_by_system_code("DMP")

    assert items[0].record_key == "META#LATEST"
    assert len(table.query_calls) == 1
    assert "KeyConditionExpression" in table.query_calls[0]


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
