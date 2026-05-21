# progress.json 固定 schema

`.codex-learning/progress.json` は固定 schema で扱う。推奨ではなく必須とする。

## ルート構造

```json
{
  "version": 1,
  "current_focus": "react",
  "preferences": {
    "review_intensity": "normal",
    "task_size": "medium"
  },
  "curriculum": {
    "ordered_topics": [
      "jsx-and-components",
      "props",
      "state",
      "event-handling",
      "conditional-rendering",
      "list-rendering",
      "lifting-state-up",
      "form-handling",
      "derived-values-and-simple-effects",
      "custom-hooks",
      "context",
      "performance-basics"
    ],
    "current_topic": null,
    "next_topic": "jsx-and-components",
    "prefer_natural_implementation": true,
    "allow_exceptional_concepts_when_needed": true
  },
  "tracks": {
    "react": {
      "topics_mastered": [],
      "topics_in_progress": [],
      "topics_blocked": [],
      "last_studied_at": null,
      "recent_tasks": []
    }
  }
}
```

## enum 制約

- `preferences.review_intensity`: `light` / `normal` / `strict`
- `preferences.task_size`: `small` / `medium` / `large`
- `current_focus`: 常に `react`
- `version`: 常に `1`

## recent_tasks 要素の固定構造

```json
{
  "goal": "送信中はボタンを無効化する",
  "learning_theme": "state",
  "allowed_concepts": ["state", "event-handling"],
  "disallowed_concepts": ["context", "custom-hooks"],
  "status": "pass with notes",
  "reviewed_at": "2026-04-16"
}
```

## 正規化ルール

既存ファイルがこの schema と異なる場合は、次の方針で正規化する。

1. 読み取れる値だけを安全に移植する。
2. 欠落している必須キーは既定値で補う。
3. `ordered_topics` は skill 定義の順序に合わせて必ず上書きする。
4. `current_focus` は必ず `react` にする。
5. `review_intensity` と `task_size` が不正な値なら既定値に戻す。
6. `recent_tasks` の各要素が不完全なら、既知フィールドだけを残して固定構造に補正する。

## 初回作成時の既定値

- `review_intensity`: `normal`
- `task_size`: `medium`
- `current_topic`: `null`
- `next_topic`: `jsx-and-components`
- `topics_mastered`: `[]`
- `topics_in_progress`: `[]`
- `topics_blocked`: `[]`
- `last_studied_at`: `null`
- `recent_tasks`: `[]`
