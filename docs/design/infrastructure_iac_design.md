# Guppy インフラ IaC 設計

## 1. 文書目的
本書は、Guppy Webシステムにおける AWS インフラの IaC 方針を定義する。  
対象は、フロントエンド配信基盤、バックエンド API 基盤、認証基盤、監視、GitHub Actions からのデプロイ権限であり、AWS CDK による再現性ある構成管理を目的とする。

アプリケーション実装の詳細は各基本設計へ委譲し、本書では AWS リソースの管理範囲、スタック分割、初期スコープと将来スコープを明確化する。

## 2. 関連ドキュメント
- [システム基本設計](system_basic_design.md)
- [フロントエンド基本設計](frontend_basic_design.md)
- [バックエンド基本設計](backend_basic_design.md)
- [DynamoDB データ設計](dynamodb_data_design.md)
- [CI/CD・リリースフロー設計](../operations/ci_cd_design.md)

## 3. スコープ

### 3.1 対象
- AWS CDK による Web システム向け AWS リソース定義
- フロントエンド配信基盤
- バックエンド API 基盤
- 認証基盤
- 監視、ログ保持、アラームの基本設定
- GitHub Actions から AWS へデプロイするための IAM Role / Policy
- 環境ごとの差分管理方針

### 3.2 対象外
- アプリケーションコードの詳細実装
- バッチリポジトリ側のインフラ詳細
- 手動デプロイ手順の詳細
- 独自ドメイン、ACM、Route 53 の設定
- WAF の設定

## 4. 基本方針
- Web システムの AWS リソースは原則として AWS CDK で定義する。
- コンソール手動設定に依存せず、差分を Pull Request でレビューできる状態にする。
- フロントエンドとバックエンドは分離デプロイ可能にする。
- 環境差分は CDK context または環境別設定として明示管理する。
- GitHub Actions からの AWS 認証は GitHub OIDC を利用し、長期アクセスキーを保存しない。
- 初期段階では小さく始め、独自ドメイン、WAF、高度な監視は必要になった段階で追加する。

## 5. 初期スコープ

### 5.1 フロントエンド配信基盤
初期段階では、フロントエンド配信基盤として以下を CDK 管理対象とする。

- `S3`
  - Vite の `dist/` 配置先
  - public access は無効化する
- `CloudFront`
  - HTTPS 配信
  - SPA fallback
  - キャッシュ制御
- `CloudFront OAC`
  - CloudFront から S3 への private access
- `S3 Bucket Policy`
  - CloudFront OAC 経由の参照のみ許可する
- `IAM Role / Policy`
  - GitHub Actions から S3 同期と CloudFront invalidation を実行するための最小権限
- `SSM Parameter Store`
  - デプロイワークフローが参照する bucket 名、CloudFront distribution ID などの非機密値

### 5.2 バックエンド API 基盤
初期段階では、バックエンド API 基盤として以下を CDK 管理対象とする。

- `API Gateway HTTP API`
- `AWS Lambda`
- `DynamoDB`
- `Cognito User Pools`
- `IAM Role / Policy`
- `CloudWatch Logs`
- `CloudWatch Alarms`
- `SSM Parameter Store` または `Secrets Manager`

### 5.3 CI/CD 連携基盤
初期段階では、GitHub Actions からのデプロイに必要な以下を CDK 管理対象とする。

- GitHub OIDC Provider
- 環境別の AssumeRole 用 IAM Role
- backend deploy 用 Policy
- frontend deploy 用 Policy

## 6. 将来スコープ
以下は初期段階では導入しない。必要になった段階で、本書と CI/CD 設計を更新してから追加する。

- 独自ドメイン
- `ACM`
- `Route 53`
- `WAF`
- CloudFront access logs
- 詳細なセキュリティヘッダ管理
- フロントエンド専用の詳細アラーム

## 7. 推奨 CDK ディレクトリ構成
```text
infra/cdk/
├─ app.py
├─ config/
│  ├─ dev.py
│  ├─ stg.py
│  └─ prd.py
├─ stacks/
│  ├─ frontend_hosting_stack.py
│  ├─ api_stack.py
│  ├─ data_stack.py
│  ├─ auth_stack.py
│  ├─ monitoring_stack.py
│  └─ github_oidc_stack.py
└─ requirements.txt
```

## 8. 推奨スタック責務

### 8.1 `frontend_hosting_stack`
- S3 bucket
- CloudFront distribution
- CloudFront OAC
- S3 bucket policy
- SPA fallback
- キャッシュ方針
- デプロイワークフロー向けの出力値または SSM Parameter

### 8.2 `data_stack`
- DynamoDB table
- read model 参照に必要な index
- table stream は初期段階では原則使用しない

### 8.3 `auth_stack`
- Cognito User Pool
- App Client
- callback URL
- logout URL
- API Gateway JWT Authorizer 連携に必要な値

### 8.4 `api_stack`
- Lambda
- API Gateway HTTP API
- Route
- Authorizer 連携
- Lambda 実行 Role / Policy

### 8.5 `monitoring_stack`
- CloudWatch Logs retention
- CloudWatch Alarms
- 必要に応じた通知設定

### 8.6 `github_oidc_stack`
- GitHub OIDC Provider
- GitHub Actions 用 IAM Role
- backend deploy 用 Policy
- frontend deploy 用 Policy

## 9. 環境差分管理
- 環境は `dev` `stg` `prd` を想定する。
- 初期段階では `prd` のみ先行してよいが、CDK の構成は複数環境を前提にする。
- 環境ごとに以下を明示する。
  - AWS account
  - AWS region
  - resource name prefix
  - Cognito callback URL
  - Cognito logout URL
  - API base URL
  - CloudFront distribution ID
  - frontend hosting bucket name
- 機密値は CDK context に直接置かず、Secrets Manager または SSM Parameter Store で管理する。

## 10. デプロイ方針
- CDK は AWS リソース定義と更新を担当する。
- バックエンドデプロイでは、Lambda コードと API 関連リソースを CDK で更新する。
- フロントエンドデプロイでは、CDK が配信基盤を作成し、GitHub Actions が `dist/` を S3 に同期する。
- フロントエンドのデプロイ後、必要に応じて CloudFront invalidation を実行する。
- Pull Request では `cdk synth` と `cdk diff` によりインフラ差分を確認する。

## 11. 設計上の制約
- S3 bucket は public access を許可しない。
- フロントエンド静的ファイルは CloudFront 経由でのみ配信する。
- GitHub Actions の IAM 権限は環境とデプロイ対象ごとに最小化する。
- 本番環境への CDK deploy は GitHub Environment の承認を必須とする。
- 独自ドメインと WAF は初期スコープ外とし、暗黙に導入しない。
