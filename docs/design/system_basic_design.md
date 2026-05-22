# Guppy システム基本設計

## 1. 文書目的
本書は、Guppy Webシステム全体の基本設計を定義する。  
対象は、公開トップページ、認証後画面、参照専用バックエンド API、日次バッチ、認証基盤、データストアを含むシステム全体構成であり、各サブシステムの責務分担と連携方式を明確化することを目的とする。

本書は全体設計の親文書として位置付け、フロントエンド、バックエンド、データ設計の詳細は各設計書へ委譲する。

## 2. 関連ドキュメント
- [Webシステム要件定義](../required/web_system_required.md)
- [フロントエンド基本設計](frontend_basic_design.md)
- [バックエンド基本設計](backend_basic_design.md)
- [DynamoDB データ設計](dynamodb_data_design.md)
- [CI/CD・リリースフロー設計](../operations/ci_cd_design.md)

## 3. スコープ

### 3.1 対象
- システム全体構成
- フロントエンド、バックエンド、バッチ、認証基盤の責務分担
- 認証フロー
- データフロー
- デプロイ単位
- 横断的な非機能要件

### 3.2 対象外
- フロントエンド画面詳細設計
- バックエンドの詳細 API 実装
- DynamoDB 属性レベルの詳細設計
- 売買ロジックそのもの

## 4. システム概要

### 4.1 システムの目的
Guppy Webシステムは、公開トップページで匿名集計情報を提供し、認証済み利用者に対してシステム横断サマリ、システム別最新実行結果、対象銘柄一覧を提供することを目的とする。

### 4.2 基本方針
- 公開情報と認証後情報を明確に分離する
- インフラは AWS サーバレス構成を前提とする
- API は読み取り専用とする
- バッチ処理と Web システムを疎結合に保つ
- 機密情報と戦略ロジックは公開リポジトリに含めない
- 業務日付と集計の意味は JST 基準で統一する

### 4.3 アーキテクチャ分類
本システムは以下の性質を持つ。

- システム構成: `Serverless Architecture`
- Web/API の責務分離: `Frontend / Backend Separation`
- API のデータ提供方式: `CQRS の read model 寄り`
- 実装構造: 小規模な `Modular Monolith`

## 5. 全体構成

### 5.1 論理構成
```text
利用者
  -> CloudFront
      -> S3 (Frontend)

利用者
  -> OIDC Login
      -> Cognito User Pools

利用者
  -> API Gateway
      -> Lambda (Backend API)
          -> DynamoDB (read model)

EventBridge Scheduler
  -> Batch Lambda
      -> DynamoDB 更新

運用者
  -> CloudWatch Logs / Alarms
```

### 5.2 主要構成要素
- `Frontend`
  - 公開トップ、ログイン導線、認証後画面を提供する
- `Authentication`
  - OIDC ベースで認証を提供する
- `Backend API`
  - 画面用の参照専用 API を提供する
- `Batch`
  - 日次実行で read model を更新する
- `Data Store`
  - DynamoDB に画面参照向けのデータを保持する
- `Monitoring`
  - ログ、メトリクス、アラームを提供する

## 6. サブシステム責務

### 6.1 フロントエンドの責務
- 公開トップページの表示
- ログイン導線の提供
- OIDC 認証フローの実行
- Access Token を付与した API 呼び出し
- 認証後画面の表示
- エラー表示、ローディング表示、レスポンシブ対応

### 6.2 バックエンドの責務
- 公開 API と認証必須 API の提供
- JWT Authorizer 通過後のリクエスト処理
- Path Parameter / Query Parameter の検証
- DynamoDB read model の参照
- 画面向けレスポンスへの整形
- エラー応答の統一

### 6.3 バッチの責務
- シグナル生成
- 実行結果の集計
- 最新状態の更新
- watchlist 向けデータの更新
- 公開サマリ向け集計値の更新
- バッチ実行履歴の保存

### 6.4 認証基盤の責務
- ログイン画面の提供
- ユーザー認証
- トークン発行
- API Gateway 連携のための JWT 提供

### 6.5 データストアの責務
- 画面表示向け read model の保持
- バッチ実行履歴の保持
- システムや銘柄などマスタデータの保持

## 7. 画面・API 対応

### 7.1 公開領域
- `/`
  - サービス概要
  - 匿名集計
  - 最終更新日時
  - `/login` への導線
- 利用 API
  - `GET /api/v1/public/summary`

### 7.2 認証後領域
- `/app`
  - システム横断サマリ
  - 利用 API: `GET /api/v1/summary`
- `/app/systems/{system_code}`
  - システム別最新実行結果
  - 利用 API: `GET /api/v1/systems/{system_code}/latest`
- `/app/watchlist`
  - 対象銘柄一覧
  - 利用 API: `GET /api/v1/watchlist`

