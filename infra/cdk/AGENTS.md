## Project Overview

インフラは、Guppy Web System の AWS リソースを CDK で定義し、環境ごとの設定を入力として CloudFormation stack を生成する層とする。

- 言語: TypeScript 6
- 実行基盤: AWS CDK v2 + CloudFormation
- 対象 stack: `DataStack` `AuthStack` `ApiStack` `FrontendHostingStack` `MonitoringStack` `GithubOidcStack`
- 主なリソース: DynamoDB、Cognito User Pools、Lambda、API Gateway HTTP API、S3、CloudFront、CloudWatch、IAM、SSM Parameter Store、GitHub OIDC
- 主責務: AWS リソース定義、stack 間依存、環境別設定の検証、最小権限 IAM、SSM Parameter 出力、GitHub Actions デプロイ権限の定義
- 設定入力: `config/*.json` を CDK context `config` で指定する。実値を含む `*.local.json` は Git 管理しない
- 命名基準: `projectName` `environmentName` `resourceNamePrefix` を正本とし、stack ID とリソース名の環境差分をコードへ重複定義しない
- 機密情報: Secrets や署名鍵の値は SSM SecureString / Secrets Manager などの参照名・version のみを扱い、値そのものは保持しない
- 対象外: アプリケーション業務ロジック、フロントエンド UI、バックエンド API の処理内容、手動作成済みリソースの暗黙 import

## Commands

- Install dependencies: `npm install`
- Build / type check: `npm run build`
- Synth: `npm run synth -- -c config=config/dev.local.json`
- Diff: `npm run diff -- -c config=config/dev.local.json`
- CDK CLI: `npm run cdk -- <command>`

## Code Style

- stack ファイル名は `kebab-case.ts`、stack class は `PascalCase`、props type は `<StackName>Props` を使う
- Construct ID、CloudFormation output、SSM parameter name は用途と環境が分かる名前にする
- 関数・メソッドは `camelCase`、定数は `UPPER_SNAKE_CASE`、型は `PascalCase` を使う
- どんな関数でも日本語の docstring を Google スタイルで記述し、引数・戻り値を明示する
- stack constructor は薄く保ち、リソース作成は private method に分離する
- 環境別の値は `GuppyStackConfig` に集約し、stack 内で環境名・URL・ARN・テーブル名を直書きしない
- 外部入力となる config は `lib/config.ts` で早期に検証し、無効な設定は `cdk synth` 時点で明確に失敗させる
- IAM policy は `grantReadData` などの CDK helper を優先し、必要な場合だけ明示 policy を追加する
- リソース削除、保持、置換に関わる設定は意図を明確にし、環境ごとの差を config か命名で判別できるようにする
- `as any` や過剰な型アサーションで CDK construct の型安全性を壊さない

## Testing

- 変更後は原則として `npm run build` を通す
- AWS リソース定義や config 検証を変更した場合は `npm run synth -- -c config=config/dev.local.json` を通す
- 既存環境へ影響する変更は `npm run diff -- -c config=config/dev.local.json` で差分を確認する
- IAM、Cognito callback/logout URL、CloudFront/S3、DynamoDB table、Lambda 環境変数、SSM parameter を変更した場合は diff の影響範囲を明示する
- 破壊的変更、resource replacement、権限拡大、公開設定変更は正常系だけでなく事故時の戻し方も確認する
- 外部 AWS 環境に依存する検証は、アカウント ID・リージョン・対象 config を明示して実行する

## Boundaries

- `config/*.local.json`、`.env*`、Secrets、API key、password、token を変更・コミットしない
- ユーザーの明示指示なしに `cdk deploy`、`cdk destroy`、bootstrap、実 AWS リソース変更を実行しない
- `cdk.out` や asset 出力を正本として編集しない。必要なら `cdk synth` で再生成する
- IAM 権限を `*` resource / `*` action へ安易に広げない。必要な場合は理由と影響範囲を明示する
- S3 bucket policy、CloudFront、Cognito、API Gateway の公開範囲を広げる変更を黙って入れない
- 本番環境に影響する stack 名、resource name、RemovalPolicy、deletion protection、table billing / key schema を無断で変更しない
- 手動作成済み AWS リソースを CDK 管理へ移す変更は、CloudFormation import または移行計画なしに追加しない
- バックエンドやフロントエンドの責務を CDK 側へ複製しない。CDK はリソース定義と環境配線に集中させる
- GitHub Actions OIDC の subject 条件を広げる変更は、対象 repository / environment / branch の意図を明確にする
- JST 前提の業務データや API 仕様を、インフラ設定で暗黙に変換・代替しない
