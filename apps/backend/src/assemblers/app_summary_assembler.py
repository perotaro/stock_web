"""認証後サマリ assembler。"""

from __future__ import annotations

from domain.app_summary import (
    AppSummaryResponse,
    AppSummaryStatusCountsResponse,
    AppSummarySystemResponse,
    SystemLatestStatusItem,
)


class AppSummaryAssembler:
    """システム最新状態 item 群を API response へ変換する。"""

    def assemble(self, items: list[SystemLatestStatusItem]) -> AppSummaryResponse:
        """認証後サマリ response を組み立てる。

        Args:
            items: システム最新状態 item の一覧。

        Returns:
            API 契約に沿った認証後サマリ response。
        """

        latest_run_at = max(
            (item.latest_run_at for item in items if item.latest_run_at is not None),
            default=None,
        )
        return AppSummaryResponse(
            system_count=len(items),
            latest_run_at=latest_run_at,
            status_counts=AppSummaryStatusCountsResponse(
                succeeded=sum(1 for item in items if item.latest_status == "SUCCEEDED"),
                failed=sum(1 for item in items if item.latest_status == "FAILED"),
                not_run=sum(1 for item in items if item.latest_status == "NOT_RUN"),
            ),
            systems=[
                AppSummarySystemResponse(
                    system_code=item.system_code,
                    system_name=item.system_name,
                    latest_status=item.latest_status,
                    latest_run_at=item.latest_run_at,
                    updated_at=item.updated_at,
                )
                for item in items
            ],
        )
