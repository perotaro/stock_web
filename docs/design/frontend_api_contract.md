# Guppy フロントエンド API 契約

## 1. 文書目的
本書は、Guppy フロントエンドが利用する API 契約を定義する。  
対象は、公開トップページ、認証後サマリ、システム別最新結果、watchlist 一覧で利用する参照専用 API である。

本書はバックエンド内部実装の詳細ではなく、フロントエンドが何を送信し、何を受信し、どのように扱うかを明確化することを目的とする。

## 2. 関連ドキュメント
- [Webシステム要件定義](../required/web_system_required.md)
- [システム基本設計](system_basic_design.md)
- [フロントエンド基本設計](frontend_basic_design.md)
- [バックエンド基本設計](backend_basic_design.md)
- [DynamoDB データ設計](dynamodb_data_design.md)

## 3. 前提

### 3.1 ドメイン未確定時の扱い
- 本書作成時点では、本番の公開ドメインおよび API ドメインは未確定である。
- そのため、API の外部公開 URL は固定ドメインではなく `VITE_API_BASE_URL` を基準に定義する。
- フロントエンド実装では `apiRequest()` に `/v1/...` を渡し、最終 URL は `VITE_API_BASE_URL + /v1/...` として組み立てる。
- `VITE_API_BASE_URL` の例:
  - 同一オリジン配下で API を公開する場合: `/api`
  - 別ドメイン API を利用する場合: `https://api.example.com/api`

### 3.2 本書で固定するもの
- エンドポイントのパス
- 認証要否
- path/query parameter
- レスポンス shape
- ステータスコードごとのフロントエンド側取り扱い

### 3.3 本書で未確定のまま残すもの
- 本番ドメイン
- OIDC の実運用 `redirect_uri`
- `post_logout_redirect_uri`
- CORS 許可 origin
- `canonical URL`

## 4. 共通仕様

### 4.1 ベース URL
- フロントエンドは `VITE_API_BASE_URL` を用いて API を呼び出す。
- 実リクエスト URL の例:
  - `VITE_API_BASE_URL=/api`
  - `GET /v1/public/summary`
  - 最終 URL: `/api/v1/public/summary`

### 4.2 認証
- 公開 API を除き、認証必須 API には `Authorization: Bearer <access_token>` を付与する。
- 認証方式は `OIDC Authorization Code Flow + PKCE` を前提とする。
- トークン検証は API Gateway JWT Authorizer が担う。

### 4.3 リクエストヘッダ
- 共通ヘッダ:
  - `Accept: application/json`
- 認証必須 API の追加ヘッダ:
  - `Authorization: Bearer <access_token>`
- `GET` リクエストでは、フロントエンドから `Content-Type` を明示付与してもよい。

### 4.4 レスポンス形式
- 正常系・異常系ともに `application/json` を前提とする。
- 日時はタイムゾーンを含む ISO 8601 文字列とする。
- 画面表示上の意味は JST 基準で扱う。

### 4.5 エラー応答形式
異常系レスポンスは以下を基本 shape とする。

```json
{
  "code": "not_found",
  "message": "対象データが存在しません。",
  "request_id": "optional-request-id"
}
```

- `code` は機械判定用の安定した値とする。
- `message` はログまたは運用向けの簡潔な文言とし、内部実装や機密情報を含めない。
- `request_id` は生成または取得できる場合は必ず返す。利用できない環境では省略してよい。

### 4.6 共通ステータスコード方針
| ステータス | 意味 | フロントエンド側の基本挙動 |
|---|---|---|
| `200` | 正常 | 画面表示を更新する |
| `400` | 入力不正 | 利用者に条件見直しを促す |
| `401` | 未認証 | 再ログイン導線へ戻す |
| `403` | 認可失敗 | 再ログイン導線またはトップへ戻す |
| `404` | データ未存在 | 空状態または対象なし表示を行う |
| `422` | 条件不正 | `400` と同様に扱う |
| `500` | 想定外障害 | 汎用エラー + 再試行導線を表示する |
| `503` | 一時障害 | 汎用エラー + 再試行導線を表示する |

