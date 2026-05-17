# Guppy DynamoDB データ設計（APIアクセスパターン準拠）

## 1. 目的
本書は、確定済みのAPIアクセスパターンを満たすための DynamoDB 設計を定義する。

- 入力: `doc/required/web_system_required.md` の 6.4 APIアクセスパターン一覧
- 入力: `doc/required/web_screen_items_template.md` の確定済み画面/API項目
- 出力: テーブル、PK/SK、GSI、更新フロー、移行方針

## 2. DynamoDBの基本（学習用）
### 2.1 PK / SK
- `PK`（Partition Key）: データのまとまりを決めるキー。
- `SK`（Sort Key）: 同じ `PK` 内の並び順と種別を決めるキー。
- 典型パターン: `PK=system_code`, `SK=SIGNAL#000001#AAPL` のように `SK` にプレフィックスとゼロ埋め順位を入れて並びを固定する。

### 2.2 GSI
- `GSI`（Global Secondary Index）: 別の切り口で検索するための副インデックス。
- 例: watchlistを `is_active=true` かつ `updated_at` 降順で取りたい場合、`GSI1PK=is_active`, `GSI1SK=updated_at_epoch` を作る。

### 2.3 このプロジェクトでの使い分け
- 少量マスタ: 単純PK中心（`systems`, `categories` など）
- 画面の主表示: API向けに非正規化（`watchlist`, `system latest signals`）
- 監査/運用: バッチ実行履歴を別テーブルで保持（将来の再実行や調査向け）

## 3. 確定アクセスパターンと必要データ
| No | API | 取得条件 | 返却の要点 |
|---|---|---|---|
| 1 | `GET /api/v1/public/summary` | 固定1件 | 当月稼働日数、累計実行回数、当月成功率(run_id単位)、当月平均処理時間、更新日時 |
| 2 | `GET /api/v1/summary` | 固定 | システム件数、全体最新実行日時、成功/失敗件数、システム別最新ステータス |
| 3 | `GET /api/v1/systems/{system_code}/latest` | `system_code` 指定 | 最新実行の銘柄判定一覧（入札優先度順） |
| 4 | `GET /api/v1/watchlist` | フィルタ有 | `q_ticker` 完全一致、`is_active=true` デフォルト、`updated_at` 降順、`limit/cursor` によるページング |

## 4. 推奨テーブル一覧
本構成は「シンプル運用優先」の複数テーブル設計とする。

1. `md_public_summary`
2. `md_system_latest_status`
3. `md_system_latest_signals`
4. `md_watchlist`
5. `md_batch_runs`
6. `md_systems`
7. `md_instruments`
8. `md_system_instruments`
9. `md_instrument_categories`
10. `md_exchanges`
11. `md_currencies`

## 5. テーブル定義
### 5.1 `md_public_summary`
公開トップAPI専用の集計テーブル。

- PK: `summary_scope`（例: `PUBLIC`）
- SK: `summary_key`（例: `CURRENT`, `MONTH#2026-02`）
- GSI: なし

公開返却属性（APIでそのまま返す）:
- `operating_days` number
- `batch_runs_total` number
- `success_rate` number（`0..1` の比率。API 返却時に `0..100` の百分率へ変換する）
- `avg_duration_sec` number
- `updated_at` string (ISO8601, JST表記)
- `period_timezone` string (`Asia/Tokyo`)

内部集計属性（画面非表示、増分更新用）:
- `lifetime_run_count` number
- `month_key` string（`YYYY-MM`, JST基準）
- `month_run_count` number
- `month_success_count` number
- `month_duration_total_sec` number
- `month_operating_days` number

意図:
- `batch_runs_total` は累計値、`success_rate`/`avg_duration_sec` は当月値という異なる時間軸を同一レコードで保持する。
- `success_rate` は保存時は比率で保持し、API 契約に合わせてバックエンドで百分率へ変換する。
- バッチ完了のたびに内部集計属性を増分更新し、過去全件スキャンを避ける。
- 公開サマリ更新ジョブ（毎日12:00 JST）は、主に `updated_at` と表示値の整合確認を行う。

サンプル:
```json
{
  "summary_scope": "PUBLIC",
  "summary_key": "CURRENT",
  "operating_days": 18,
  "batch_runs_total": 1345,
  "success_rate": 0.9444,
  "avg_duration_sec": 87.2,
  "updated_at": "2026-02-28T12:00:00+09:00",
  "period_timezone": "Asia/Tokyo",
  "lifetime_run_count": 1345,
  "month_key": "2026-02",
  "month_run_count": 36,
  "month_success_count": 34,
  "month_duration_total_sec": 3139.2,
  "month_operating_days": 18
}
```

### 5.2 `md_system_latest_status`
`/api/v1/summary` 用のシステム最新ステータス。

