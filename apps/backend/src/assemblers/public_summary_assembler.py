"""公開サマリ assembler。"""

from __future__ import annotations

from domain.public_summary import PublicSummaryItem, PublicSummaryResponse


class PublicSummaryAssembler:
    """公開サマリ item を API response へ変換する。"""

    def assemble(self, item: PublicSummaryItem) -> PublicSummaryResponse:
        """公開サマリ response を組み立てる。

        Args:
            item: DynamoDB の公開サマリ item。

        Returns:
            API 契約に沿った公開サマリ response。
        """

        return PublicSummaryResponse(
            operating_days=item.operating_days,
            batch_runs_total=item.batch_runs_total,
            success_rate=round(item.success_rate * 100, 2),
            avg_duration_sec=item.avg_duration_sec,
            updated_at=item.updated_at,
        )
