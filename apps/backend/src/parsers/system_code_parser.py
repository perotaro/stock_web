"""システムコード parser。"""

from __future__ import annotations

import re

from lib.errors import InvalidQueryError

SYSTEM_CODE_PATTERN = re.compile(r"^[A-Z0-9_]{2,32}$")


class SystemCodeParser:
    """path parameter の system_code を検証する。"""

    def parse(self, value: str | None) -> str:
        """system_code を検証して返す。

        Args:
            value: path parameter の system_code。

        Returns:
            検証済み system_code。

        Raises:
            InvalidQueryError: system_code が未指定または不正な場合。
        """

        if value is None or not SYSTEM_CODE_PATTERN.fullmatch(value):
            raise InvalidQueryError(
                "system_code は 2 文字以上 32 文字以下の英大文字、数字、_ で指定してください。",
            )
        return value
