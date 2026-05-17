# Guppy バックエンドクラス設計

## 1. 文書目的
本書は、Guppy バックエンド本実装で採用する主要クラス、責務、依存方向、テスト境界を定義する。

対象は `apps/backend/src` 配下の Lambda アプリケーションコードであり、API Gateway、DynamoDB、Cognito、CDK などの AWS リソース定義そのものは対象外とする。

本設計では、継承階層を深く作るのではなく、read-only API に必要な責務境界を明確にし、テストしやすい小さな usecase / repository / DTO を中心に構成する。

## 2. 関連ドキュメント
- [バックエンド基本設計](/workspace/docs/design/backend_basic_design.md)
- [バックエンド実装メモ](/workspace/docs/design/backend_implementation_memo.md)
- [DynamoDB データ設計](/workspace/docs/design/dynamodb_data_design.md)
- [フロントエンド API 契約](/workspace/docs/design/frontend_api_contract.md)
- [Backend README](/workspace/apps/backend/README.md)

## 3. 設計方針
- handler は薄く保ち、API Gateway event の取り出しと HTTP response 変換に集中する。
- usecase は 1 つの API ユースケースの実行手順を調整する。
- parser は path / query parameter の parse、既定値補完、入力検証を担当する。
- assembler は DynamoDB item や repository result から API response shape への変換、集計、表示用値変換を担当する。
- repository は DynamoDB のキー、Query / GetItem / Scan 相当の呼び出し、item shape を閉じ込める。
- domain / dto は API 契約と DynamoDB item の型を明確にする。
- settings は環境変数と本番向け禁止値の検証を一箇所に集約する。
- cursor は watchlist のページング状態を opaque string として扱い、HMAC 署名付きで改ざん検知する。
- 共通基底クラスや巨大な汎用 repository は、実装上の重複が明確になるまで導入しない。

## 4. パッケージ構成
```text
apps/backend/src/
├─ handlers/
│  ├─ public/
│  │  └─ get_public_summary.py
│  ├─ summary/
│  │  └─ get_summary.py
│  ├─ systems/
│  │  └─ get_system_latest.py
│  └─ watchlist/
│     └─ get_watchlist.py
├─ usecases/
│  ├─ get_public_summary.py
│  ├─ get_app_summary.py
│  ├─ get_system_latest.py
│  └─ get_watchlist.py
├─ parsers/
│  ├─ system_code_parser.py
│  └─ watchlist_query_parser.py
├─ assemblers/
│  ├─ public_summary_assembler.py
│  ├─ app_summary_assembler.py
│  ├─ system_latest_assembler.py
│  └─ watchlist_assembler.py
├─ repositories/
│  ├─ dynamodb_client.py
│  ├─ public_summary_repository.py
│  ├─ system_latest_status_repository.py
│  ├─ system_latest_signal_repository.py
│  └─ watchlist_repository.py
├─ domain/
│  ├─ public_summary.py
│  ├─ app_summary.py
│  ├─ system_latest.py
│  ├─ watchlist.py
│  └─ cursor.py
├─ lib/
│  ├─ settings.py
│  ├─ errors.py
│  ├─ response.py
│  ├─ validators.py
│  └─ cursor_codec.py
└─ middleware/
   └─ logger.py
```

## 5. 依存方向
```text
handler
  -> usecase
      -> parser
      -> repository protocol
          -> DynamoDB repository implementation
      -> assembler
      -> domain / dto
      -> lib.cursor_codec
  -> lib.response
  -> lib.errors
  -> lib.settings

repository implementation
  -> repositories.dynamodb_client
  -> domain / dto
  -> lib.settings
  -> boto3

domain
  -> 標準ライブラリ / pydantic のみ
```

repository implementation は DynamoDB item を domain DTO に変換して返す。repository は API response model を返さず、API 契約への最終整形は assembler が担当する。

本設計の `domain` は、現時点では振る舞いを持つ rich domain model ではなく、DynamoDB item、API response、query、cursor などを表す pydantic DTO / schema model として扱う。API 側にドメイン不変条件や業務判断が増えた場合のみ、値オブジェクトや振る舞いを持つ model への発展を検討する。

