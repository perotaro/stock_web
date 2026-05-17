"""認証後サマリの domain model。"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict


LatestStatus = Literal["SUCCEEDED", "FAILED", "NOT_RUN"]


class SystemLatestStatusItem(BaseModel):
    """DynamoDB のシステム最新状態 item。"""

    model_config = ConfigDict(extra="ignore")

    system_code: str
    system_name: str
    latest_status: LatestStatus
    latest_run_at: str | None
    updated_at: str


class AppSummaryStatusCountsResponse(BaseModel):
    """システム状態ごとの件数 response。"""

    succeeded: int
    failed: int
    not_run: int


class AppSummarySystemResponse(BaseModel):
    """システム別最新状態 response。"""

    system_code: str
    system_name: str
    latest_status: LatestStatus
    latest_run_at: str | None
    updated_at: str


class AppSummaryResponse(BaseModel):
    """認証後サマリ API response。"""

    system_count: int
    latest_run_at: str | None
    status_counts: AppSummaryStatusCountsResponse
    systems: list[AppSummarySystemResponse]
