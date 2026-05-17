"""HMAC 署名付き cursor codec。"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from typing import Any

from pydantic import ValidationError

from domain.cursor import WatchlistCursorFilters, WatchlistCursorPayload
from lib.errors import InvalidCursorError


class CursorCodec:
    """watchlist cursor を encode / decode する。"""

    def __init__(self, signing_secret: str) -> None:
        """cursor codec を初期化する。

        Args:
            signing_secret: HMAC 署名に使う秘密値。

        Returns:
            なし。
        """

        self._signing_secret = signing_secret.encode("utf-8")

    def encode(self, payload: WatchlistCursorPayload) -> str:
        """cursor payload を署名付き文字列へ変換する。

        Args:
            payload: watchlist cursor の payload。

        Returns:
            API に返す opaque cursor 文字列。
        """

        payload_dict = payload.model_dump(mode="json")
        envelope = {
            "payload": payload_dict,
            "sig": self._sign(payload_dict),
        }
        raw = json.dumps(envelope, separators=(",", ":"), sort_keys=True)
        return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")

    def decode(self, cursor: str) -> WatchlistCursorPayload:
        """cursor 文字列を検証して payload へ戻す。

        Args:
            cursor: API に渡された opaque cursor 文字列。

        Returns:
            検証済みの cursor payload。

        Raises:
            InvalidCursorError: decode、署名、version、shape のいずれかが不正な場合。
        """

        try:
            raw = base64.urlsafe_b64decode(cursor.encode("ascii")).decode("utf-8")
            envelope = json.loads(raw)
        except (UnicodeDecodeError, ValueError, json.JSONDecodeError) as error:
            raise InvalidCursorError() from error

        if not isinstance(envelope, dict):
            raise InvalidCursorError()
        payload = envelope.get("payload")
        signature = envelope.get("sig")
        if not isinstance(payload, dict) or not isinstance(signature, str):
            raise InvalidCursorError()
        expected_signature = self._sign(payload)
        if not hmac.compare_digest(signature, expected_signature):
            raise InvalidCursorError()

        try:
            decoded = WatchlistCursorPayload.model_validate(payload)
        except ValidationError as error:
            raise InvalidCursorError() from error
        if decoded.v != 1:
            raise InvalidCursorError()
        return decoded

    def assert_filters_match(
        self,
        payload: WatchlistCursorPayload,
        current_filters: WatchlistCursorFilters,
    ) -> None:
        """cursor 内 filter と現在の query 条件の一致を検証する。

        Args:
            payload: decode 済み cursor payload。
            current_filters: 現在の query 条件から作った filter。

        Returns:
            なし。

        Raises:
            InvalidCursorError: filter が一致しない場合。
        """

        if payload.filters != current_filters:
            raise InvalidCursorError()

    def _sign(self, payload: dict[str, Any]) -> str:
        """payload の HMAC-SHA256 署名を生成する。

        Args:
            payload: 署名対象 payload。

        Returns:
            16 進数の署名文字列。
        """

        normalized = json.dumps(payload, separators=(",", ":"), sort_keys=True)
        return hmac.new(
            self._signing_secret,
            normalized.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
