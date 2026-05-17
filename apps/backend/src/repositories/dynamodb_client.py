"""DynamoDB resource factory。"""

from __future__ import annotations

from typing import Any

import boto3  # type: ignore[import-untyped]

from lib.settings import BackendSettings


def create_dynamodb_resource(settings: BackendSettings) -> Any:
    """DynamoDB resource を生成する。

    Args:
        settings: バックエンド設定。

    Returns:
        boto3 DynamoDB resource。
    """

    kwargs: dict[str, Any] = {
        "service_name": "dynamodb",
        "region_name": settings.aws_region,
    }
    if settings.dynamodb_endpoint_url is not None:
        kwargs["endpoint_url"] = settings.dynamodb_endpoint_url
    return boto3.resource(**kwargs)
