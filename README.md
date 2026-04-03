# OTOSHIN Web System

## 概要

OTOSHIN の Web システムは、公開トップページとログイン後画面を提供するフロントエンド、参照専用 API を提供するバックエンド、日次でデータを更新するバッチ処理から構成されます。

このリポジトリは、Web システム側の設計・実装を管理するための公開リポジトリです。戦略ロジックや機密情報を扱うバッチ処理は別リポジトリで管理する前提です。

## システムの役割

- 公開トップ `/`
  - サービス概要
  - 匿名集計の公開サマリ
  - 最終更新日時
  - `/login` への導線

- ログイン後画面
  - `/app`: システム横断サマリ
  - `/app/systems/{system_code}`: システム別の最新実行結果
  - `/app/watchlist`: 対象銘柄一覧

- バックエンド API
  - `GET /api/v1/public/summary`
  - `GET /api/v1/summary`
  - `GET /api/v1/systems/{system_code}/latest`
  - `GET /api/v1/watchlist`

## アーキテクチャ方針

- フロント配信は `S3 + CloudFront`
- API は `API Gateway + Lambda`
- 認証は `OIDC` を前提とし、第一候補は `Cognito User Pools`
- 認証後 API では `JWT Authorizer` によりトークン検証を行う
- データストアは `DynamoDB`
- 日付境界と集計基準は `JST`
- バッチ処理は `EventBridge Scheduler` から起動するが、その実装は別リポジトリで管理する

## このリポジトリの責務

- Web システム全体の要件・設計ドキュメントを管理する
- フロントエンド実装を管理する
- 画面から参照されるバックエンド API 実装を管理する
- インフラ定義や開発環境定義を管理する

## このリポジトリの非責務

- 売買ロジックそのものの管理
- シグナル生成や日次集計更新のバッチ実装
- 機密情報を含む非公開処理
- DynamoDB の詳細なデータモデル設計の最終管理

## 現在の状態

現時点では、実装よりも要件定義と開発ガイドの整備が先行しています。特に以下が先に存在しています。

- ルートの開発ガイド: [AGENTS.md](/workspace/AGENTS.md)
- バックエンド向けガイド: [apps/backend/AGENTS.md](/workspace/apps/backend/AGENTS.md)
- バックエンド README: [apps/backend/README.md](/workspace/apps/backend/README.md)
- システム要件定義: [docs/required/web_system_required.md](/workspace/docs/required/web_system_required.md)
- 開発コンテナ定義: [compose.yml](/workspace/compose.yml), [.devcontainer/devcontainer.json](/workspace/.devcontainer/devcontainer.json)

以前 README に記載していた大きなディレクトリツリーは、現状の実ファイル構成ではなく理想形です。今後の実装が進んだら、実態に合わせて更新します。

## 実ファイル構成

現時点で主要な管理対象は次のとおりです。

```text
.
├─ AGENTS.md
├─ README.md
├─ compose.yml
├─ apps/
│  └─ backend/
│     ├─ AGENTS.md
│     ├─ README.md
│     └─ requirements.txt
└─ docs/
   └─ required/
      └─ web_system_required.md
```

## 想定ディレクトリ構成（理想形）

以下は、実装が進んだ後に目指す構成の理想形です。現状の実ファイル構成とは一致しません。

