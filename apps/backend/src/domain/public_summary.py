"""公開サマリの domain model。"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PublicSummaryItem(BaseModel):
    """DynamoDB の公開サマリ item。"""

    model_config = ConfigDict(extra="ignore")

    operating_days: int = Field(ge=0)
    batch_runs_total: int = Field(ge=0)
    success_rate: float = Field(ge=0, le=1)
    avg_duration_sec: float = Field(ge=0)
    updated_at: str


class PublicSummaryResponse(BaseModel):
    """公開サマリ API response。"""

    operating_days: int
    batch_runs_total: int
    success_rate: float
    avg_duration_sec: float
    updated_at: str
