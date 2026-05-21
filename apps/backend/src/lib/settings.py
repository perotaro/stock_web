"""バックエンド設定の読み込みと検証。"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping


class SettingsError(ValueError):
    """設定値が不正な場合のエラー。"""


@dataclass(frozen=True)
class BackendSettings:
    """バックエンド全体の環境設定。"""

    env_name: str
    aws_region: str
    dynamodb_endpoint_url: str | None
    public_summary_table_name: str
    system_latest_status_table_name: str
    system_latest_signals_table_name: str
    watchlist_table_name: str
    cognito_issuer_url: str
    cognito_audience: str
    allowed_origins: tuple[str, ...]
    cursor_signing_secret: str

    @classmethod
    def from_env(
        cls,
        environ: Mapping[str, str] | None = None,
    ) -> "BackendSettings":
        """環境変数から設定を生成する。

        Args:
            environ: 読み込み元の環境変数。未指定時は `os.environ` を使う。

        Returns:
            検証済みのバックエンド設定。

        Raises:
            SettingsError: 本番向けに危険な設定が含まれる場合。
        """

        source = os.environ if environ is None else environ
        settings = cls(
            env_name=source.get("ENV_NAME", "local"),
            aws_region=source.get("AWS_REGION", "ap-northeast-1"),
            dynamodb_endpoint_url=source.get("DYNAMODB_ENDPOINT_URL") or None,
            public_summary_table_name=source.get(
                "PUBLIC_SUMMARY_TABLE_NAME",
                "md_public_summary",
            ),
            system_latest_status_table_name=source.get(
                "SYSTEM_LATEST_STATUS_TABLE_NAME",
                "md_system_latest_status",
            ),
            system_latest_signals_table_name=source.get(
                "SYSTEM_LATEST_SIGNALS_TABLE_NAME",
                "md_system_latest_signals",
            ),
            watchlist_table_name=source.get(
                "WATCHLIST_TABLE_NAME",
                "md_watchlist",
            ),
            cognito_issuer_url=source.get(
                "COGNITO_ISSUER_URL",
                "http://localhost:9000/dummy",
            ),
            cognito_audience=source.get("COGNITO_AUDIENCE", "guppy-web-local"),
            allowed_origins=_split_csv(
                source.get("ALLOWED_ORIGINS", "http://localhost:5173"),
            ),
            cursor_signing_secret=source.get(
                "CURSOR_SIGNING_SECRET",
                "local-dev-cursor-secret",
            ),
        )
        settings.validate()
        return settings

    def validate(self) -> None:
        """設定値を検証する。

        Args:
            なし。

        Returns:
            なし。

        Raises:
            SettingsError: 本番向けに危険な設定が含まれる場合。
        """

        if self.env_name != "prd":
            return

        blocked_fields = {
            "cognito_issuer_url": self.cognito_issuer_url,
            "cognito_audience": self.cognito_audience,
            "cursor_signing_secret": self.cursor_signing_secret,
            "dynamodb_endpoint_url": self.dynamodb_endpoint_url or "",
            "allowed_origins": ",".join(self.allowed_origins),
        }
        for field_name, value in blocked_fields.items():
            _reject_prd_placeholder(field_name, value)

        if len(self.cursor_signing_secret) < 32:
            raise SettingsError(
                "ENV_NAME=prd では CURSOR_SIGNING_SECRET は 32 文字以上が必須です。",
            )


def _split_csv(value: str) -> tuple[str, ...]:
    """CSV 形式の環境変数を分割する。

    Args:
        value: カンマ区切りの文字列。

    Returns:
        空白を除去した値の tuple。
    """

    return tuple(part.strip() for part in value.split(",") if part.strip())


def _reject_prd_placeholder(field_name: str, value: str) -> None:
    """本番で禁止する placeholder 値を拒否する。

    Args:
        field_name: 検証対象の設定名。
        value: 検証対象の値。

    Returns:
        なし。

    Raises:
        SettingsError: placeholder 値が含まれる場合。
    """

    lowered = value.lower()
    blocked_words = ("dummy", "example", "localhost", "127.0.0.1", "local")
    if not value or any(word in lowered for word in blocked_words):
        raise SettingsError(f"ENV_NAME=prd では {field_name} に本番値が必須です。")