## 5. エンドポイント一覧
| API | 利用画面 | 認証 | 主な入力 | 主な利用項目 | 想定 Query Key |
|---|---|---|---|---|---|
| `GET {VITE_API_BASE_URL}/v1/public/summary` | `/` | 不要 | なし | `operating_days`, `batch_runs_total`, `success_rate`, `avg_duration_sec`, `updated_at` | `['publicSummary']` |
| `GET {VITE_API_BASE_URL}/v1/summary` | `/app` | 必須 | なし | `system_count`, `latest_run_at`, `status_counts`, `systems[]` | `['appSummary']` |
| `GET {VITE_API_BASE_URL}/v1/systems/{system_code}/latest` | `/app/systems/:system_code` | 必須 | Path: `system_code` | `system_code`, `system_name`, `latest_run_at`, `signals[]`, `updated_at` | `['systemLatest', systemCode]` |
| `GET {VITE_API_BASE_URL}/v1/watchlist` | `/app/watchlist` | 必須 | Query: `q_ticker`, `is_active`, `system_code`, `category_code`, `sort`, `limit`, `cursor` | `items[]`, `next_cursor` | `['watchlist', filters, limit]` |

## 6. API 詳細

### 6.1 `GET {VITE_API_BASE_URL}/v1/public/summary`

#### 6.1.1 用途
- 公開トップページ `/` の匿名集計サマリ表示に利用する。

#### 6.1.2 認証
- 不要

#### 6.1.3 リクエスト
- Path Parameter: なし
- Query Parameter: なし

#### 6.1.4 正常レスポンス
```json
{
  "operating_days": 7,
  "batch_runs_total": 1284,
  "success_rate": 98.4,
  "avg_duration_sec": 12.4,
  "updated_at": "2026-04-10T12:00:00+09:00"
}
```

#### 6.1.5 項目定義
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `operating_days` | `number` | 必須 | 当月稼働日数。0 以上の整数 |
| `batch_runs_total` | `number` | 必須 | 総実行回数。0 以上の整数 |
| `success_rate` | `number` | 必須 | 当月成功率。`0` から `100` の百分率 |
| `avg_duration_sec` | `number` | 必須 | 当月平均処理時間（秒） |
| `updated_at` | `string` | 必須 | 最終更新日時。ISO 8601 形式 |

#### 6.1.6 フロントエンド側取り扱い
- `updated_at` は JST 表示に整形する。
- 数値表示時の単位は UI 側で明示する。
- 項目欠損時は API 契約違反として扱い、利用者向けには汎用エラー文言を表示する。

### 6.2 `GET {VITE_API_BASE_URL}/v1/summary`

#### 6.2.1 用途
- 認証後トップ `/app` のシステム横断サマリ表示に利用する。

#### 6.2.2 認証
- 必須

#### 6.2.3 リクエスト
- Path Parameter: なし
- Query Parameter: なし

#### 6.2.4 正常レスポンス
```json
{
  "system_count": 2,
  "latest_run_at": "2026-04-10T06:30:00+09:00",
  "status_counts": {
    "succeeded": 1,
    "failed": 0,
    "not_run": 1
  },
  "systems": [
    {
      "system_code": "DMP",
      "system_name": "Dynamic Momentum Pullback",
      "latest_status": "SUCCEEDED",
      "latest_run_at": "2026-04-10T06:30:00+09:00",
      "updated_at": "2026-04-10T06:31:00+09:00"
    },
    {
      "system_code": "TGB",
      "system_name": "Trend Guard Breakout",
      "latest_status": "NOT_RUN",
      "latest_run_at": null,
      "updated_at": "2026-04-10T06:31:00+09:00"
    }
  ]
}
```

#### 6.2.5 項目定義
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `system_count` | `number` | 必須 | システム数 |
| `latest_run_at` | `string \| null` | 必須 | 全システム横断の最新実行日時 |
| `status_counts` | `object` | 必須 | システム状態ごとの件数 |
| `status_counts.succeeded` | `number` | 必須 | `SUCCEEDED` 件数 |
| `status_counts.failed` | `number` | 必須 | `FAILED` 件数 |
| `status_counts.not_run` | `number` | 必須 | `NOT_RUN` 件数 |
| `systems` | `array` | 必須 | システム別最新状態一覧 |
| `systems[].system_code` | `string` | 必須 | システム識別子 |
| `systems[].system_name` | `string` | 必須 | システム表示名 |
| `systems[].latest_status` | `'SUCCEEDED' \| 'FAILED' \| 'NOT_RUN'` | 必須 | 最新状態 |
| `systems[].latest_run_at` | `string \| null` | 必須 | システム単位の最新実行日時 |
| `systems[].updated_at` | `string` | 必須 | 当該 read model の更新日時 |

#### 6.2.6 フロントエンド側取り扱い
- `systems[]` は API 返却順をそのまま利用してよい。
- `latest_status` は UI で日本語ラベルまたは status pill に変換する。
- `latest_run_at` が `null` の場合は「未実行」扱いとする。

### 6.3 `GET {VITE_API_BASE_URL}/v1/systems/{system_code}/latest`

#### 6.3.1 用途
- `/app/systems/:system_code` の最新実行結果表示に利用する。

