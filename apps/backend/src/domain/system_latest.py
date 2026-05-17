"""システム別最新結果の domain model。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class SystemLatestSignalItem(BaseModel):
    """DynamoDB のシステム別最新結果 item。"""

    model_config = ConfigDict(extra="ignore")

    system_code: str
    record_key: str
    system_name: str | None = None
    latest_run_id: str | None = None
    latest_run_at: str | None = None
    updated_at: str
    priority_rank: int | None = None
    ticker: str | None = None
    name: str | None = None
    decision: str | None = None
    reason: str | None = None
    run_id: str | None = None


class SystemLatestSignalResponse(BaseModel):
    """システム別最新結果の signal response。"""

    priority_rank: int = Field(ge=1)
    ticker: str
    name: str
    decision: str
    reason: str | None
    run_id: str


class SystemLatestResponse(BaseModel):
    """システム別最新結果 API response。"""

    system_code: str
    system_name: str
    latest_run_id: str | None
    latest_run_at: str | None
    updated_at: str
    signals: list[SystemLatestSignalResponse]