禁止する依存:
- `repository` から `usecase` へ依存しない。
- `domain` から `handler` / `usecase` / `repository` へ依存しない。
- `handler` に DynamoDB のキー構造を書かない。
- `usecase` に boto3 の呼び出しを書かない。
- `usecase` に response mapping の詳細や cursor 署名処理を直接書かない。

## 6. 主要クラス一覧

| レイヤ | クラス / Protocol | 主責務 |
|---|---|---|
| settings | `BackendSettings` | 環境変数の読み込み、テーブル名、CORS、Cognito、cursor secret、本番禁止値の検証 |
| errors | `AppError` | API エラーの基底。HTTP status、code、message を持つ |
| errors | `InvalidQueryError` | query / path parameter の不正 |
| errors | `InvalidCursorError` | cursor decode、署名検証、filter 不一致の不正 |
| errors | `NotFoundError` | read model が存在しない |
| response | `ApiResponseBuilder` | 成功 / 失敗の JSON HTTP response を生成 |
| cursor | `WatchlistCursorPayload` | watchlist cursor の payload |
| cursor | `WatchlistCursorFilters` | cursor と query の一致検証に使う filter |
| cursor | `CursorCodec` | HMAC 署名付き cursor の encode / decode |
| repository | `PublicSummaryRepository` | 公開サマリ取得の Protocol |
| repository | `DynamoDbPublicSummaryRepository` | `md_public_summary` の DynamoDB 実装 |
| repository | `SystemLatestStatusRepository` | システム横断サマリ取得の Protocol |
| repository | `DynamoDbSystemLatestStatusRepository` | `md_system_latest_status` の DynamoDB 実装 |
| repository | `SystemLatestSignalRepository` | システム別最新結果取得の Protocol |
| repository | `DynamoDbSystemLatestSignalRepository` | `md_system_latest_signals` の DynamoDB 実装 |
| repository | `WatchlistRepository` | watchlist 取得の Protocol |
| repository | `DynamoDbWatchlistRepository` | `md_watchlist` の DynamoDB 実装 |
| parser | `SystemCodeParser` | `system_code` path parameter の検証 |
| parser | `WatchlistQueryParser` | watchlist query parameter の parse、既定値補完、検証 |
| assembler | `PublicSummaryAssembler` | 公開サマリ item から response への変換、`success_rate` 変換 |
| assembler | `AppSummaryAssembler` | システム横断サマリの件数集計と response 組み立て |
| assembler | `SystemLatestAssembler` | システム別最新結果の meta / signals 整形 |
| assembler | `WatchlistAssembler` | watchlist repository page から response への変換、next cursor 付与 |
| usecase | `GetPublicSummaryUseCase` | 公開サマリ API の実行手順を調整 |
| usecase | `GetAppSummaryUseCase` | システム横断サマリ API の実行手順を調整 |
| usecase | `GetSystemLatestUseCase` | システム別最新結果 API の実行手順を調整 |
| usecase | `GetWatchlistUseCase` | watchlist API の実行手順を調整 |

## 7. Settings 設計

### 7.1 `BackendSettings`
環境変数を読み込み、バックエンド全体で使う設定を表す。

主な属性:
- `env_name`
- `aws_region`
- `dynamodb_endpoint_url`
- `public_summary_table_name`
- `system_latest_status_table_name`
- `system_latest_signals_table_name`
- `watchlist_table_name`
- `cognito_issuer_url`
- `cognito_audience`
- `allowed_origins`
- `cursor_signing_secret`

責務:
- 必須環境変数の検証
- `ENV_NAME=prd` で dummy / localhost / local endpoint / 空値を拒否
- `CURSOR_SIGNING_SECRET` の長さと禁止語を検証
- settings を handler / repository / cursor codec へ渡す

非責務:
- AWS Secrets Manager / SSM Parameter Store から直接値を取得する処理
- API Gateway JWT Authorizer の検証そのもの

