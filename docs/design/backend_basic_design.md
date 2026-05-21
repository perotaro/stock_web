# Guppy バックエンド基本設計

## 1. 文書目的
本書は、Guppy Webシステムにおけるバックエンドの基本設計を定義する。  
対象は、参照専用 API を提供する AWS サーバレスバックエンドであり、Lambda アプリケーション構造、API 設計方針、DynamoDB 参照方針、認証連携、CDK によるインフラ管理方針を明確化することを目的とする。

## 2. 関連ドキュメント
- [Webシステム要件定義](/workspace/docs/required/web_system_required.md)
- [DynamoDB データ設計](/workspace/docs/design/dynamodb_data_design.md)
- [Backend README](/workspace/apps/backend/README.md)

## 3. スコープ

### 3.1 対象
- API Gateway + Lambda による参照 API
- Lambda アプリケーションの責務分割
- DynamoDB read model の参照方式
- OIDC / JWT Authorizer を利用した認証連携
- AWS CDK によるバックエンドインフラ管理
- ログ、監視、テストの基本方針

### 3.2 対象外
- 売買ロジックそのもの
- シグナル生成バッチの詳細実装
- フロントエンド画面設計
- DynamoDB の属性定義の詳細
- バッチ実行 UI

## 4. 前提
- バックエンドは読み取り専用 API のみを提供する。
- バッチ実行、集計更新、最新シグナル生成は別リポジトリで管理する。
- バッチが DynamoDB の read model を更新し、バックエンドはそれを返却する。
- 認証は OIDC を前提とし、第一候補は Cognito User Pools とする。
- 業務日付、月次集計、更新日時の意味は JST 基準とする。
- 月額運用費は 8 USD 以下を目標とし、高い固定費を避ける。

## 5. バックエンドアーキテクチャ概要

### 5.1 アーキテクチャ分類
本バックエンドは以下の性質を持つ。

- システム構成: `Serverless Architecture`
- アプリケーション構造: `Layered Architecture`
- データ参照思想: `CQRS の read model 寄り`
- サービス分割: `Modular Monolith`

### 5.2 採用理由
- API 本数が少なく、すべて参照専用である
- 固定費を抑えやすい
- API Gateway と Lambda の組み合わせで責務分離しやすい
- バッチ側と API 側を疎結合に保てる
- バックエンドで再集計せず、DynamoDB の read model を返す構成に適している

### 5.3 論理構成
```text
Client
  -> API Gateway (HTTP API)
      -> Lambda Handler
          -> UseCase
              -> Parser / Assembler / CursorCodec
              -> Repository
                  -> DynamoDB read model

Client
  -> OIDC Login
      -> Access Token
          -> API Gateway JWT Authorizer
```

## 6. 技術スタック設計

### 6.1 採用スタック
| レイヤ | 採用技術 | 主用途 | 採用理由 |
|---|---|---|---|
| 言語 | `Python 3.11` | Lambda 実装 | AWS Lambda との親和性が高く、読みやすさと実装速度のバランスがよい |
| API 実行基盤 | `AWS Lambda` | API 実行 | 参照専用 API の本数と負荷規模に対して十分であり、固定費を抑えやすい |
| API 公開 | `API Gateway HTTP API` | ルーティング、認証連携、HTTP 公開 | JWT Authorizer と組み合わせやすく、REST API より軽量でコストも抑えやすい |
| データストア | `DynamoDB` | read model の参照 | バッチが整形したデータを低運用コストで保持でき、Lambda から直接参照しやすい |
| 認証基盤 | `Cognito User Pools` | OIDC 認証、JWT 発行 | OIDC 準拠で API Gateway 連携がしやすく、第一候補として妥当である |
| IaC | `AWS CDK` | AWS リソース定義、デプロイ | Lambda、API Gateway、DynamoDB、Cognito、監視設定を一貫してコード管理できる |
| AWS SDK | `boto3` | DynamoDB 参照、AWS サービス操作 | Python での AWS 標準 SDK であり、公式サポートが安定している |
| ログ/計測補助 | `aws-lambda-powertools` | 構造化ログ、メトリクス、トレーシング補助 | Lambda 向けの実装定石に沿いやすく、観測性を過不足なく確保しやすい |
| 入出力検証 | `pydantic` | query/path/response の検証 | 型安全に入力値やレスポンス shape を扱え、不正値の早期検知に向く |
| テスト | `pytest` + `pytest-mock` + `moto` | 単体テスト、モック、DynamoDB テスト補助 | Python バックエンドで標準的に使いやすく、外部依存を分離した検証がしやすい |
| 品質 | `ruff` + `mypy` | 静的解析、整形、型検査 | 軽量に品質を担保でき、CI にも載せやすい |

### 6.2 技術選定方針

