"""backend テスト共通設定。"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_SRC_PATH = Path(__file__).resolve().parents[1] / "src"
if str(BACKEND_SRC_PATH) not in sys.path:
    sys.path.insert(0, str(BACKEND_SRC_PATH))
