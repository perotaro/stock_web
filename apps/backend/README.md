# Guppy Backend

## 概要

`apps/backend` は、フロントエンドからのリクエストを受けて API Gateway + Lambda 経由で DynamoDB を参照し、画面向けのレスポンスを返すバックエンド層です。

このリポジトリの責務は API と DB 参照に限定します。公開サマリや各システムの最新実行結果を生成・更新するバッチ処理は別リポジトリで管理します。

実装は `docs/design/backend_class_design.md` と `docs/design/backend_implementation_memo.md` を基準に、薄い handler、API ごとの usecase、入力 parser、レスポンス assembler、DynamoDB repository を分離しています。

## 責務

- 公開 API と認証必須 API の提供
- JWT Authorizer で検証済みクレームを前提としたアクセス制御
- クエリ文字列・Path Parameter の検証
- DynamoDB からの参照データ取得
- 画面表示に適したレスポンス整形
- 失敗時の明確なエラーレスポンス返却

## 非責務

- バッチ実行そのもの
- EventBridge Scheduler の設定管理
- 売買ロジックやシグナル生成
- データモデルの詳細設計
- 画面からバッチを起動する API の提供
- 要件外の書き込み系 API の提供

## 提供 API

### 公開 API

- `GET /api/v1/public/summary`
  - 認証不要
  - 公開トップ向けの匿名集計を返す
  - 個別銘柄、閾値、当日シグナル生データは返さない
  - Lambda handler: `handlers.public.get_public_summary.lambda_handler`

### 認証必須 API

- `GET /api/v1/summary`
  - `/app` 向けのシステム横断サマリを返す
  - `systems[]` に `system_code` と `system_name` を含める
  - Lambda handler: `handlers.summary.get_summary.lambda_handler`

- `GET /api/v1/systems/{system_code}/latest`
  - `/app/systems/{system_code}` 向けの最新実行結果を返す
  - `signals[]` は保存済みの優先度順を維持して返す
  - Lambda handler: `handlers.systems.get_system_latest.lambda_handler`

- `GET /api/v1/watchlist`
  - `/app/watchlist` 向けの対象銘柄一覧を返す
  - `q_ticker` は完全一致
  - `is_active` のデフォルトは `true`
  - 並び順は `updated_at` 降順
  - `sort` は `updated_at_desc` のみ許可する
  - `limit` のデフォルトは `50`、許可範囲は `1..100`
  - `cursor` は HMAC 署名付き opaque string として扱う
  - Lambda handler: `handlers.watchlist.get_watchlist.lambda_handler`

## 認証

- 認証方式は OIDC を前提とします
- フロントエンドは `Authorization: Bearer <token>` で Access Token を送信します
- API Gateway の JWT Authorizer がトークンを検証します
- 未認証・無効トークン・期限切れトークンは `401/403` を返します
- Lambda は検証済みクレームのみを信頼します

## 時刻の扱い

- 業務日付、月次集計、更新日時の意味は JST 基準です
- API 層で日付を再解釈して UTC 基準に置き換えないでください
- `datetime` はタイムゾーン付きで扱い、naive datetime を避けてください

## ディレクトリ構成

```text
apps/backend/
├─ src/
│  ├─ handlers/      # API Gateway 入口。event 解析と HTTP response 変換に限定する
│  ├─ usecases/      # API ごとの実行手順を調整する
│  ├─ parsers/       # path/query parameter の parse と検証
│  ├─ assemblers/    # DynamoDB item から API response shape への変換
│  ├─ repositories/  # DynamoDB の key / Query / GetItem / Scan を閉じ込める
│  ├─ domain/        # pydantic DTO。DynamoDB item、API response、query、cursor を表す
│  ├─ lib/           # settings、errors、response、cursor codec などの共通処理
│  ├─ main.py        # 結合確認用 HTTP ルーター
│  └─ local_dev_server.py
├─ tests/
│  ├─ test_local_dev_server.py
│  └─ unit/
├─ AGENTS.md
├─ README.md
└─ requirements.txt
```

## 実装構成

### handler

`src/handlers` は Lambda entrypoint です。API Gateway event から path/query parameter と request id を取り出し、usecase の結果を `ApiResponseBuilder` で HTTP response に変換します。