#### `Python 3.11`
- Lambda 実装で一般的かつ安定している
- ドキュメント記述やテストのしやすさを含め、保守性と開発速度のバランスがよい
- バックエンドの責務が read-only API 中心であり、過度に複雑なランタイムを必要としない

#### `AWS Lambda + API Gateway HTTP API`
- 参照専用 API が 4 本であり、まずは小さく始める構成に向いている
- 固定費を抑えやすく、要件のコスト目標に合う
- 認証必須 API を JWT Authorizer で API Gateway 側に寄せやすい

#### `DynamoDB`
- API が read model を返す構成であり、キー設計と非正規化で要求アクセスパターンを満たしやすい
- バッチ側と API 側を疎結合に保ちやすい
- 当面の件数規模ではオンデマンド課金でシンプルに運用しやすい

#### `AWS CDK`
- バックエンド関連リソースを AWS ネイティブに管理しやすい
- API Gateway、Lambda、DynamoDB、Cognito、CloudWatch、IAM を一貫してコード化できる
- GitHub Actions によるデプロイフローと接続しやすい

#### `boto3`
- AWS 公式 SDK であり、DynamoDB 参照を素直に実装できる
- 専用 ORM を挟まず、アクセスパターンに即した実装を維持しやすい

#### `aws-lambda-powertools`
- 構造化ログや相関 ID の扱いを標準化しやすい
- 最初から過剰な observability 基盤を入れずに、Lambda 運用に必要な基本を押さえられる

#### `pydantic`
- query/path parameter や環境変数の検証に使いやすい
- Lambda handler 内で雑に dict を扱うより、入力の破壊や誤解釈を防ぎやすい

### 6.3 採用しない候補

#### `FastAPI`
- API 開発体験はよいが、今回の規模ではフレームワークの恩恵より抽象化コストが先に立つ
- API Gateway がルーティングと認証を担う前提なら、Lambda handler を薄く保つ方が理解しやすい
- OpenAPI 自動生成の価値はあるが、まずは構成を単純に保つことを優先する

#### `Flask`
- 軽量ではあるが、Lambda 前提では `FastAPI` と比べても決定的な優位が小さい
- 今回は Web フレームワークを入れず、責務の小さい handler 構成の方が適している

#### `RDS / MySQL`
- 今回の API は read model を返す構成であり、DynamoDB の方がアクセスパターンに合う
- サーバレス構成全体のコストと運用負荷を抑えたい要件とも一致する
- 常時稼働や接続管理を伴う構成は、現段階では過剰である

#### `ECS / Fargate`
- 常時稼働寄りの構成となり、今回の規模とコスト要件に対して重い
- 参照専用 API 4 本を提供する段階では、Lambda の方がシンプルで説明しやすい

## 7. AWS 構成設計

### 7.1 採用サービス
- `API Gateway (HTTP API)`
- `AWS Lambda`
- `DynamoDB`
- `Cognito User Pools`
- `CloudWatch Logs`
- `CloudWatch Alarms`
- `IAM`
- `SSM Parameter Store` または `Secrets Manager`

### 7.2 構成方針
- API は API Gateway で公開する
- 認証必須 API は JWT Authorizer を通す
- Lambda は API ごとの handler を持つ
- Lambda は DynamoDB の read model のみ参照する
- 機密値や環境依存値は Parameter Store または Secrets Manager で管理する

### 7.3 ネットワーク方針
- API Lambda は原則 VPC に入れない
- DynamoDB 参照のみであれば VPC は不要とする
- コールドスタート増加と構成複雑化を避ける

## 8. API 設計

### 8.1 提供 API 一覧
| API | 認証 | 主用途 | 参照テーブル |
|---|---|---|---|
| `GET /api/v1/public/summary` | 不要 | 公開トップ向け匿名集計 | `md_public_summary` |
| `GET /api/v1/summary` | 必須 | ログイン後サマリ | `md_system_latest_status` |
| `GET /api/v1/systems/{system_code}/latest` | 必須 | システム別最新実行結果 | `md_system_latest_signals` |
| `GET /api/v1/watchlist` | 必須 | 対象銘柄一覧 | `md_watchlist` |

### 8.2 API ごとの設計方針

#### `GET /api/v1/public/summary`
- 保存済みの匿名集計値を返す
- DynamoDB 上の `success_rate` は `0..1` の比率で保持し、API レスポンスでは `0..100` の百分率へ変換する
- 集計の再計算は行わない
- 個別銘柄、閾値、当日シグナル生データは返さない

#### `GET /api/v1/summary`
- システム別最新状態を取得する
- `system_count` `latest_run_at` `status_counts` は Lambda 側で整形する
- システム数が少ない前提で全件取得を採用する

