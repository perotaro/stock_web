# Project Structure

## Organization Philosophy

トップレベルは責務ごとに `apps/` と `docs/` を分ける構成です。実装コードはアプリケーション単位で分離し、設計・要件・運用情報は `docs/` に集約します。アプリごとの詳細ルールは、その配下の `AGENTS.md` で上書きせず補足します。

## Directory Patterns

### Application Split
**Location**: `/apps/frontend/`, `/apps/backend/`  
**Purpose**: フロントエンド SPA とバックエンド API を責務単位で分離する  
**Example**: `apps/frontend` は画面、`apps/backend` は参照専用 API とローカル開発サーバーを管理する

### Frontend Layering
**Location**: `/apps/frontend/src/`  
**Purpose**: アプリ骨格、画面入口、再利用 UI、機能ロジック、共通ライブラリ、テストを分離する  
**Example**: `app/` は Router・Provider・Layout、`pages/` はルート入口、`features/` は機能別ロジック、`lib/` は env や API クライアントを置く

### Backend Layering
**Location**: `/apps/backend/src/`  
**Purpose**: 薄いハンドラ、サービス、リポジトリ、共通処理へ責務分割する前提を保つ  
**Example**: 将来の本実装では `handlers/` から `services/` と `repositories/` を呼び出す構成を基本にする

### Documentation By Intent
**Location**: `/docs/required/`, `/docs/design/`, `/docs/operations/`  
**Purpose**: 要件、設計、運用を用途別に整理する  
**Example**: `docs/required/web_system_required.md` は要件、`docs/design/frontend_basic_design.md` は設計判断を保持する

## Naming Conventions

- **Frontend Files**: React コンポーネントとレイアウトは `PascalCase.tsx`、ユーティリティは `camelCase.ts`
- **Frontend Symbols**: コンポーネントは `PascalCase`、hooks は `useXxx`、定数は `UPPER_SNAKE_CASE`
- **Backend Files And Symbols**: Python モジュール、関数、変数は `snake_case`、定数は `UPPER_SNAKE_CASE`
- **Documents**: ドキュメントファイルは役割が分かる `snake_case.md` を基本にする

## Import Organization

```typescript
import { AppLayout } from '@/app/layouts/AppLayout'
import { httpClient } from '@/lib/api/httpClient'
import { StatusPill } from '@/components/ui/StatusPill'
```

**Path Aliases**:
- `@/`: `apps/frontend/src/` を指す。深い相対 import を避け、依存の向きを読みやすくする

## Code Organization Principles

- フロントエンドでは、ルーティングや認証ガードなど全体骨格を `app/` に閉じ込め、ページは薄い入口に保つ
- フロントエンドの外部入力、環境変数、HTTP 通信は `lib/` と `features/` に集約し、UI コンポーネントに埋め込まない
- バックエンドでは、ハンドラに業務ロジックや DynamoDB 入出力を直接書かない
- 画面から参照される API 契約や設計判断は実装と別に `docs/design/` へ残し、コードだけに閉じない
- 新しいファイルは既存レイヤに従って追加し、例外的な配置が必要なときだけ新しいパターンを導入する

---
_ディレクトリツリーの完全コピーではなく、今後の追加実装でも維持したい構造ルールを記録する_
