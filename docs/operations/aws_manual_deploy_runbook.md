# Guppy AWS 手動デプロイ Runbook

## 1. 文書目的
本書は、Guppy Web System を AWS Console から手動構築した際の手順と設定値を記録する。  
初期検証では手動構築を許容するが、再現性と保守性のため、最終的には IaC と CI/CD へ移行する。

## 2. 対象構成
- Frontend: S3 + CloudFront
- API: API Gateway HTTP API + Lambda
- Auth: Cognito User Pools
- Database: DynamoDB
- Region: `ap-northeast-1`

## 3. 前提
- root ユーザーは日常利用しない。
- 作業は MFA 設定済みの IAM ユーザーで行う。
- AWS Organizations / IAM Identity Center の組織インスタンスは、Free Plan への影響を確認してから有効化する。
- CLI は初期段階では必須にしない。
- AWS アクセスキーは作成しない。CLI が必要になった時点で扱いを再検討する。

## 4. 作成済みリソース

### 4.1 Frontend
| 種別 | 値 |
|---|---|
| S3 bucket | `<frontend-bucket-name>` |
| CloudFront domain | `https://<cloudfront-domain>` |
| Default root object | `index.html` |
| S3 access | CloudFront OAC 経由のみ |

S3 バケットは public にしない。CloudFront からだけ読めるように OAC とバケットポリシーを設定する。

SPA ルーティングのため、CloudFront の custom error response を設定する。

| Error code | Response page path | HTTP response code | Error TTL |
|---|---|---|---|
| `403` | `/index.html` | `200` | `0` |
| `404` | `/index.html` | `200` | `0` |

### 4.2 Cognito
| 種別 | 値 |
|---|---|
| User Pool ID | `<cognito-user-pool-id>` |
| App client ID | `<cognito-app-client-id>` |
| Issuer | `https://cognito-idp.ap-northeast-1.amazonaws.com/<cognito-user-pool-id>` |
| Hosted UI logout endpoint | `https://<cognito-domain>.auth.ap-northeast-1.amazoncognito.com/logout` |

SPA 用 app client では client secret を生成しない。

Allowed callback URL:

```text
https://<cloudfront-domain>/auth/callback
```

Allowed sign-out URL:

```text
https://<cloudfront-domain>/auth/logout/callback
```

OAuth grant type:

```text
Authorization code grant
```

OAuth scopes:

```text
openid profile email
```

### 4.3 DynamoDB
共通設定:

```text
Region: ap-northeast-1
Table class: DynamoDB Standard
Capacity mode: On-demand
Streams: Disabled
TTL: Disabled
```

| Table | PK | SK | GSI |
|---|---|---|---|
| `md_public_summary` | `summary_scope` String | `summary_key` String | なし |
| `md_system_latest_status` | `system_code` String | なし | なし |
| `md_system_latest_signals` | `system_code` String | `record_key` String | なし |
| `md_watchlist` | `ticker` String | なし | `gsi_active_updated_at` |

`md_watchlist` の GSI:

| Index | PK | SK | Projection |
|---|---|---|---|
| `gsi_active_updated_at` | `is_active` String | `updated_at_epoch` Number | All |

注意: `md_watchlist.is_active` は item 本体では boolean だが、GSI の partition key としては `"true"` / `"false"` の文字列を使う。

公開サマリ確認用の初期 item:

```json
{
  "summary_scope": "PUBLIC",
  "summary_key": "CURRENT",
  "operating_days": 18,
  "batch_runs_total": 1345,
  "success_rate": 0.9444,
  "avg_duration_sec": 87.2,
  "updated_at": "2026-05-25T12:00:00+09:00",
  "period_timezone": "Asia/Tokyo"
}
```

`success_rate` は DynamoDB には `0..1` の比率で保存し、API レスポンスでは `0..100` の百分率へ変換する。

### 4.4 IAM Role
Lambda 実行ロール:

```text
guppy-web-api-lambda-role-dev
```

付与する AWS managed policy:

```text
AWSLambdaBasicExecutionRole
```

