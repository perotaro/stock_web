# Frontend README

`apps/frontend` は Guppy の SPA フロントエンドです。`React + TypeScript + Vite + React Router + TanStack Query + Tailwind CSS` を前提に、公開トップと認証後画面を 1 つのアプリで開発する土台を用意しています。

## セットアップ

```bash
cd apps/frontend
cp .env.example .env.local
npm install
npm run dev
```

既定では `http://localhost:5173` で起動します。

## 主なコマンド

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## 環境変数

`.env.example` に最低限の開発用設定を用意しています。設計書で定義した `VITE_API_BASE_URL` と OIDC 関連設定に加えて、Vite 開発サーバ向けの `FRONTEND_API_PROXY_TARGET` を使えます。

## 認証モード

現時点では OIDC 実接続前の開発を止めないため、ローカルでは `VITE_AUTH_MODE=dev-bypass` を既定値にしています。`/login` の遷移中表示後に Cognito へは遷移せず、`/app` 配下の画面へ進めるための設定です。

本番向け設定では `VITE_AUTH_MODE=oidc` を指定し、`/login` から Cognito Hosted UI へ遷移させます。本番ビルドまたは本番実行時に `dev-bypass` が指定された場合は、起動時に失敗させます。

## Docker Compose での起動

ルートの `compose.yml` には `frontend_dev` サービスを追加します。バックエンドも合わせて起動する場合は次を利用できます。

```bash
docker compose up -d backend_dev frontend_dev
docker compose logs -f frontend_dev
```

## ディレクトリ方針

- `src/app`: Provider、Router、Layout、Guard
- `src/pages`: ルート単位の入口
- `src/components`: 再利用 UI
- `src/lib`: env、API クライアント、ユーティリティ
- `src/styles`: グローバルスタイル
- `src/tests`: Vitest / Playwright のテスト

## 主要なフォルダとファイル

### ルート直下

- `package.json`
  - 依存関係と実行コマンドを管理します
  - `dev` `lint` `typecheck` `test` `build` の入口です
- `package-lock.json`
  - 依存バージョンを固定するロックファイルです
- `vite.config.ts`
  - Vite の設定です
  - React / Tailwind の有効化、`@` エイリアス、`/api` のプロキシ、Vitest 設定を持ちます
- `index.html`
  - SPA の土台になる HTML です
  - React アプリはこの `#root` にマウントされます
- `tsconfig.json`
  - TypeScript 設定の親です
- `tsconfig.app.json`
  - ブラウザ側コード向けの TypeScript 設定です
- `tsconfig.node.json`
  - Vite や Playwright など Node 側ファイル向けの TypeScript 設定です
- `eslint.config.js`
  - ESLint の静的解析ルールです
- `prettier.config.mjs`
  - Prettier の整形ルールです
- `playwright.config.ts`
  - Playwright の E2E テスト設定です
- `.env.example`
  - 開発用環境変数の見本です
- `.env.local`
  - ローカル専用の実設定です
  - `.gitignore` によりコミット対象外です
- `README.md`
  - フロントエンドのセットアップ手順と構成説明です
- `AGENTS.md`
  - この配下で作業する際の追加ルールです
- `public/`
  - ビルド時にそのまま配信される静的ファイル置き場です
  - 現在は `favicon.svg` を配置しています

### `src/` 配下

- `src/app/`
  - アプリ全体の起動点です
  - Router、Provider、Layout、Guard のような全体骨格を置きます
- `src/app/main.tsx`
  - React アプリのエントリポイントです
- `src/app/App.tsx`
  - アプリ全体の最上位コンポーネントです
- `src/app/providers/`
  - アプリ全体で共有する Provider を置きます
  - 現在は `QueryClientProvider` を設定しています
- `src/app/router/`
  - ルーティング定義を置きます
  - `/` `/login` `/app` などの URL と画面の対応を管理します
- `src/app/layouts/`
  - 公開領域と認証後領域の共通レイアウトを置きます
- `src/app/guards/`
  - 認証ガードのようなルート保護ロジックを置きます
- `src/pages/`
  - ルート単位の入口コンポーネントを置きます
  - `public` `auth` `app` に分けています
- `src/pages/public/`
  - 公開トップやログイン導線など、未認証で見える画面です
- `src/pages/auth/`
  - 認証コールバックなど、認証フロー専用の画面です
- `src/pages/app/`
  - ログイン後の主要画面です
  - サマリ、システム詳細、watchlist の入口があります
- `src/features/`
  - 機能単位で本体ロジックをまとめる予定の場所です
  - 今は `auth` `public-summary` `systems` `watchlist` の箱だけ用意しています
- `src/components/`
  - 複数画面で再利用する UI 部品を置きます
- `src/components/ui/`
  - 業務知識を持たない共通 UI を置きます
  - 現在は `SectionCard` と `StatusPill` があります
- `src/lib/`
  - ドメイン非依存の共通処理を置きます
- `src/lib/env/`
  - 環境変数の読み込みと `zod` による検証を行います
- `src/lib/api/`
  - HTTP 通信の共通入口です
  - タイムアウト、再試行、レスポンス検証、エラー統一をまとめます
- `src/lib/utils/`
  - 日付整形のような小さな共通ユーティリティを置きます
- `src/styles/`
  - グローバル CSS とデザイントークンを置きます
- `src/tests/`
  - Vitest の単体テストを置きます
- `src/tests/e2e/`
  - Playwright の E2E テストを置きます
- `src/assets/`
  - 画像や SVG などのモジュール読み込み用アセット置き場です
  - 現在は空です

## 読み始める順番

以下の順で追うと、構成が把握しやすいです。

1. `package.json`
2. `vite.config.ts`
3. `src/app/main.tsx`
4. `src/app/router/AppRouterProvider.tsx`
5. `src/pages/`
6. `src/lib/api/httpClient.ts`
