## Project Overview

フロントエンドは、公開トップと認証後画面を 1 つの SPA で提供し、OIDC 認証・画面遷移・API 呼び出し・表示整形を担う層とする。

- 言語: TypeScript 6 + React 19
- 実行基盤: Vite 開発サーバ + 静的ビルド
- ルーティング: React Router
- データ取得: `fetch` ベースの API クライアント + Zod 検証 + TanStack Query を前提とする
- 認証: OIDC 前提。開発時のみ `VITE_ENABLE_DEV_AUTH_BYPASS` によるローカルバイパスを許容する
- 主な画面: `/` `/login` `/auth/callback` `/auth/logout/callback` `/logout` `/app` `/app/systems/:system_code` `/app/watchlist`
- 主責務: ルーティング、認証導線、API レスポンスの表示、入力値や環境変数の検証、エラー表示
- データ前提: 公開サマリ・システム別最新結果・ウォッチリストなどの業務データはバックエンド API が提供する
- 時刻基準: バックエンドが返す業務日付・更新日時の JST 上の意味を壊さず表示する
- 対象外: バックエンド業務ロジック、集計バッチ、機密情報の保持、認証基盤そのものの実装

## Commands

- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Format: `npm run format`
- Type check: `npm run typecheck`
- Unit / component test: `npm run test`
- E2E test: `npm run test:e2e`

## Code Style

- コンポーネント・レイアウト・ページのファイル名は `PascalCase.tsx`、ユーティリティや API クライアントは `camelCase.ts` を基本とする
- React コンポーネント名は `PascalCase`、hooks は `useXxx`、変数・関数は `camelCase`、定数は `UPPER_SNAKE_CASE` を使う
- どんな関数でも日本語の docstring を Google スタイルで記述し、引数・戻り値を明示する
- import は `@/` エイリアスを優先し、深い相対パスの連鎖を避ける
- `src/app` は Router・Provider・Layout・Guard に限定し、ページコンポーネントは薄い入口に保つ
- 再利用 UI は `src/components`、環境変数・API クライアント・純粋関数は `src/lib` に集約し、責務を混在させない
- 環境変数、ルートパラメータ、クエリ文字列、API レスポンスなどの外部入力は Zod か同等の明示的な検証を通す
- API 呼び出しはタイムアウト、リトライ、スキーマ検証、認証ヘッダ付与を一貫して扱い、コンポーネント側に分散させない
- `as any` や過剰な型アサーションで型安全性を壊さない
- アクセシビリティを保ち、`eslint-plugin-jsx-a11y` の指摘を握りつぶさない

## Testing

- フレームワーク: `Vitest` + Testing Library を基本とし、画面導線の確認に `Playwright` を使う
- 実装詳細ではなく、公開画面と認証後画面の振る舞い、遷移、表示、エラー処理を検証する
- `clientEnv` の環境変数検証、`httpClient` のタイムアウト・リトライ・レスポンス検証はユニットテストでカバーする
- `401/403`、ネットワーク失敗、レスポンス不正、必須パラメータ欠落などの異常系を必ずテストする
- OIDC、`fetch`、ブラウザ API などの外部依存はテストで制御し、外部環境に依存する不安定なテストを作らない
- E2E テストでは公開導線と認証後導線の境界を確認し、ローカルバイパス前提の挙動と本番想定の挙動を混同しない

## Boundaries

- `.env.local` などのローカル環境ファイルをコミットしない。機密値や URL をコンポーネントにハードコードしない
- `import.meta.env` を各所で直接読まず、`src/lib/env/clientEnv.ts` を単一の参照元として扱う
- `VITE_ENABLE_DEV_AUTH_BYPASS=true` を本番前提の実装やレビューの免罪符にしない
- 認証必須画面や認証必須 API を、Guard や認証状態の確認なしで公開導線に露出しない
- アクセストークンや個人情報を `console.log`、URL、DOM 属性、永続ストレージへ不用意に出力しない
- バックエンドが持つ業務判定や機密ロジックをフロントエンドへ複製しない
- バックエンド API のベース URL、OIDC の authority、redirect URI などの環境差分をコードに埋め込まない
- JST 前提の表示値を UI 側で勝手に UTC 解釈へ変換しない
- 開発用のダミーデータや暫定文言を本番導線へ残さない
