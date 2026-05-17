"""API エラー定義。"""

from __future__ import annotations


class AppError(Exception):
    """API として制御可能なエラー。"""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        """API エラーを初期化する。

        Args:
            status_code: HTTP ステータスコード。
            code: 機械判定用のエラーコード。
            message: 利用者または運用者向けの安全なメッセージ。

        Returns:
            なし。
        """

        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


class InvalidQueryError(AppError):
    """query / path parameter が不正な場合のエラー。"""

    def __init__(self, message: str) -> None:
        """入力不正エラーを初期化する。

        Args:
            message: 入力不正の内容。

        Returns:
            なし。
        """

        super().__init__(400, "invalid_query", message)


class InvalidCursorError(AppError):
    """cursor が不正な場合のエラー。"""

    def __init__(self, message: str = "cursor が不正です。") -> None:
        """cursor 不正エラーを初期化する。

        Args:
            message: cursor 不正の内容。

        Returns:
            なし。
        """

        super().__init__(400, "invalid_cursor", message)


class NotFoundError(AppError):
    """対象データが存在しない場合のエラー。"""

    def __init__(self, message: str = "対象データが存在しません。") -> None:
        """データ未存在エラーを初期化する。

        Args:
            message: データ未存在の内容。

        Returns:
            なし。
        """

        super().__init__(404, "not_found", message)


class RepositoryError(AppError):
    """repository 層で制御可能な失敗が発生した場合のエラー。"""

    def __init__(self, message: str = "データ取得に失敗しました。") -> None:
        """データ取得エラーを初期化する。

        Args:
            message: データ取得失敗の内容。

        Returns:
            なし。
        """

        super().__init__(503, "repository_error", message)
