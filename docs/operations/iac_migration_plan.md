# Guppy IaC 移行計画

## 1. 文書目的
本書は、AWS Console で手動構築した Guppy Web System を IaC 管理へ移行するための方針を定義する。

## 2. 採用技術
- AWS CDK v2
- TypeScript
- CDK app path: `infra/cdk`

既存ドキュメントの CI/CD 設計では CDK を前提としているため、IaC も CDK に統一する。

## 3. 現在の方針
初期 CDK stack は、手動構築済みリソースを自動 import しない。
まずは手動構築と同等の構成をコードで再現できる状態を作る。

理由:
- 既存リソースの CloudFormation import は失敗時の影響が大きい
- S3 / CloudFront / Cognito / API Gateway は依存関係が多く、段階的な移行が必要
- まず `cdk synth` で構成をレビュー可能にする方が安全

## 4. CDK で定義する対象
- S3 frontend bucket
- CloudFront distribution
- Cognito User Pool / User Pool Client / Hosted UI domain
- DynamoDB read model tables
- Lambda execution role
- Backend Lambda functions
- API Gateway HTTP API
- Cognito JWT Authorizer
- API Gateway routes

## 5. 実値管理
公開リポジトリには実値を置かない。

Git 管理するもの:
- `infra/cdk/config/dev.example.json`
- `docs/operations/aws_manual_deploy_values.local.md.example`

Git 管理しないもの:
- `infra/cdk/config/dev.local.json`
- `docs/operations/aws_manual_deploy_values.local.md`

## 6. 初期検証コマンド
```bash
cd infra/cdk
npm install
cp config/dev.example.json config/dev.local.json
```

`config/dev.local.json` に実値を設定したうえで、まず synth だけ実行する。

```bash
npm run build
npm run synth -- -c config=config/dev.local.json
```

`cdk deploy` はまだ実行しない。
手動環境と同じリソース名を指定した状態で deploy すると、既存リソースとの名前衝突が起きる可能性がある。

## 7. 既存手動環境からの移行候補

### 7.1 新環境をCDKで作って切り替える
推奨候補。

1. CDKで別名の `dev2` または `stg` 環境を作成する
2. フロントエンドを新S3/CloudFrontへデプロイする
3. Cognito callback/logout URL を新ドメインへ合わせる
4. DynamoDBに検証データを投入する
5. 動作確認後、旧手動環境を停止または削除する

メリット:
- 既存稼働環境を壊しにくい
- CloudFormation import の複雑さを避けられる

デメリット:
- 一時的に二重リソースになる
- CognitoユーザーやDynamoDBデータの移行が必要になる場合がある

### 7.2 既存リソースをCloudFormation importする
将来的な候補。

メリット:
- 既存URLや既存リソースを維持しやすい

デメリット:
- import 対象ごとに DeletionPolicy / logical ID / resource property の整合が必要
- CloudFront、Cognito、API Gateway の取り込みは確認項目が多い
- 失敗時の復旧手順を事前に用意する必要がある

## 8. 次の実装タスク
1. CDK stack を `dev2` のような別環境名で deploy できる設定にする
2. Lambda runtime 依存の bundling を scripts 化または requirements 分離する
3. `cursorSigningSecret` を SSM Parameter Store または Secrets Manager 参照へ移す
4. フロントエンド deploy 用の S3 sync / CloudFront invalidation 手順をCDK/CI側に接続する
5. GitHub Actions OIDC Role をCDK管理に追加する

## 9. 注意事項
- `cdk.out` と `node_modules` は Git 管理しない
- CDK context に本番 secret を直接書かない
- Cognito client secret はSPAでは生成しない
- CloudFront の `/api/*` behavior では `Authorization` header を API Gateway へ渡す
- `ENV_NAME=prd` を使う前に、本番値検証に必要な設定をすべて用意する
- 2026-05-26 時点で `npm audit --omit=dev` は `aws-cdk-lib@2.257.0` の bundled dependency `brace-expansion` に moderate vulnerability を報告する。`npm audit fix` では自動修正できないため、次回 CDK 更新時に解消状況を確認する。
