"""公開サマリ取得 usecase。"""

from __future__ import annotations

from assemblers.public_summary_assembler import PublicSummaryAssembler
from domain.public_summary import PublicSummaryResponse
from lib.errors import NotFoundError
from repositories.public_summary_repository import PublicSummaryRepository


class GetPublicSummaryUseCase:
    """公開サマリ API の実行手順を調整する。"""

    def __init__(
        self,
        repository: PublicSummaryRepository,
        assembler: PublicSummaryAssembler,
    ) -> None:
        """usecase を初期化する。

        Args:
            repository: 公開サマリ repository。
            assembler: 公開サマリ assembler。

        Returns:
            なし。
        """

        self._repository = repository
        self._assembler = assembler

    def execute(self) -> PublicSummaryResponse:
        """公開サマリを取得する。

        Args:
            なし。

        Returns:
            公開サマリ API response。

        Raises:
            NotFoundError: 公開サマリが存在しない場合。
        """

        item = self._repository.get_current()
        if item is None:
            raise NotFoundError()
        return self._assembler.assemble(item)
