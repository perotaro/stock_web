"""認証後サマリ取得 usecase。"""

from __future__ import annotations

from assemblers.app_summary_assembler import AppSummaryAssembler
from domain.app_summary import AppSummaryResponse
from repositories.system_latest_status_repository import SystemLatestStatusRepository


class GetAppSummaryUseCase:
    """認証後サマリ API の実行手順を調整する。"""

    def __init__(
        self,
        repository: SystemLatestStatusRepository,
        assembler: AppSummaryAssembler,
    ) -> None:
        """usecase を初期化する。

        Args:
            repository: システム最新状態 repository。
            assembler: 認証後サマリ assembler。

        Returns:
            なし。
        """

        self._repository = repository
        self._assembler = assembler

    def execute(self) -> AppSummaryResponse:
        """認証後サマリを取得する。

        Args:
            なし。

        Returns:
            認証後サマリ API response。
        """

        return self._assembler.assemble(self._repository.list_all())
