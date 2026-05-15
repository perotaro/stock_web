#!/usr/bin/env python3
"""同梱されたCodexレビューAgent定義をリポジトリまたはユーザー設定へ導入する。"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def parse_args() -> argparse.Namespace:
    """コマンドライン引数を解析する。

    Args:
        なし。

    Returns:
        argparse.Namespace: 解析済みのコマンドライン引数。
    """
    parser = argparse.ArgumentParser(description="Install bundled Codex review agent TOML files.")
    parser.add_argument(
        "--target",
        default=".codex/agents",
        help="target directory for agent TOML files (default: .codex/agents)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite existing TOML files in the target directory",
    )
    return parser.parse_args()


def main() -> int:
    """同梱Agent定義を指定されたディレクトリへコピーする。

    Args:
        なし。

    Returns:
        int: 正常終了時は0。
    """
    args = parse_args()
    skill_root = Path(__file__).resolve().parents[1]
    source_dir = skill_root / "assets" / "codex-agents"
    target_dir = Path(args.target).expanduser().resolve()

    if not source_dir.is_dir():
        raise SystemExit(f"missing bundled agent directory: {source_dir}")

    target_dir.mkdir(parents=True, exist_ok=True)

    copied = []
    skipped = []
    for source in sorted(source_dir.glob("*.toml")):
        target = target_dir / source.name
        if target.exists() and not args.force:
            skipped.append(target.name)
            continue
        shutil.copy2(source, target)
        copied.append(target.name)

    print(f"target: {target_dir}")
    if copied:
        print("copied: " + ", ".join(copied))
    if skipped:
        print("skipped existing: " + ", ".join(skipped))
    if not copied and not skipped:
        print("no TOML files found to install")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