- PK: `system_code`（例: `DMP`, `TGB`）
- SK: なし
- GSI: なし（システム数が少ないため全件取得）

主な属性:
- `system_name`
- `latest_status` (`SUCCEEDED` / `FAILED` / `NOT_RUN`)
- `latest_run_at`
- `updated_at`

サンプル:
```json
{
  "system_code": "DMP",
  "system_name": "Dynamic Momentum Pullback",
  "latest_status": "SUCCEEDED",
  "latest_run_at": "2026-02-28T06:30:10+09:00",
  "updated_at": "2026-02-28T06:31:00+09:00"
}
```

### 5.3 `md_system_latest_signals`
`/api/v1/systems/{system_code}/latest` 用。  
同一 `system_code` 内にメタ1件 + signal複数件を持つ。

- 保持ポリシー:
- 本テーブルは `system_code` ごとに「最新1回分のみ」を保持する。
- 新しい run 反映時は、当該 `system_code` の旧 `META#LATEST` / `SIGNAL#...` を置換（不要分は削除）する。
- 古い run の履歴は `md_batch_runs` で保持する（本テーブルでは保持しない）。

- PK: `system_code`
- SK:
1. `META#LATEST`
2. `SIGNAL#{priority_rank_6digits}#{ticker}`
- GSI: なし

意図:
- `SK` で「入札優先度順」を固定できる。
- 1クエリで `PK=system_code` を取得し、`META` と `SIGNAL` を分離してレスポンス整形できる。
- 初期移行時は `META#LATEST` の `latest_run_id/latest_run_at` を `null`
  で投入し、初回バッチ実行後に実値で上書きする。

サンプル（メタ）:
```json
{
  "system_code": "DMP",
  "record_key": "META#LATEST",
  "latest_run_id": "DMP-20260228-063000",
  "latest_run_at": "2026-02-28T06:30:00+09:00",
  "updated_at": "2026-02-28T06:31:00+09:00"
}
```

サンプル（シグナル）:
```json
{
  "system_code": "DMP",
  "record_key": "SIGNAL#000001#AAPL",
  "priority_rank": 1,
  "ticker": "AAPL",
  "name": "Apple Inc.",
  "decision": "BUY",
  "reason": "EMA20 support and ATR contraction",
  "run_id": "DMP-20260228-063000",
  "updated_at": "2026-02-28T06:31:00+09:00"
}
```

### 5.4 `md_watchlist`
`/api/v1/watchlist` 一覧API専用の非正規化テーブル。

- PK: `ticker`
- SK: なし
- GSI1:
1. `GSI1PK = is_active`（`true`/`false`）
2. `GSI1SK = updated_at_epoch`（number）

意図:
- デフォルトの `is_active=true` で高速絞り込み。
- `ScanIndexForward=false` で `updated_at` 降順を実現。
- `q_ticker` 指定時は `PK=ticker` の `GetItem` で直接取得する。
- `system_code` / `category_code` は当面 FilterExpression で適用し、必要に応じて将来 GSI 追加を検討する。

主な属性:
- `ticker`
- `is_active`
- `category_code`
- `systems` (list[string])
- `latest_decisions_by_system` (map)
- `updated_at`
- `updated_at_epoch`

サンプル:
```json
{
  "ticker": "AAPL",
  "is_active": true,
  "category_code": "MEGA_TECH",
  "systems": ["DMP", "TGB"],
  "latest_decisions_by_system": {
    "DMP": "BUY",
    "TGB": "NO_SIGNAL"
  },
  "updated_at": "2026-02-28T06:31:00+09:00",
  "updated_at_epoch": 1772237460
}
```

### 5.5 `md_batch_runs`
バッチ実行結果の監査・調査・将来拡張（履歴画面/再実行判断）用。

- PK: `system_code`
- SK: `RUN#{run_started_at_iso}#{run_id}`
- GSI1:
1. `GSI1PK = run_id`
2. `GSI1SK = system_code`

主な属性:
- `run_id`
- `status`
- `run_started_at`
- `run_finished_at`
- `duration_sec`
- `target_count`
- `decision_count`
- `error_summary`
- `result_s3_uri`（必要時）

サンプル:
```json
{
  "system_code": "DMP",
  "run_key": "RUN#2026-02-28T06:30:00+09:00#DMP-20260228-063000",
  "run_id": "DMP-20260228-063000",
  "status": "SUCCEEDED",
  "run_started_at": "2026-02-28T06:30:00+09:00",
  "run_finished_at": "2026-02-28T06:31:27+09:00",
  "duration_sec": 87,
  "target_count": 312,
  "decision_count": 23,
  "updated_at": "2026-02-28T06:31:27+09:00"
}
```

### 5.6 マスタ移行テーブル
#### `md_systems`
- PK: `system_code`
- 属性: `system_name`, `created_at`, `updated_at`