#### `GET /api/v1/systems/{system_code}/latest`
- 指定 `system_code` の最新結果のみを返す
- `META#LATEST` をヘッダ情報として扱う
- `SIGNAL#...` を `signals[]` として返す
- API 契約上は `BUY` 以外の判定も許容するが、初期運用では保存件数を抑えるため `BUY` 中心の登録を想定する
- DynamoDB の並び順を維持し、優先度順を崩さない

#### `GET /api/v1/watchlist`
- `is_active` 未指定時は `true` を補完する
- `updated_at` 降順を前提に返す
- `q_ticker` は完全一致で扱い、指定時は `ticker` 主キーで直接取得する
- `q_ticker` 未指定時は `limit/cursor` によるカーソルベースページングを行う
- `system_code` / `category_code` は当面サーバー側フィルタで扱う

### 8.3 入力検証方針
- `system_code` は必須 Path Parameter とする
- `is_active` は boolean として解釈する
- `sort` は `updated_at_desc` のみ許可する
- `limit` は `1..100` の整数のみ許可する
- `cursor` は自APIが発行した opaque cursor のみ受け付ける
- 不正な query/path は `400 Bad Request` を返す

### 8.4 エラー応答方針
- 入力不正: `400`
- 未認証または認可失敗: `401/403`
- データ未存在: `404`
- 想定外障害: `500`

エラー応答は JSON 形式で統一する。

## 9. DynamoDB 参照設計

### 9.1 基本方針
バックエンドは DynamoDB を計算元データとして読むのではなく、画面表示用に整えられた read model を読む。

以下を原則とする。

- API リクエスト時に全件再集計しない
- 複雑な join を Lambda 側で行わない
- 画面表示に必要な shape のデータをそのまま返す

### 9.2 API とテーブルの対応
- `public/summary`
  - `md_public_summary` を `GetItem`
- `summary`
  - `md_system_latest_status` を全件取得
- `systems/{system_code}/latest`
  - `md_system_latest_signals` を `Query`
- `watchlist`
  - `q_ticker` 指定時は `md_watchlist` を `GetItem`
  - `q_ticker` 未指定時は `md_watchlist` の GSI を `Query`

### 9.3 バックエンドで持たない責務
- 当月成功率の再計算
- 平均処理時間の再計算
- シグナル優先度の再計算
- watchlist 構築のための複数テーブル join

## 10. Lambda アプリケーション設計

### 10.1 実装方針
- Web フレームワークは原則採用しない
- API Gateway がルーティングを担う
- Lambda では薄い handler と明確な責務分割を採用する

大きな Web フレームワークを採用しない理由は以下のとおり。

- API が少ない
- 全て GET の参照専用である
- Lambda 実行環境では過剰な抽象化の恩恵が小さい
- シンプルな構成の方が保守しやすい

### 10.2 採用ライブラリ方針
- 必須
  - `boto3`
  - `pytest`
- 推奨
  - `aws-lambda-powertools`
  - `pydantic`

### 10.3 レイヤ構造
- `handler`
  - API Gateway event を受ける入口
  - 入力値を取り出す
  - usecase を呼ぶ
  - HTTP レスポンスを返す
- `usecase`
  - API 単位のユースケース実行手順を調整する
  - parser、repository、assembler、cursor codec を組み合わせる
- `parser`
  - path / query parameter の parse、既定値補完、入力検証を行う
- `assembler`
  - repository の結果から API レスポンスを組み立てる
  - 集計や表示用値変換を行う
- `repository`
  - DynamoDB アクセスを閉じ込める
  - Query 条件や GetItem 条件を管理する
  - DynamoDB item を domain DTO に変換して返す
  - API レスポンス shape への最終整形は行わない
- `domain`
  - DynamoDB item、API response、query、cursor などの pydantic DTO を置く
  - 現時点では振る舞いを持つ rich domain model ではなく、層間で受け渡す schema model として扱う
- `lib`
  - validator、response、error、settings、cursor codec、logger を置く

### 10.4 依存方向
- `handler` -> `usecase` / `lib`
- `usecase` -> `parser` / `repository Protocol` / `assembler` / `domain` / `lib`
- `parser` -> `domain` / `lib`
- `assembler` -> `domain`
- `repository implementation` -> `domain` / `lib` / `boto3`
- `lib.cursor_codec` -> `domain.cursor`
- `domain` は `handler` / `usecase` / `parser` / `assembler` / `repository` / `lib` に依存しない

repository implementation は DynamoDB item を domain DTO に変換して返す。ただし repository は API response model を返さない。API response への最終変換、表示用値変換、公開禁止項目の除外は assembler が担当する。

本設計は、古典的なレイヤードアーキテクチャを土台にしつつ、repository Protocol による差し替え、DTO 分離、parser / assembler 分離を取り入れた実用的なレイヤード構成とする。厳密な Clean Architecture / Onion Architecture として、domain entity に振る舞いや不変条件を集約する段階までは踏み込まない。