追加インラインポリシー:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadGuppyWebDynamoDbTables",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:<aws-account-id>:table/md_public_summary",
        "arn:aws:dynamodb:ap-northeast-1:<aws-account-id>:table/md_system_latest_status",
        "arn:aws:dynamodb:ap-northeast-1:<aws-account-id>:table/md_system_latest_signals",
        "arn:aws:dynamodb:ap-northeast-1:<aws-account-id>:table/md_watchlist",
        "arn:aws:dynamodb:ap-northeast-1:<aws-account-id>:table/md_watchlist/index/gsi_active_updated_at"
      ]
    }
  ]
}
```

### 4.5 Lambda
共通設定:

```text
Runtime: Python 3.11
Architecture: x86_64
Memory: 128 MB
Timeout: 10 seconds
Execution role: guppy-web-api-lambda-role-dev
```

| Function | Handler |
|---|---|
| `guppy-web-public-summary-dev` | `handlers.public.get_public_summary.lambda_handler` |
| `guppy-web-summary-dev` | `handlers.summary.get_summary.lambda_handler` |
| `guppy-web-system-latest-dev` | `handlers.systems.get_system_latest.lambda_handler` |
| `guppy-web-watchlist-dev` | `handlers.watchlist.get_watchlist.lambda_handler` |

共通環境変数:

```text
ENV_NAME=dev
PUBLIC_SUMMARY_TABLE_NAME=md_public_summary
SYSTEM_LATEST_STATUS_TABLE_NAME=md_system_latest_status
SYSTEM_LATEST_SIGNALS_TABLE_NAME=md_system_latest_signals
WATCHLIST_TABLE_NAME=md_watchlist
ALLOWED_ORIGINS=https://<cloudfront-domain>
COGNITO_ISSUER_URL=https://cognito-idp.ap-northeast-1.amazonaws.com/<cognito-user-pool-id>
COGNITO_AUDIENCE=<cognito-app-client-id>
CURSOR_SIGNING_SECRET=dev-placeholder-cursor-secret-please-change
```

`AWS_REGION` は Lambda の予約済み環境変数なので設定しない。

### 4.6 API Gateway
API 種別:

```text
HTTP API
```

API name:

```text
guppy-web-api-dev
```

Stage:

```text
$default
```

Routes:

| Route | Integration | Auth |
|---|---|---|
| `GET /api/v1/public/summary` | `guppy-web-public-summary-dev` | None |
| `GET /api/v1/summary` | `guppy-web-summary-dev` | Cognito JWT |
| `GET /api/v1/systems/{system_code}/latest` | `guppy-web-system-latest-dev` | Cognito JWT |
| `GET /api/v1/watchlist` | `guppy-web-watchlist-dev` | Cognito JWT |

JWT Authorizer:

```text
Name: guppy-web-cognito-authorizer-dev
Type: JWT
Identity source: $request.header.Authorization
Issuer: https://cognito-idp.ap-northeast-1.amazonaws.com/<cognito-user-pool-id>
Audience: <cognito-app-client-id>
Authorization scopes: 未指定
```

### 4.7 CloudFront API Behavior
API Gateway を CloudFront origin に追加する。

Origin:

```text
Origin domain: <api-id>.execute-api.ap-northeast-1.amazonaws.com
Origin path: 空
Protocol: HTTPS only
Name: guppy-web-api-dev
```

Behavior:

```text
Path pattern: /api/*
Origin: guppy-web-api-dev
Viewer protocol policy: Redirect HTTP to HTTPS
Allowed HTTP methods: GET, HEAD, OPTIONS
Cached HTTP methods: GET, HEAD
Cache policy: CachingDisabled
Origin request policy: AllViewerExceptHostHeader
Compress objects automatically: Yes
```

`Authorization` header を API Gateway へ渡す必要があるため、`AllViewerExceptHostHeader` を使う。

## 5. フロントエンド本番ビルド
`apps/frontend/.env.production.local` に以下を設定する。  
このファイルは Git 管理しない。

```env
VITE_API_BASE_URL=/api
VITE_AUTH_MODE=oidc
VITE_OIDC_AUTHORITY=https://cognito-idp.ap-northeast-1.amazonaws.com/<cognito-user-pool-id>
VITE_OIDC_CLIENT_ID=<cognito-app-client-id>
VITE_OIDC_REDIRECT_URI=https://<cloudfront-domain>/auth/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=https://<cloudfront-domain>/auth/logout/callback
VITE_OIDC_LOGOUT_ENDPOINT=https://<cognito-domain>.auth.ap-northeast-1.amazoncognito.com/logout
VITE_OIDC_SCOPE=openid profile email
```

ビルド:

```bash
cd apps/frontend
npm run build
```

`apps/frontend/dist/` の中身を S3 bucket のルートにアップロードする。  
アップロード後、CloudFront invalidation を作成する。

```text
/*
```

## 6. Lambda zip 作成
初期手動検証では、runtime 依存だけを zip に含める。

```bash
cd apps/backend

rm -rf /tmp/guppy-lambda-package guppy-web-public-summary-dev.zip
mkdir -p /tmp/guppy-lambda-package

python -m pip install \
  --no-cache-dir \
  pydantic==2.12.5 \
  aws-lambda-powertools==3.26.0 \
  aws-lambda-typing==2.20.0 \
  --target /tmp/guppy-lambda-package

cp -R src/. /tmp/guppy-lambda-package/
find /tmp/guppy-lambda-package -type d -name '__pycache__' -prune -exec rm -rf {} +
find /tmp/guppy-lambda-package -type d -name 'tests' -prune -exec rm -rf {} +

cd /tmp/guppy-lambda-package
zip -qr /workspace/apps/backend/guppy-web-public-summary-dev.zip .
```

作成した zip は4つの Lambda 関数に同じものをアップロードできる。

注意:
- `requirements.txt` にはテスト・静的解析用依存も含まれるため、そのまま入れると不要に大きい。
- `boto3` は Lambda managed runtime に含まれるため、初期検証では zip に含めない。
- `apps/backend/*.zip` は生成物として Git 管理しない。

## 7. 検証手順

### 7.1 公開API
CloudFront 経由:

```text
https://<cloudfront-domain>/api/v1/public/summary
```

期待レスポンス例:

```json
{
  "operating_days": 18,
  "batch_runs_total": 1345,
  "success_rate": 94.44,
  "avg_duration_sec": 87.2,
  "updated_at": "2026-05-25T12:00:00+09:00"
}
```

### 7.2 認証必須API
未ログイン状態で以下へアクセスすると `401 Unauthorized` になる。

```text
https://<cloudfront-domain>/api/v1/summary
```

ログイン後に以下を開き、認証付きAPIが取得できることを確認する。

```text
https://<cloudfront-domain>/app
```

### 7.3 ログイン・ログアウト
ログイン:

```text
https://<cloudfront-domain>/login
```

ログアウト:

```text
https://<cloudfront-domain>/logout
```

`/logout` は表示時に自動で Cognito logout endpoint へ遷移し、完了後 `/auth/logout/callback` を経由して公開トップへ戻る。

## 8. 既知の注意点
- 現状は手動構築のため、同じ環境を再作成するには本書の手順を再実行する必要がある。
- `CURSOR_SIGNING_SECRET` は dev 用 placeholder であり、本番値として使わない。
- `ENV_NAME=prd` は本番設定検証が厳しくなるため、手動検証中は `dev` を使う。
- API Gateway の CORS は現時点で必須ではない。CloudFront の `/api/*` で同一オリジン化しているため。
- API Gateway をフロントから直接呼ぶ構成に変える場合は CORS 設定が必要。
- CloudFront の API behavior では `Authorization` header を API Gateway へ転送する。
- Cognito の ID token や Access token をチャット、Issue、ログへ貼らない。

## 9. 今後の改善
1. Lambda zip 作成を `apps/backend/scripts` にスクリプト化する。
2. runtime 用 requirements と開発用 requirements を分離する。
3. S3 / CloudFront / Cognito / DynamoDB / Lambda / API Gateway / IAM を IaC 化する。
4. GitHub Actions OIDC による CI/CD を構築する。
5. 手動デプロイ手順を IaC デプロイ手順へ置き換える。