```text
root/
├─ README.md
├─ AGENTS.md
├─ compose.yml
├─ .github/
│  └─ workflows/
│     ├─ deploy-frontend.yml
│     └─ deploy-backend.yml
├─ apps/
│  ├─ frontend/
│  │  ├─ README.md
│  │  ├─ package.json
│  │  ├─ public/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (public)/
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  └─ login/
│  │  │  │  │     └─ page.tsx
│  │  │  │  └─ (authenticated)/
│  │  │  │     └─ app/
│  │  │  │        ├─ page.tsx
│  │  │  │        ├─ watchlist/
│  │  │  │        │  └─ page.tsx
│  │  │  │        └─ systems/
│  │  │  │           └─ [system_code]/
│  │  │  │              └─ page.tsx
│  │  │  ├─ components/
│  │  │  ├─ features/
│  │  │  ├─ lib/
│  │  │  ├─ hooks/
│  │  │  ├─ types/
│  │  │  └─ styles/
│  │  └─ tests/
│  └─ backend/
│     ├─ README.md
│     ├─ AGENTS.md
│     ├─ requirements.txt
│     └─ src/
│        ├─ handlers/
│        │  ├─ public/
│        │  │  └─ get_public_summary.py
│        │  ├─ summary/
│        │  │  └─ get_summary.py
│        │  ├─ systems/
│        │  │  └─ get_system_latest.py
│        │  └─ watchlist/
│        │     └─ get_watchlist.py
│        ├─ services/
│        ├─ repositories/
│        ├─ middleware/
│        ├─ domain/
│        ├─ lib/
│        └─ tests/
├─ packages/
│  ├─ shared-types/
│  ├─ api-schema/
│  ├─ auth-config/
│  └─ ui/
├─ infra/
│  ├─ frontend/
│  ├─ backend/
│  ├─ auth/
│  └─ env/
│     ├─ dev/
│     ├─ stg/
│     └─ prd/
├─ docs/
│  ├─ architecture/
│  ├─ api/
│  ├─ screens/
│  ├─ operations/
│  └─ required/
└─ scripts/
   ├─ build-frontend.sh
   ├─ build-backend.sh
   ├─ deploy-frontend.sh
   └─ deploy-backend.sh
```

## ローカル開発

開発環境は devcontainer 前提です。`compose.yml` には devcontainer がアタッチする `dev_web` サービス定義があり、`dev_web` と `backend_dev` はどちらもバッチ側 compose が起動している共有 `DynamoDB Local` を参照する既定値になっています。必要に応じて、このリポジトリ単体で DynamoDB Local を使えるようにコメント付きの設定も残しています。

あわせて、ローカルでバックエンドを起動するための `backend_dev` サービスを `compose.yml` に用意しています。`DynamoDB Local` はこのリポジトリ内では起動せず、バッチ側 compose で起動している共有インスタンスを利用する前提です。

### バックエンド実行コンテナ

```bash
docker compose up -d backend_dev
docker compose logs -f backend_dev
```

- 既定ポートは `http://localhost:8080`
- `DYNAMODB_ENDPOINT_URL` の既定値は `http://host.docker.internal:8000`
- Linux でも `extra_hosts: host.docker.internal:host-gateway` で共有 DynamoDB Local に到達できるようにしています
- 現時点では `apps/backend/src/local_dev_server.py` のプレースホルダーサーバーが起動し、`GET /healthz` で疎通確認できます
- 将来、本実装のローカル起動処理を `apps/backend/src/main.py` に置いた場合は、そちらを優先して起動します

ただし、現時点ではフロントエンドやバックエンドの実装本体はまだ十分に配置されていません。全体セットアップやアプリ起動の手順は、実装追加に合わせて README を更新します。

## バックエンドについて

`apps/backend` は、画面からのリクエストを受けて DynamoDB を参照し、レスポンスを返す API 層です。バッチ実行、Scheduler 設定、集計更新ジョブはこのリポジトリの責務外です。

詳細は [apps/backend/README.md](/workspace/apps/backend/README.md) を参照してください。

## ドキュメント

- 要件定義: [docs/required/web_system_required.md](/workspace/docs/required/web_system_required.md)
- 全体ガイド: [AGENTS.md](/workspace/AGENTS.md)
- バックエンドガイド: [apps/backend/AGENTS.md](/workspace/apps/backend/AGENTS.md)

## 今後更新したい内容

- 実装が入った後の正確なディレクトリ構成
- フロントエンドのセットアップ手順
- バックエンドのローカル実行手順
- デプロイ手順
- テスト手順
