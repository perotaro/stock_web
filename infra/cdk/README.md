# Guppy CDK Infrastructure

このディレクトリは Guppy Web System の AWS リソースを AWS CDK で管理するための入口です。

## 対象
- `FrontendHostingStack`: S3 + CloudFront + OAC + SSM Parameter
- `DataStack`: DynamoDB
- `AuthStack`: Cognito User Pools + App Client + SSM Parameter
- `ApiStack`: Lambda + API Gateway HTTP API + IAM Role + SSM Parameter
- `MonitoringStack`: CloudWatch Logs retention + CloudWatch Alarms
- `GithubOidcStack`: GitHub OIDC Provider + GitHub Actions deploy Role / Policy

## 初期セットアップ

```bash
cd infra/cdk
npm install
cp config/dev.example.json config/dev.local.json
```

`config/dev.local.json` に実際の値を入れます。このファイルは Git 管理しません。

`cursorSigningSecretParameterName` には、事前に作成した SSM SecureString の名前を指定します。値そのものは設定ファイルに書かないでください。

```bash
aws ssm put-parameter \
  --name /guppy-web-dev/api/cursor-signing-secret \
  --type SecureString \
  --value '<32-characters-or-longer-secret>'
```

`githubActionsSubject` は GitHub Actions の OIDC `sub` 条件です。GitHub Environment を使う場合は `repo:<owner>/<repo>:environment:<environment>` の形式を指定します。

## 検証

```bash
npm run build
npm run synth -- -c config=config/dev.local.json
```

## 注意
- 既に AWS Console で作成済みのリソースを、この CDK stack が自動で取り込むわけではありません。
- 既存リソースを CDK 管理へ移す場合は、CloudFormation import または新環境作成後の切り替えを別途計画してください。
- 初期段階では `cdk deploy` を直接実行せず、`cdk synth` と `cdk diff` で差分を確認してください。
- 本番環境への `cdk deploy` は GitHub Environment の承認を必須にしてください。
