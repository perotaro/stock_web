"""watchlist cursor の domain model。"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class WatchlistCursorFilters(BaseModel):
    """cursor と query の一致検証に使う filter。"""

    is_active: bool
    system_code: str | None
    category_code: str | None
    q_ticker: str | None
    sort: Literal["updated_at_desc"]
    limit: int = Field(ge=1, le=100)


class WatchlistCursorPayload(BaseModel):
    """watchlist cursor の署名対象 payload。"""

    v: int = 1
    exclusive_start_key: dict[str, Any]
    filters: WatchlistCursorFilters