## 8. Error / Response 設計

### 8.1 `AppError`
API として制御可能なエラーを表す。

主な属性:
- `status_code`
- `code`
- `message`

派生クラス:
- `InvalidQueryError`
- `InvalidCursorError`
- `NotFoundError`
- `RepositoryError`

### 8.2 `ApiResponseBuilder`
Lambda handler が返す API Gateway response を生成する。

主なメソッド:
- `ok(body: Mapping[str, Any]) -> dict[str, Any]`
- `error(error: AppError, request_id: str | None) -> dict[str, Any]`
- `unexpected_error(request_id: str | None) -> dict[str, Any]`

方針:
- 正常系・異常系ともに `application/json`
- `request_id` が取得できる場合はエラー応答に含める
- 内部例外や機密情報は message に含めない

## 9. Cursor 設計

### 9.1 `WatchlistCursorFilters`
cursor と現在 query parameter の一致検証に使う filter を表す。

主な属性:
- `is_active`
- `system_code`
- `category_code`
- `q_ticker`
- `sort`
- `limit`

### 9.2 `WatchlistCursorPayload`
watchlist のページング状態を表す。

主な属性:
- `v`
- `exclusive_start_key`
- `filters`

### 9.3 `CursorCodec`
HMAC 署名付き cursor を encode / decode する。

主なメソッド:
- `encode(payload: WatchlistCursorPayload) -> str`
- `decode(cursor: str) -> WatchlistCursorPayload`
- `assert_filters_match(payload: WatchlistCursorPayload, current_filters: WatchlistCursorFilters) -> None`

実装方針:
- API に返す cursor は、内部 JSON を `base64url` でエンコードした opaque string とする。
- `base64url` エンコード前の内部 JSON は `{"payload": ..., "sig": ...}` とする。
- フロントエンドは cursor の中身を decode せず、次回リクエストにそのまま渡す。
- `payload` は `json.dumps(payload, separators=(",", ":"), sort_keys=True)` で正規化して署名する。
- 署名には `CURSOR_SIGNING_SECRET` と HMAC-SHA256 を使う。
- 署名比較には timing attack を避けるため `hmac.compare_digest` を使う。
- decode 失敗、署名不一致、未対応 version、filter 不一致は `InvalidCursorError` とする。
- `q_ticker` と `limit` も filter 一致検証対象に含める。
- cursor 発行後に `limit` を変更した次ページ取得は `InvalidCursorError` とする。
- 発行済み cursor や署名そのものは保存しない。

## 10. Repository 設計

### 10.1 共通方針
repository は DynamoDB item の保存形を扱う。

repository の Protocol は、各 repository module に実装クラスと並べて定義する。

例:
- `repositories/public_summary_repository.py`
  - `PublicSummaryRepository`
  - `DynamoDbPublicSummaryRepository`
- `repositories/watchlist_repository.py`
  - `WatchlistRepository`
  - `DynamoDbWatchlistRepository`

初期実装では `repositories/protocols.py` のような集約 module は作らない。

assembler が API 契約へ変換するため、repository は以下を行わない。
- `success_rate` の百分率変換
- API response shape への最終整形
- HTTP status の決定
- API Gateway event の解釈

### 10.2 `PublicSummaryRepository`
```python
class PublicSummaryRepository(Protocol):
    def get_current(self) -> PublicSummaryItem | None:
        ...
```

`DynamoDbPublicSummaryRepository` は `md_public_summary` から `summary_scope=PUBLIC`、`summary_key=CURRENT` を `GetItem` する。

### 10.3 `SystemLatestStatusRepository`
```python
class SystemLatestStatusRepository(Protocol):
    def list_all(self) -> list[SystemLatestStatusItem]:
        ...
```

`DynamoDbSystemLatestStatusRepository` は `md_system_latest_status` を全件取得する。

システム件数は少ない前提だが、DynamoDB の pagination は repository 内で吸収する。

