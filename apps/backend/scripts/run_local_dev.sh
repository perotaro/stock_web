#!/usr/bin/env sh
set -eu

BACKEND_ROOT="/workspace/apps/backend"

if [ ! -d "${BACKEND_ROOT}" ]; then
  echo "[backend_local_dev] apps/backend が見つかりません。" >&2
  exit 1
fi

cd /workspace

if [ -f "${BACKEND_ROOT}/src/local_dev_server.py" ]; then
  exec python "${BACKEND_ROOT}/src/local_dev_server.py"
fi

echo "[backend_local_dev] ローカル開発用エントリポイントが見つかりません。" >&2
echo "[backend_local_dev] apps/backend/src/local_dev_server.py を追加してください。" >&2

exec sleep infinity