handler に DynamoDB の key 構造、`success_rate` の変換、cursor 署名検証、status 集計を書かないでください。

### usecase

`src/usecases` は API ごとの実行手順を調整します。repository、parser、assembler、cursor codec を組み合わせますが、boto3 呼び出しや response mapping の詳細は持ちません。

### parser / assembler

`src/parsers` は外部入力を内部 query object へ変換します。不正値は `InvalidQueryError` として扱います。

`src/assemblers` は DynamoDB item を API 契約に沿った response model へ変換します。公開サマリの `success_rate` は DynamoDB の `0..1` 比率から API の `0..100` 百分率へここで変換します。

### repository

`src/repositories` は DynamoDB の保存形とアクセスパターンを閉じ込めます。各 repository module には Protocol と DynamoDB 実装を並べて置いています。

repository implementation は DynamoDB item を domain DTO に変換して返します。ただし API response model は返さず、API 契約への最終整形は assembler が担当します。

`watchlist` は `q_ticker` 指定時に `GetItem`、未指定時に `gsi_active_updated_at` query を使います。`system_code` と `category_code` は初期実装では FilterExpression で適用します。

### domain / lib

`src/domain` は pydantic model で DTO を定義します。現時点では rich domain model ではなく、DynamoDB item、API response、query、cursor などを表す schema model として扱います。DynamoDB item model と API response model は分けています。

`src/lib` には以下を配置します。

- `settings.py`: 環境変数の読み込みと `ENV_NAME=prd` の危険値拒否
- `errors.py`: API エラー階層
- `response.py`: API Gateway proxy response 生成
- `cursor_codec.py`: HMAC-SHA256 署名付き cursor encode/decode

## 開発ルール

- `handler` は薄く保ち、リクエスト解析とレスポンス整形に集中させる
- API ごとの実行手順は `usecase` に置く
- 入力検証は `parser`、レスポンス変換は `assembler` に置く
- DynamoDB との入出力は `repository` に閉じ込める
- 公開関数・メソッドは型ヒント必須
- 関数には日本語の Google スタイル docstring を付ける
- モジュール名・関数名・変数名は `snake_case`、定数は `UPPER_SNAKE_CASE`
- 公開 API に機密情報や内部ロジックを出さない
- JST 前提の業務日付や更新日時を API 層で UTC に読み替えない

## セットアップ

```bash
pip install -r apps/backend/requirements.txt
```

## 環境変数

初期実装では未指定時に local 用の既定値を使います。本番 `ENV_NAME=prd` では dummy、example、localhost、local 用 endpoint、短すぎる cursor secret を拒否します。

| 変数 | 用途 | local 既定値 |
|---|---|---|
| `ENV_NAME` | 実行環境名。`prd` の場合は危険値検証を強化する | `local` |
| `AWS_REGION` | DynamoDB client の region | `ap-northeast-1` |
| `DYNAMODB_ENDPOINT_URL` | DynamoDB Local などの endpoint override | 未指定 |
| `PUBLIC_SUMMARY_TABLE_NAME` | 公開サマリテーブル | `md_public_summary` |
| `SYSTEM_LATEST_STATUS_TABLE_NAME` | システム最新状態テーブル | `md_system_latest_status` |
| `SYSTEM_LATEST_SIGNALS_TABLE_NAME` | システム別最新結果テーブル | `md_system_latest_signals` |
| `WATCHLIST_TABLE_NAME` | watchlist テーブル | `md_watchlist` |
| `COGNITO_ISSUER_URL` | API Gateway JWT Authorizer と合わせる issuer | `http://localhost:9000/dummy` |
| `COGNITO_AUDIENCE` | API Gateway JWT Authorizer と合わせる audience | `guppy-web-local` |
| `ALLOWED_ORIGINS` | CORS 許可 origin。カンマ区切り | `http://localhost:5173` |
| `CURSOR_SIGNING_SECRET` | watchlist cursor の HMAC 署名 secret | `local-dev-cursor-secret` |

local 環境値の例:

