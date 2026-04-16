#!/usr/bin/env sh
set -eu

BACKEND_ROOT="/workspace/apps/backend"

if [ ! -d "${BACKEND_ROOT}" ]; then
  echo "[backend_dev] apps/backend が見つかりません。" >&2
  exit 1
fi

cd /workspace

if [ -f "${BACKEND_ROOT}/src/main.py" ]; then
  exec python "${BACKEND_ROOT}/src/main.py"
fi

if [ -f "${BACKEND_ROOT}/src/local_dev_server.py" ]; then
  exec python "${BACKEND_ROOT}/src/local_dev_server.py"
fi

echo "[backend_dev] ローカル起動用エントリポイントが見つかりません。"
echo "[backend_dev] apps/backend/src/main.py か apps/backend/src/local_dev_server.py を追加してください。"
echo "[backend_dev] 共有 DynamoDB Local (${DYNAMODB_ENDPOINT_URL:-http://host.docker.internal:8000}) に接続する前提で待機します。"

exec sleep infinity