#### 6.3.2 認証
- 必須

#### 6.3.3 リクエスト
| 種別 | 名前 | 型 | 必須 | 説明 |
|---|---|---|---|---|
| Path | `system_code` | `string` | 必須 | 対象システムコード |

#### 6.3.4 正常レスポンス
```json
{
  "system_code": "DMP",
  "system_name": "Dynamic Momentum Pullback",
  "latest_run_id": "DMP-20260410-063000",
  "latest_run_at": "2026-04-10T06:30:00+09:00",
  "updated_at": "2026-04-10T06:31:00+09:00",
  "signals": [
    {
      "priority_rank": 1,
      "ticker": "AAPL",
      "name": "Apple Inc.",
      "decision": "BUY",
      "reason": "EMA20 support and ATR contraction",
      "run_id": "DMP-20260410-063000"
    },
    {
      "priority_rank": 2,
      "ticker": "MSFT",
      "name": "Microsoft Corporation",
      "decision": "NO_SIGNAL",
      "reason": "Breakout pending",
      "run_id": "DMP-20260410-063000"
    }
  ]
}
```

#### 6.3.5 項目定義
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `system_code` | `string` | 必須 | システム識別子 |
| `system_name` | `string` | 必須 | システム表示名 |
| `latest_run_id` | `string \| null` | 必須 | 最新実行 ID |
| `latest_run_at` | `string \| null` | 必須 | 最新実行日時 |
| `updated_at` | `string` | 必須 | read model 更新日時 |
| `signals` | `array` | 必須 | 最新シグナル一覧 |
| `signals[].priority_rank` | `number` | 必須 | 入札優先度。昇順で返却する |
| `signals[].ticker` | `string` | 必須 | 銘柄コード |
| `signals[].name` | `string` | 必須 | 銘柄名。未解決の場合は空文字を許容し、画面は `ticker` を表示名として扱う |
| `signals[].decision` | `string` | 必須 | 判定結果。初期運用で返却される値は `BUY`, `NO_SIGNAL` のみ。将来的な追加ステータスもあり得る |
| `signals[].reason` | `string \| null` | 必須 | 判定理由。画面初期版では非表示でもよい |
| `signals[].run_id` | `string` | 必須 | 当該シグナルの run ID |

#### 6.3.6 フロントエンド側取り扱い
- `signals[]` の並びは API 返却順を維持し、フロントエンドで再ソートしない。
- 初期運用で返却される `decision` は `BUY` と `NO_SIGNAL` のみとする。将来的に追加ステータスが返ってきても表示できるようにする。
- `latest_run_id = null` かつ `latest_run_at = null` かつ `signals = []` の場合は、`200` の正常系空状態として扱う。
- 不明な `system_code` は `404` を想定する。

### 6.4 `GET {VITE_API_BASE_URL}/v1/watchlist`

#### 6.4.1 用途
- `/app/watchlist` の対象銘柄一覧、検索、絞り込みに利用する。

#### 6.4.2 認証
- 必須

#### 6.4.3 リクエスト

| 種別 | 名前 | 型 | 必須 | 既定値 | 説明 |
|---|---|---|---|---|---|
| Query | `q_ticker` | `string` | 任意 | なし | 銘柄コード完全一致 |
| Query | `system_code` | `string` | 任意 | なし | システムコード完全一致 |
| Query | `category_code` | `string` | 任意 | なし | カテゴリコード完全一致 |
| Query | `is_active` | `boolean` | 任意 | `true` | 有効銘柄絞り込み |
| Query | `sort` | `'updated_at_desc'` | 任意 | `updated_at_desc` | 並び順 |
| Query | `limit` | `number` | 任意 | `50` | 1回の取得件数。`1` 以上 `100` 以下 |
| Query | `cursor` | `string` | 任意 | なし | 次ページ取得用の opaque cursor |

##### 6.4.3.1 フロント入力値と Query Parameter の対応

- 対応
  - filterValues.ticker : `q_ticker`
  - filterValues.systemCode : `system_code`
  - filterValues.categoryCode : `category_code`
  - filterValues.isActive : `is_active`
- 補足
  - 空文字は query parameter に含めない
  - preview data はクライアント側で絞り込まず、API query でサーバー側に条件を渡す
  - 初回表示の `is_active=true` を UI 側既定値として持つ