## 8. 認証設計概要

### 8.1 認証方式
- OIDC を採用する
- 第一候補は Cognito User Pools とする
- フロントエンドは Authorization Code Flow + PKCE を採用する

### 8.2 認証フロー
本番環境では Cognito User Pools などの OIDC Provider を利用する。ローカル開発環境では Cognito に接続せず、開発用の認証バイパスで認証後画面へ遷移することを許容する。

```text
1. 利用者が /login にアクセスする
2. フロントエンドが OIDC ログイン画面へ遷移する
3. 認証成功後、フロントエンドが Access Token を取得する
4. フロントエンドは Authorization ヘッダ付きで API を呼び出す
5. API Gateway JWT Authorizer がトークンを検証する
6. 検証済みリクエストのみ Lambda に到達する
```

ローカル開発時は `/login` の遷移中表示後に `/app` へ遷移する。ただし、この経路は画面開発用の簡略フローであり、本番の認証・認可仕様を代替しない。本番環境では開発用認証バイパスを使用不可とする。

### 8.3 境界方針
- 公開 API は認証不要とする
- 認証必須 API は API Gateway で遮断する
- Lambda は検証済みクレームのみを信頼する

## 9. データフロー設計概要

### 9.1 参照フロー
```text
Batch -> DynamoDB read model 更新
Frontend -> Backend API 呼び出し
Backend API -> DynamoDB read model 参照
Backend API -> Frontend 向け JSON 応答
```

### 9.2 基本方針
- API リクエスト時に重い再計算を行わない
- バッチが事前整形したデータを返す
- 画面向け shape を DynamoDB に持たせる

## 10. デプロイ単位

### 10.1 分離方針
- フロントエンドとバックエンドは分離デプロイ可能とする
- バッチは Web システム本体とは別リポジトリ、別デプロイ単位とする

### 10.2 想定単位
- `Frontend`
  - S3 / CloudFront
- `Backend`
  - API Gateway / Lambda / DynamoDB / Cognito / Monitoring
- `Batch`
  - EventBridge Scheduler / Batch Lambda

### 10.3 インフラ管理
- バックエンドの AWS リソースは AWS CDK で管理する
- 環境差分は設定値として明示管理する
- コンソール手動設定への依存を避ける

## 11. 環境設計方針
- 環境ごとに callback URL、logout URL、許可ドメインを分離する
- 環境ごとに認証モードを明示し、本番は `oidc`、ローカル開発は `dev-bypass` を使用する
- 機密値は Secrets Manager または SSM Parameter Store に置く
- 公開リポジトリに秘密情報を含めない
- JST を基準タイムゾーンとして扱う

## 12. 横断的な非機能要件

### 12.1 セキュリティ
- 認証必須画面/API はアクセス制御する
- 最小権限の IAM を適用する
- 公開領域に機密情報を出さない
- トークン検証は API Gateway に集約する

### 12.2 可用性・信頼性
- バッチ失敗を検知できるようにする
- API 障害時に呼び出し元へ明確なエラーを返す
- 再実行手順を運用ドキュメント化する

### 12.3 性能
- 公開トップは体感上遅延しないことを目標とする
- API は通常操作で過大な待ち時間を発生させない
- API Lambda は VPC 非依存を原則とし、過剰なレイテンシを避ける

### 12.4 コスト
- 月額運用費は 8 USD 以下を目標とする
- 固定費の高い常時稼働サービスを採用しない
- ログ保持期間とログ量を適切に制御する

### 12.5 保守性
- フロント、バックエンド、バッチを疎結合に保つ
- 公開領域と認証後領域の責務を分離する
- 将来のシステム追加に対応しやすい構造にする

## 13. 監視・運用設計概要

### 13.1 監視対象
- API Gateway 4xx / 5xx
- Lambda エラー数
- Lambda 実行時間
- バッチ失敗
- CloudWatch Logs

### 13.2 通知
- バッチ失敗時は通知する
- API 障害率が閾値を超えた場合は通知する
- 通知チャネルの最終選定は別途運用設計で確定する

## 14. 詳細設計文書
- [フロントエンド基本設計](frontend_basic_design.md)
- [バックエンド基本設計](backend_basic_design.md)
- [DynamoDB データ設計](dynamodb_data_design.md)
- 認証設計
- 運用設計
- [CI/CD・リリースフロー設計](../operations/ci_cd_design.md)

## 15. 設計上の制約
- 初期段階では画面からのバッチ起動 API は対象外とする。ただし、将来的な追加可能性を妨げない構成とする
- 公開 API に個別銘柄や戦略ロジックを出さない
- バックエンドに売買ロジックを持ち込まない
- JST の意味を API 層やフロントエンド層で勝手に変換しない