### 10.5 想定ディレクトリ構成
```text
apps/backend/
├─ src/
│  ├─ handlers/
│  │  ├─ public/
│  │  │  └─ get_public_summary.py
│  │  ├─ summary/
│  │  │  └─ get_summary.py
│  │  ├─ systems/
│  │  │  └─ get_system_latest.py
│  │  └─ watchlist/
│  │     └─ get_watchlist.py
│  ├─ usecases/
│  ├─ parsers/
│  ├─ assemblers/
│  ├─ repositories/
│  ├─ domain/
│  ├─ middleware/
│  ├─ lib/
│  └─ tests/
├─ README.md
└─ requirements.txt
```

### 10.6 先に作る共通部品
- `lib/response.py`
- `lib/errors.py`
- `lib/validators.py`
- `lib/settings.py`
- `lib/cursor_codec.py`
- `parsers/watchlist_query_parser.py`
- `assemblers/public_summary_assembler.py`
- `middleware/logger.py`
- `repositories/dynamodb_client.py`

## 11. 認証・認可設計

### 11.1 認証方式
- OIDC を採用する
- 第一候補は Cognito User Pools とする
- フロントエンドは Authorization Code Flow + PKCE を採用する

### 11.2 バックエンド側の責務
- API Gateway で JWT Authorizer によるトークン検証を行う
- Lambda は検証済みクレームのみを信頼する
- Lambda で未検証トークンを独自に検証し直さない

### 11.3 公開 API と認証必須 API の分離
- `GET /api/v1/public/summary` は公開
- それ以外は認証必須
- 初期段階では画面からのバッチ起動 API は対象外とする。ただし、将来的な追加可能性を妨げない構成とする

## 12. CDK 設計

### 12.1 方針
- バックエンドの AWS リソースは AWS CDK で定義する
- コンソール手動設定を避け、再現性ある構成を維持する

### 12.2 CDK で管理する主なリソース
- API Gateway
- Lambda
- DynamoDB
- Cognito User Pools
- IAM Role / Policy
- CloudWatch Logs / Alarms

### 12.3 推奨ディレクトリ構成
```text
infra/cdk/
├─ app.py
├─ stacks/
│  ├─ api_stack.py
│  ├─ data_stack.py
│  ├─ auth_stack.py
│  └─ monitoring_stack.py
└─ requirements.txt
```

### 12.4 推奨スタック責務
- `data_stack`
  - DynamoDB テーブル定義
- `auth_stack`
  - User Pool
  - App Client
  - 認証関連設定
- `api_stack`
  - Lambda
  - API Gateway
  - Route
  - Authorizer 連携
- `monitoring_stack`
  - Alarm
  - ログ保持設定
  - 通知設定

## 13. ログ・監視設計

### 13.1 ログ方針
- 構造化ログを採用する
- リクエスト ID を必ず出力する
- `system_code` など調査に必要な主要項目を出力する
- 個人情報や機密情報を出力しない

### 13.2 監視方針
- Lambda エラー数を監視する
- API Gateway 4xx / 5xx を監視する
- Lambda 実行時間、スロットリングを監視する
- バッチ失敗通知は別途運用設計に従って通知する

## 14. テスト設計

### 14.1 テスト対象
- handler
- usecase
- parser
- assembler
- repository
- validator
- cursor codec
- エラー応答

### 14.2 最低限の確認項目
- `public/summary` が匿名集計のみを返す
- private API が未認証時に拒否される
- `systems/{system_code}/latest` が保存済み順序を維持する
- `watchlist` が `is_active=true` を既定値として扱う
- `watchlist` が `updated_at` 降順で返る
- `watchlist` が `limit/cursor` に従って段階取得できる
- 存在しない `system_code` に対して `404` を返す
- JST の日時文字列を壊さず返す

### 14.3 モック方針
- DynamoDB は Stubber またはモックを用いる
- JWT Authorizer 結果は API Gateway event に注入して扱う
- 外部依存を直接呼ばない

## 15. 実装順序
バックエンド実装は以下の順で進める。

1. `apps/backend/src` の雛形を作成する
2. 共通部品を実装する
3. `GET /api/v1/public/summary` を実装する
4. `GET /api/v1/summary` を実装する
5. `GET /api/v1/systems/{system_code}/latest` を実装する
6. `GET /api/v1/watchlist` を実装する
7. CDK で API Gateway / Lambda / DynamoDB / Cognito を配線する
8. CloudWatch Alarm とログ保持設定を追加する

## 16. 設計上の制約
- API は read-only を維持する
- バッチ責務を Lambda に持ち込まない
- JST の意味を UTC に読み替えない
- 公開 API に機密情報や個別銘柄情報を出さない
- 過剰設計は避け、小さな modular monolith として始める