### 10.4 `SystemLatestSignalRepository`
```python
class SystemLatestSignalRepository(Protocol):
    def list_by_system_code(self, system_code: str) -> list[SystemLatestSignalItem]:
        ...
```

`DynamoDbSystemLatestSignalRepository` は `PK=system_code` で Query し、`META#LATEST` と `SIGNAL#...` を含む item を取得する。

取得順は DynamoDB の sort key 順を維持する。

### 10.5 `WatchlistRepository`
```python
class WatchlistRepository(Protocol):
    def get_by_ticker(self, ticker: str) -> WatchlistItem | None:
        ...

    def query_page(self, query: WatchlistRepositoryQuery) -> WatchlistRepositoryPage:
        ...
```

`DynamoDbWatchlistRepository` は以下を担当する。
- `q_ticker` 指定時は `GetItem`
- `q_ticker` 未指定時は GSI query
- `LastEvaluatedKey` の受け渡し
- `system_code` / `category_code` の FilterExpression
- `limit` 件に達するまでの読み進め

## 11. UseCase / Parser / Assembler 設計

### 11.1 共通方針
usecase は、1 つの API ユースケースの実行手順を調整する。

usecase に直接書かないもの:
- path / query parameter の細かい parse
- DynamoDB item から API response への mapping
- HMAC 署名の具体処理
- status count などの集計詳細
- boto3 呼び出し

肥大化の兆候:
- `execute()` が 50 行を超える
- private method が増え続ける
- DynamoDB item の属性名が usecase に出てくる
- response mapping のテストが usecase test に大量に混ざる

上記が起きた場合は、parser、assembler、policy、validator へ切り出す。

### 11.2 Parser
parser は外部入力を domain query object へ変換する。

主なクラス:
- `SystemCodeParser`
- `WatchlistQueryParser`

責務:
- path / query parameter の文字列を解釈する
- `is_active` 未指定時に `true` を補完する
- `sort` 未指定時も `updated_at_desc` として扱う
- `limit` を `1..100` で検証する
- 不正値は `InvalidQueryError` にする

### 11.3 Assembler
assembler は repository result を API response model へ変換する。

主なクラス:
- `PublicSummaryAssembler`
- `AppSummaryAssembler`
- `SystemLatestAssembler`
- `WatchlistAssembler`

責務:
- DynamoDB item model を API response model へ変換する
- `success_rate` を `0..1` から `0..100` へ変換する
- `system_count`、`latest_run_at`、`status_counts` を算出する
- `META#LATEST` と `SIGNAL#...` を API response へ整形する
- `next_cursor` を response に付与する
- 公開禁止項目を response に含めない

### 11.4 `GetPublicSummaryUseCase`
主なメソッド:
- `execute() -> PublicSummaryResponse`

責務:
- `PublicSummaryRepository.get_current()` を呼ぶ
- item がなければ `NotFoundError`
- `PublicSummaryAssembler` を呼んで response を作る

### 11.5 `GetAppSummaryUseCase`
主なメソッド:
- `execute() -> AppSummaryResponse`

責務:
- `SystemLatestStatusRepository.list_all()` を呼ぶ
- `AppSummaryAssembler` を呼んで response を作る

### 11.6 `GetSystemLatestUseCase`
主なメソッド:
- `execute(system_code_text: str) -> SystemLatestResponse`

責務:
- `SystemCodeParser` で `system_code` を検証する
- `SystemLatestSignalRepository.list_by_system_code()` を呼ぶ
- `SystemLatestAssembler` を呼んで response を作る

### 11.7 `GetWatchlistUseCase`
主なメソッド:
- `execute(raw_query: Mapping[str, str]) -> WatchlistResponse`

責務:
- `WatchlistQueryParser` で query を parse する
- cursor があれば `CursorCodec.decode()` と filter 一致検証を行う
- repository へ query を渡す
- `LastEvaluatedKey` があれば `CursorCodec.encode()` で `next_cursor` を作る
- `WatchlistAssembler` を呼んで response を作る

## 12. Handler 設計

