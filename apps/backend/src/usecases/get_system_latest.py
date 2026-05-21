"""システム別最新結果取得 usecase。"""

from __future__ import annotations

from assemblers.system_latest_assembler import SystemLatestAssembler
from domain.system_latest import SystemLatestResponse
from parsers.system_code_parser import SystemCodeParser
from repositories.system_latest_signal_repository import SystemLatestSignalRepository


class GetSystemLatestUseCase:
    """システム別最新結果 API の実行手順を調整する。"""

    def __init__(
        self,
        repository: SystemLatestSignalRepository,
        parser: SystemCodeParser,
        assembler: SystemLatestAssembler,
    ) -> None:
        """usecase を初期化する。

        Args:
            repository: システム別最新結果 repository。
            parser: system_code parser。
            assembler: システム別最新結果 assembler。

        Returns:
            なし。
        """

        self._repository = repository
        self._parser = parser
        self._assembler = assembler

    def execute(self, system_code_text: str | None) -> SystemLatestResponse:
        """システム別最新結果を取得する。

        Args:
            system_code_text: path parameter の system_code。

        Returns:
            システム別最新結果 API response。
        """

        system_code = self._parser.parse(system_code_text)
        items = self._repository.list_by_system_code(system_code)
        return self._assembler.assemble(system_code, items)
