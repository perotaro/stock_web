"""watchlist の domain model。"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


WatchlistSort = Literal["updated_at_desc"]


class WatchlistItem(BaseModel):
    """DynamoDB の watchlist item。"""

    model_config = ConfigDict(extra="ignore")

    ticker: str
    is_active: bool
    category_code: str
    systems: list[str]
    latest_decisions_by_system: dict[str, str]
    updated_at: str
    updated_at_epoch: int | None = None


class WatchlistQuery(BaseModel):
    """watchlist API の query 条件。"""

    q_ticker: str | None = None
    is_active: bool = True
    system_code: str | None = None
    category_code: str | None = None
    sort: WatchlistSort = "updated_at_desc"
    limit: int = Field(default=50, ge=1, le=100)
    cursor: str | None = None


class WatchlistRepositoryQuery(BaseModel):
    """watchlist repository へ渡す query 条件。"""

    q_ticker: str | None
    is_active: bool
    system_code: str | None
    category_code: str | None
    limit: int
    exclusive_start_key: dict[str, Any] | None = None


class WatchlistRepositoryPage(BaseModel):
    """watchlist repository のページング結果。"""

    items: list[WatchlistItem]
    last_evaluated_key: dict[str, Any] | None = None


class WatchlistItemResponse(BaseModel):
    """watchlist API の item response。"""

    ticker: str
    is_active: bool
    category_code: str
    systems: list[str]
    latest_decisions_by_system: dict[str, str]
    updated_at: str


class WatchlistResponse(BaseModel):
    """watchlist API response。"""

    items: list[WatchlistItemResponse]
    next_cursor: str | None