handler は関数として実装し、クラス化しない。

各 handler の責務:
- API Gateway event から path / query parameter を取り出す
- request id を取得する
- usecase を呼び出す
- `ApiResponseBuilder` で response を返す
- `AppError` を捕捉してエラー response に変換する
- 想定外例外はログ出力し、汎用 `500` を返す

handler に書かないもの:
- DynamoDB のキー構造
- `success_rate` 変換
- cursor の署名検証
- status count の集計

## 13. DTO / Domain 設計

DTO / Domain model は pydantic model で統一する。

外部入力、DynamoDB item、API response shape の検証価値が高いため、dataclass は初期実装では採用しない。

現時点の domain model は、DDD の rich domain model ではなく、層間で受け渡す DTO / schema model として扱う。したがって、DynamoDB item model、API response model、query model、cursor payload などを同じ `domain` package に置くが、それぞれの用途は class 名と module 名で区別する。

主な model:
- `PublicSummaryItem`
- `PublicSummaryResponse`
- `SystemLatestStatusItem`
- `AppSummaryResponse`
- `SystemLatestSignalItem`
- `SystemLatestResponse`
- `WatchlistItem`
- `WatchlistResponse`
- `WatchlistQuery`
- `WatchlistRepositoryQuery`
- `WatchlistRepositoryPage`

方針:
- DynamoDB item model と API response model は分ける。
- DynamoDB item model は保存形を表す。
- API response model は `frontend_api_contract.md` の shape を表す。
- query / cursor / repository page などの内部 DTO も pydantic model で表現する。
- repository implementation は DynamoDB item model へ変換して返す。
- repository は API response model を返さない。
- assembler は DynamoDB item model または repository result を API response model へ変換する。
- 日時文字列は JST の意味を壊さず、API 層で UTC に読み替えない。

## 14. テスト境界

### 14.1 Unit Test
対象:
- usecase
- parser
- assembler
- validators
- cursor codec
- settings
- response builder

方針:
- repository は Protocol に対する fake で差し替える。
- DynamoDB Local の本番相当データに依存しない。
- `success_rate` 変換、cursor 署名不一致、filter 不一致、NotFound を必ず検証する。
- response mapping の詳細は assembler test に寄せ、usecase test は呼び出し順とエラー境界を中心に検証する。

### 14.2 Repository Test
対象:
- DynamoDB repository implementation

方針:
- 初期実装では `moto` を使う。
- `Stubber` は初期実装では採用しない。
- ローカル DynamoDB は手動確認または結合確認に使う。
- 本番相当データを fixture として Git 管理しない。

### 14.3 Handler Test
対象:
- API Gateway event から response までの薄い結合

方針:
- usecase を fake に差し替える。
- `AppError` が正しい HTTP response に変換されることを確認する。
- 想定外例外は汎用 `500` になることを確認する。

## 15. 実装順序
クラス設計に沿った初期実装は以下の順で進める。

1. `BackendSettings`
2. `AppError` と `ApiResponseBuilder`
3. `PublicSummaryItem` / `PublicSummaryResponse`
4. `PublicSummaryRepository` Protocol と fake
5. `PublicSummaryAssembler`
6. `GetPublicSummaryUseCase`
7. `get_public_summary` handler
8. `DynamoDbPublicSummaryRepository`
9. `CursorCodec` と cursor domain model
10. parser / assembler / usecase の形を他 API に展開

## 16. Metrics 方針
初期実装では CloudWatch metrics 用の wrapper class は作らない。

まずは構造化ログで、調査や将来の判断に必要な値を出力する。

watchlist repository では、将来の read model 追加判断に使えるよう、以下をログに含める。

- DynamoDB Query 回数
- `ScannedCount`
- `Count`
- 返却件数
- `LastEvaluatedKey` の有無
- 適用した filter 条件

CloudWatch custom metrics が必要になった場合のみ、`AppMetrics` のような小さな wrapper class を追加する。

powertools の metrics API を usecase や repository に直接広げず、追加時は wrapper に閉じ込める。