#### `md_instrument_categories`
- PK: `category_code`
- 属性: `name`, `description`, `created_at`, `updated_at`

#### `md_exchanges`
- PK: `exchange_code`
- 属性: `name`, `country_code`

#### `md_currencies`
- PK: `currency_code`
- 属性: `name`

#### `md_instruments`
- PK: `instrument_key`（`{ticker}#{exchange_code}`）
- GSI1: `ticker` + `exchange_code`
- 属性: `ticker`, `exchange_code`, `currency_code`, `category_code`, `asset_type`, `name`, `is_active`, `updated_at`

#### `md_system_instruments`
- PK: `system_code`
- SK: `INSTRUMENT#{ticker}#{exchange_code}`
- GSI1:
1. `GSI1PK = INSTRUMENT#{ticker}#{exchange_code}`
2. `GSI1SK = SYSTEM#{system_code}`
- 属性: `is_active`, `source`, `valid_from`, `valid_to`, `updated_at`

サンプル（`md_system_instruments`）:
```json
{
  "system_code": "DMP",
  "record_key": "INSTRUMENT#AAPL#NASDAQ",
  "is_active": true,
  "source": "TradingView",
  "valid_from": "2024-01-01",
  "valid_to": null,
  "updated_at": "2026-02-28T06:00:00+09:00"
}
```

## 6. API別の読み取り方法
### 6.1 `GET /api/v1/public/summary`
1. `md_public_summary` から `PK=PUBLIC`, `SK=CURRENT` を `GetItem`
2. レスポンスへそのままマッピング

### 6.2 `GET /api/v1/summary`
1. `md_system_latest_status` を全件取得
2. Lambdaで `system_count`, `latest_run_at`, `status_counts` を集計
3. `systems[]` を返却

### 6.3 `GET /api/v1/systems/{system_code}/latest`
1. `md_system_latest_signals` を `PK=system_code` で `Query`
2. `META#LATEST` をヘッダ、`SIGNAL#...` を `signals[]` に整形
3. `signals[]` は取得順（入札優先度順）を維持
4. API 契約は `BUY` 以外の判定も許容するが、初期運用では保存件数を抑えるため `md_system_latest_signals` には主に `BUY` を登録する想定とする

### 6.4 `GET /api/v1/watchlist`
1. `is_active` 未指定なら `true` を補完
2. `q_ticker` 指定時は `PK=ticker` で `GetItem` し、追加条件があれば Lambda 側で判定
3. `q_ticker` 未指定時は `md_watchlist` の GSI1 を `is_active` で `Query`、`ScanIndexForward=false`
4. `system_code/category_code` は FilterExpression で適用し、`limit` 件に達するまで必要な範囲を読み進める
5. `LastEvaluatedKey` を API の `next_cursor` に変換して返す

## 7. 書き込みフロー（日次運用）
### 7.1 バッチLambda（各システム）
1. `md_batch_runs` に run履歴を Put
2. `md_system_latest_status` を system単位で Upsert
3. `md_system_latest_signals` の当該 `system_code` を最新runで置換
4. `md_watchlist` を ticker単位で Upsert（`latest_decisions_by_system` 更新）
5. `md_public_summary (PUBLIC/CURRENT)` の内部集計属性を増分更新
6. `month_key` が変わった場合は `month_*` をリセットして当月集計を開始

### 7.2 公開サマリ更新ジョブ（毎日12:00 JST）
1. `md_public_summary (PUBLIC/CURRENT)` の内部集計属性から公開返却属性を再計算
2. `updated_at` を12:00 JSTの時刻で更新
3. 必要時のみ検算目的で `md_batch_runs` と突合する
4. 必要に応じて `MONTH#YYYY-MM` 履歴も保存

## 8. MySQL -> DynamoDB 移行マッピング
| MySQL | DynamoDB | 備考 |
|---|---|---|
| `systems` | `md_systems` | `code -> system_code`, `name -> system_name` |
| `instrument_categories` | `md_instrument_categories` | `code` をPKに採用 |
| `exchanges` | `md_exchanges` | `code` をPKに採用 |
| `currencies` | `md_currencies` | `code` をPKに採用 |
| `instruments` | `md_instruments` | `ticker + exchange_code` を主キー化 |
| `system_instruments` | `md_system_instruments` | `PK=system_code`, `SK=INSTRUMENT#ticker#exchange_code` |

## 9. コスト/運用メモ
- 想定件数（watchlist ~ 821, system_instruments ~ 1272）では、オンデマンド課金で低コスト運用が可能。
- 件数増加を見込み、watchlist は初期段階から `limit/cursor` によるカーソルベースページングを採用する。
- `q_ticker` は完全一致とすることで DynamoDB 単体で安定運用しやすくする。
- 公開サマリは増分更新を基本とし、日次ジョブは再計算より整合確認を主目的とする。
