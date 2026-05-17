"""システム別最新結果 assembler。"""

from __future__ import annotations

from domain.system_latest import (
    SystemLatestResponse,
    SystemLatestSignalItem,
    SystemLatestSignalResponse,
)
from lib.errors import NotFoundError


class SystemLatestAssembler:
    """システム別最新結果 item 群を API response へ変換する。"""

    def assemble(
        self,
        system_code: str,
        items: list[SystemLatestSignalItem],
    ) -> SystemLatestResponse:
        """システム別最新結果 response を組み立てる。

        Args:
            system_code: 対象システムコード。
            items: メタ item と signal item の一覧。

        Returns:
            API 契約に沿ったシステム別最新結果 response。

        Raises:
            NotFoundError: メタ item が存在しない場合。
        """

        meta = next((item for item in items if item.record_key == "META#LATEST"), None)
        if meta is None:
            raise NotFoundError()

        signals = [
            item
            for item in items
            if item.record_key.startswith("SIGNAL#")
            and item.priority_rank is not None
            and item.ticker is not None
            and item.name is not None
            and item.decision is not None
            and item.run_id is not None
        ]
        return SystemLatestResponse(
            system_code=system_code,
            system_name=meta.system_name or system_code,
            latest_run_id=meta.latest_run_id,
            latest_run_at=meta.latest_run_at,
            updated_at=meta.updated_at,
            signals=[
                SystemLatestSignalResponse(
                    priority_rank=item.priority_rank or 0,
                    ticker=item.ticker or "",
                    name=item.name or "",
                    decision=item.decision or "",
                    reason=item.reason,
                    run_id=item.run_id or "",
                )
                for item in sorted(
                    signals, key=lambda signal: signal.priority_rank or 0
                )
            ],
        )