```bash
export ENV_NAME=local
export AWS_REGION=ap-northeast-1
export DYNAMODB_ENDPOINT_URL=http://dynamodb-local:8000
export PUBLIC_SUMMARY_TABLE_NAME=md_public_summary
export SYSTEM_LATEST_STATUS_TABLE_NAME=md_system_latest_status
export SYSTEM_LATEST_SIGNALS_TABLE_NAME=md_system_latest_signals
export WATCHLIST_TABLE_NAME=md_watchlist
export ALLOWED_ORIGINS=http://localhost:5173
export COGNITO_ISSUER_URL=http://localhost:9000/dummy
export COGNITO_AUDIENCE=guppy-web-local
export CURSOR_SIGNING_SECRET=local-dev-cursor-secret
```

## ローカル実行コンテナ

ルートの [`compose.yml`](/workspace/compose.yml) には `backend_dev` サービスを用意しています。`DynamoDB Local` はこのリポジトリ内では起動せず、バッチ側 compose が起動している共有インスタンスを利用する前提です。

```bash
docker compose up -d backend_dev
docker compose logs -f backend_dev
```

- 既定ポートは `8080`
- `DYNAMODB_ENDPOINT_URL` の既定値は `http://dynamodb-local:8000`
- `backend_dev` は `apps/backend/src/main.py` を起動し、HTTP request を Lambda handler に委譲します
- `apps/backend/src/local_dev_server.py` はフロントエンド開発用の固定レスポンスサーバーとして残しています
- 固定レスポンスサーバーを使いたい場合は、明示的に `python apps/backend/src/local_dev_server.py` を実行してください
- `main.py` の `watchlist` cursor は HMAC 署名付き opaque string です。`local_dev_server.py` の `offset:<number>` cursor とは互換性がありません

結合用 HTTP ルーターの確認例:

```bash
curl http://localhost:8080/healthz
curl http://localhost:8080/api/v1/public/summary
curl http://localhost:8080/api/v1/summary
curl 'http://localhost:8080/api/v1/systems/DMP/latest'
curl 'http://localhost:8080/api/v1/watchlist?limit=10&is_active=true'
```

`main.py` は API Gateway JWT Authorizer をローカルで再現しません。認証必須 API も、ローカル結合では handler に直接委譲されます。認証境界は API Gateway / IaC 側の設定と handler テストで確認してください。

## テスト・静的解析

```bash
pytest apps/backend/tests
ruff check apps/backend
ruff format --check apps/backend
mypy apps/backend
```

整形を適用する場合:

```bash
ruff format apps/backend
```

## テスト方針

- 正常系、異常系、認可境界を振る舞いベースで検証する
- 公開 API が匿名集計のみを返すことを検証する
- 認証必須 API が未認証や無効トークンで `401/403` を返すことを検証する
- `systems/{system_code}/latest` が最新実行結果のみを返し、保存済み順序を維持することを検証する
- `watchlist` の完全一致検索、既定値、並び順、ページングを検証する
- DynamoDB や JWT クレームなどの外部依存はモック化する
- 本番相当データを fixture や seed JSON として Git 管理しない
- cursor 署名不一致、filter 不一致、limit 変更時の `invalid_cursor` を検証する

## DynamoDB read model 前提

API は read-only です。以下の read model が別リポジトリのバッチ処理で更新済みである前提で参照します。

| API | テーブル | 主なアクセス |
|---|---|---|
| `GET /api/v1/public/summary` | `md_public_summary` | `summary_scope=PUBLIC`, `summary_key=CURRENT` の `GetItem` |
| `GET /api/v1/summary` | `md_system_latest_status` | 全件 `Scan`。システム数が少ない前提 |
| `GET /api/v1/systems/{system_code}/latest` | `md_system_latest_signals` | `system_code` を PK に `Query` |
| `GET /api/v1/watchlist` | `md_watchlist` | `q_ticker` は `GetItem`、一覧は `gsi_active_updated_at` query |

## 参照ドキュメント

- [AGENTS.md](./AGENTS.md)
- [web_system_required.md](../../docs/required/web_system_required.md)
- [backend_basic_design.md](../../docs/design/backend_basic_design.md)
- [backend_class_design.md](../../docs/design/backend_class_design.md)
- [backend_implementation_memo.md](../../docs/design/backend_implementation_memo.md)
- [dynamodb_data_design.md](../../docs/design/dynamodb_data_design.md)
- [frontend_api_contract.md](../../docs/design/frontend_api_contract.md)
