# Technology Stack

## Architecture

システムは「SPA フロントエンド + 参照専用 API + 別リポジトリ管理のバッチ処理」という分離を前提とします。配信は AWS のサーバレス構成を想定し、フロントエンドは静的配信、バックエンドは API Gateway + Lambda、データストアは DynamoDB を中心に設計します。

## Core Technologies

- **Frontend Language**: TypeScript 6
- **Frontend Framework**: React 19 + React Router 7 + Vite 8
- **Frontend Runtime**: Node.js ベースの開発環境
- **Backend Language**: Python 3 系
- **Backend Runtime**: AWS Lambda 想定の API 実装とローカル開発用サーバー
- **Data Store**: DynamoDB
- **Authentication**: OIDC を前提とし、第一候補は Cognito User Pools

## Key Libraries And Standards

- フロントエンドの外部入力検証は `zod` を使い、環境変数・ルートパラメータ・API レスポンスを明示的に検証する
- 画面データ取得は `fetch` ベースの共通 API クライアントに集約し、タイムアウト、再試行、レスポンス検証をコンポーネントへ分散させない
- 画面データのキャッシュと非同期状態管理は `@tanstack/react-query` を前提にする
- バックエンドでは `pydantic`、`boto3`、`aws-lambda-powertools` を軸に、薄いハンドラと型付きの処理境界を保つ

## Development Standards

### Type And Validation

- TypeScript では `any` や過剰な型アサーションに依存しない
- Python では型ヒントを前提とし、入力値やレスポンス整形の境界で明示的な検証を行う
- JST の業務上の意味を壊す時刻変換を避け、日付・更新時刻は意味を保って扱う

### Code Quality

- フロントエンドは ESLint + Prettier で静的解析と整形を統一する
- バックエンドは Ruff + mypy を前提にする
- 関数の docstring は日本語の Google スタイルを使う

### Testing

- フロントエンドは Vitest + Testing Library でユニットテスト、Playwright で E2E テストを行う
- バックエンドは pytest を基盤に、認可境界、異常系、DynamoDB 依存を含む振る舞いを検証する
- テストは実装詳細ではなく、画面導線、API 契約、認証境界を確認する

## Development Environment

### Required Tools

- Docker Compose / devcontainer によるローカル開発環境
- Node.js と npm を用いたフロントエンド開発
- Python 仮想環境またはコンテナによるバックエンド開発

### Common Commands

```bash
# Frontend
cd apps/frontend && npm run dev
cd apps/frontend && npm run lint
cd apps/frontend && npm run typecheck
cd apps/frontend && npm run test
cd apps/frontend && npm run test:e2e

# Backend
docker compose up -d backend_dev
pytest
ruff check apps/backend
mypy apps/backend
```

## Key Technical Decisions

- フロントエンドは 1 つの SPA として公開導線と認証後導線を同居させる
- バックエンド API は参照専用に限定し、集計更新や機密ロジックは別リポジトリへ分離する
- 認証実装前でも画面開発を進められるよう、フロントエンドには開発専用の認証バイパスを許容する
- ローカル開発では Docker Compose からフロントエンドとバックエンドを起動し、共有 DynamoDB Local を参照する

---
_依存パッケージの一覧ではなく、技術選定と実装判断に影響する標準を記録する_