#### 6.4.4 正常レスポンス
```json
{
  "items": [
    {
      "ticker": "AAPL",
      "is_active": true,
      "category_code": "MEGA_TECH",
      "systems": ["DMP", "TGB"],
      "latest_decisions_by_system": {
        "DMP": "BUY",
        "TGB": "NO_SIGNAL"
      },
      "updated_at": "2026-04-10T06:31:00+09:00"
    },
    {
      "ticker": "MSFT",
      "is_active": true,
      "category_code": "MEGA_TECH",
      "systems": ["DMP", "TGB"],
      "latest_decisions_by_system": {
        "DMP": "NO_SIGNAL"
      },
      "updated_at": "2026-04-10T06:15:00+09:00"
    }
  ],
  "next_cursor": "opaque-cursor-example"
}
```

#### 6.4.5 項目定義
| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `items` | `array` | 必須 | watchlist 一覧 |
| `items[].ticker` | `string` | 必須 | 銘柄コード |
| `items[].is_active` | `boolean` | 必須 | 有効フラグ |
| `items[].category_code` | `string` | 必須 | カテゴリコード |
| `items[].systems` | `array[string]` | 必須 | 該当銘柄を扱うシステムコード一覧 |
| `items[].latest_decisions_by_system` | `record<string, string>` | 必須 | システムごとの最新判定。初期運用で返却される値は `BUY` または `NO_SIGNAL`。`systems[]` に含まれる system の key が常に存在するとは限らない |
| `items[].updated_at` | `string` | 必須 | 最終更新日時 |
| `next_cursor` | `string \| null` | 必須 | 次ページ取得用 cursor。末尾ページでは `null` |

#### 6.4.6 フロントエンド側取り扱い
- 初回表示時は `is_active=true` を既定値としてリクエストする。
- `sort` は初期実装では `updated_at_desc` 固定とする。
- `watchlist` は `useInfiniteQuery` 相当の段階取得を前提とし、`cursor` は Query Key に含めず page param として扱う。
- 条件変更時は `cursor` をクリアして先頭ページから再取得する。
- `next_cursor != null` の場合のみ追加取得導線を表示する。
- モバイルではカード表示、タブレット以上では表形式表示にする。
- `latest_decisions_by_system` は初期運用では `BUY` / `NO_SIGNAL` を想定するが、将来的な追加ステータスも表示できるようにする。
- `systems[]` に含まれる system に対応する decision が `latest_decisions_by_system` に存在しない場合、フロントエンドは API 契約違反ではなく「未判定」として表示する。
- `items = []` は正常系の空状態として扱う。

## 7. ステータスコード別方針

### 7.1 `400` / `422`
- 主な発生源:
  - 不正な query/path parameter
  - 許可していない `sort`
  - 不正な `limit` / `cursor`
- フロントエンド側挙動:
  - 入力条件の見直しを促す
  - 自動再試行は行わない

### 7.2 `401` / `403`
- 主な発生源:
  - 未認証
  - セッション切れ
  - 認可失敗
- フロントエンド側挙動:
  - 認証必須画面ではセッション切れとして扱う
  - 必要に応じて認証状態を破棄し、`/login` へ戻す

### 7.3 `404`
- 主な発生源:
  - 存在しない `system_code`
- フロントエンド側挙動:
  - `/app/systems/:system_code` では対象なし表示を行う
  - `watchlist` の 0 件は `404` ではなく `200 + items: []` を期待する

### 7.4 `500` / `503`
- 主な発生源:
  - 一時障害
  - 想定外例外
- フロントエンド側挙動:
  - 汎用エラーを表示する
  - 利用者向けに `再試行` 導線を提供する
  - 自動再試行は `httpClient` の共通方針に従い限定的に行う

## 8. モックレスポンス作成方針
- テストおよび UI 実装のモックは、本書のレスポンス shape を正とする。
- 数値や日時の実例は固定値を使い、日次更新時刻に依存して不安定化しないようにする。
- `watchlist` モックは以下を最低限含む。
  - `items` が 1 件以上あるケース
  - `items = []` の空状態ケース
  - `is_active=false` を含むケース
  - `next_cursor != null` の追加取得可能ケース
  - `next_cursor = null` の末尾ページケース
- `system latest` モックは以下を最低限含む。
  - `signals` が複数件あるケース
  - `latest_run_at = null` の未実行ケース
  - `404` の対象なしケース

## 9. フロントエンド型・schema 対応方針
- 各 API には `Zod schema` を定義し、レスポンス検証を行う。
- 想定 schema 名は以下とする。
  - `publicSummarySchema`
  - `appSummarySchema`
  - `systemLatestSchema`
  - `watchlistSchema`
- `decision` および `latest_decisions_by_system` の値は将来拡張に備え、schema 上は enum 固定ではなく文字列として扱う。
- schema 検証失敗は API 契約違反として扱い、利用者向けには内部詳細を見せず汎用エラー表示とする。

## 10. 未確定事項
- 本番 `VITE_API_BASE_URL` の実値
