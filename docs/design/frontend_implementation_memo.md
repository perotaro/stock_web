# Guppy フロントエンド実装メモ

## 1. 文書目的
本書は、Guppy フロントエンドの実装着手順と、各フェーズで作るべき単位を整理するための補助メモである。  
[フロントエンド基本設計](/workspace/docs/design/frontend_basic_design.md) の `15. 実装順序` を補完し、実装時に迷いやすい `page / feature / hook / api / component` の分割単位まで具体化することを目的とする。

本書は詳細設計書ではなく、実装開始前の作業順メモとして扱う。

## 2. 関連ドキュメント
- [フロントエンド基本設計](/workspace/docs/design/frontend_basic_design.md)
- [フロントエンド API 契約](/workspace/docs/design/frontend_api_contract.md)
- [フロントエンドビジュアル設計](/workspace/docs/design/frontend_visual_design.md)
- [バックエンド基本設計](/workspace/docs/design/backend_basic_design.md)

## 3. 実装方針
- 既存の `public-summary` 実装をテンプレートとし、他画面も `api -> hook -> feature ui -> page` の順で揃える。
- `page` はルート単位の薄い入口に保ち、URL パラメータや検索条件の受け取りに責務を限定する。
- API 呼び出し、Zod schema、TanStack Query の hook は feature 配下へ寄せる。
- 汎用 UI は `src/components/ui`、横断処理は `src/lib` に集約する。
- `watchlist` は URL クエリ同期、debounce、段階取得があるため最後に実装する。

## 4. 推奨実装順
推奨順は以下とする。

1. 共有基盤
2. 公開トップ `/`
3. ログイン後サマリ `/app`
4. システム別最新結果 `/app/systems/:system_code`
5. 認証導線 `/login` `/auth/callback` `/logout` `/auth/logout/callback`
6. watchlist `/app/watchlist`

補足:
- `VITE_ENABLE_DEV_AUTH_BYPASS` を使って画面実装を先行できる前提なら、この順が最も進めやすい。
- OIDC 本接続を最初から通す必要がある場合は、`5. 認証導線` を `2. 公開トップ` の直後へ前倒ししてよい。

## 5. フェーズ別メモ

### 5.1 共有基盤
最初に、全ページで再利用する土台を固める。

対象:
- `src/app/providers`
- `src/app/guards`
- `src/lib/api`
- `src/lib/env`
- `src/components/ui`
- `src/tests/setup.ts`

主な作業:
- `QueryClientProvider` の既定設定を確認し、全画面で共通利用できる状態にする
- 将来の OIDC Provider を差し込めるよう `AppProviders` の責務を整理する
- `apiRequest()` を private API 呼び出しでも再利用しやすい形にそろえる
- query string 組み立て、共通エラー表示、共通ローディング表示を用意する
- テスト時の QueryClient 初期化を共通化する

完了条件:
- 公開 API と認証必須 API の両方を同じ API クライアント方針で呼べる
- 共通 UI 部品だけで `loading / error / empty` を表現できる

### 5.2 公開トップ `/`
最も単純な `1 API + 1 page` で、API 取得の基本形を固める。

対象:
- `src/features/public-summary/api/fetchPublicSummary.ts`
- `src/features/public-summary/hooks/usePublicSummaryQuery.ts`
- `src/features/public-summary/components/PublicSummaryMetrics.tsx`
- `src/pages/public/HomePage.tsx`

主な作業:
- `publicSummarySchema` と API 呼び出しを維持しつつ、表示と異常系を完成させる
- `updated_at` の JST 表示を最終形にする
- `response_invalid` を含む表示文言を確定する

完了条件:
- 成功、通信失敗、レスポンス不正の 3 パターンが画面上で確認できる
- `api -> hook -> component -> page` の標準形が他画面へ横展開できる

### 5.3 ログイン後サマリ `/app`
保護ルート配下での基本パターンを作る。

推奨追加ディレクトリ:
- `src/features/app-summary/api`
- `src/features/app-summary/hooks`
- `src/features/app-summary/components`

主な作業:
- `fetchAppSummary.ts` を作り、`appSummarySchema` と型を定義する
- `useAppSummaryQuery.ts` を作る
- サマリ表示本体を feature UI へ寄せ、`AppSummaryPage` は薄く保つ
- `system_code` 詳細導線をデータ連動に置き換える

完了条件:
- `/app` が `GET /api/v1/summary` の成功系と失敗系を表示できる
- 詳細画面へのリンクが API データに基づいて描画される

### 5.4 システム別最新結果 `/app/systems/:system_code`
Path parameter を持つ詳細画面の基本形を作る。

推奨追加ディレクトリ:
- `src/features/systems/api`
- `src/features/systems/hooks`
- `src/features/systems/components`

主な作業:
- `fetchSystemLatest.ts` を作り、`systemLatestSchema` と型を定義する
- `useSystemLatestQuery(systemCode)` を作る
- `SystemLatestPage` は `system_code` の取得と feature 呼び出しだけにする
- `signals[]` の並びを API 返却順のまま描画する

完了条件:
- 正常系、`signals=[]`、`404`、レスポンス不正を扱える
- `system_code` 単位の Query Key 分離が確認できる

### 5.5 認証導線
OIDC 連携と Guard の本実装をまとめて入れる。

対象:
- `src/features/auth`
- `src/app/providers/AppProviders.tsx`
- `src/app/guards/AuthGuard.tsx`
- `src/pages/public/LoginPage.tsx`
- `src/pages/auth/AuthCallbackPage.tsx`
- `src/pages/public/LogoutPage.tsx`
- `src/pages/auth/LogoutCallbackPage.tsx`

主な作業:
- OIDC 設定生成処理を feature 配下へ分離する
- callback 後の遷移、logout 後の遷移を実装する
- `dev bypass` 時と通常 OIDC 時の分岐を明示する
- private API 呼び出しで Access Token を付与できるようにする

完了条件:
- 未認証状態で `/app` 配下に直接アクセスしたとき、期待どおり認証導線へ戻る
- callback 成功/失敗時の遷移が整理される

### 5.6 watchlist `/app/watchlist`
最も複雑な画面。最後に実装する。

推奨追加ディレクトリ:
- `src/features/watchlist/api`
- `src/features/watchlist/hooks`
- `src/features/watchlist/components`

主な作業:
- `fetchWatchlistPage.ts` を作り、`watchlistSchema` と `next_cursor` を含む型を定義する
- `useWatchlistFilters()` を作り、URL クエリ同期を担当させる
- `useWatchlistInfiniteQuery()` を作り、`cursor` を page param として扱う
- `WatchlistFilters`、`WatchlistTable`、`WatchlistCards` を分離する
- 条件変更時は `cursor` をクリアして先頭ページから再取得する

完了条件:
- `q_ticker` 完全一致、`is_active=true` 既定値、`next_cursor` による追加取得が動く
- モバイルとデスクトップで同じデータを異なる UI で表示できる

## 6. 1PR ごとの切り方
PR は以下の粒度を推奨する。

1. 共有基盤 + 公開トップ `/`
2. ログイン後サマリ `/app`
3. システム別最新結果 `/app/systems/:system_code`
4. 認証導線一式
5. watchlist `/app/watchlist`

理由:
- 前半で `API 呼び出しの基本形` を固定できる
- `watchlist` を最後に回すことで、先に共通部品と設計パターンを育てられる
- 認証導線はアプリ全体へ影響するため、画面単体の参照実装が先に固まってから入れる方が安全

## 7. watchlist 実装前に固定しておく小項目
`watchlist` は大きな追加設計書を増やす必要はないが、以下だけは実装前に短く固定しておく。

- `cursor` の符号化方式
  - 例: `LastEvaluatedKey` を base64 JSON 化する
- `q_ticker` 指定時に `cursor` を受けた場合の扱い
  - `400` とするか、無視するかを固定する
- 追加取得 UI
  - `もっと見る` ボタンにするか、自動読み込みにするかを固定する
- `system_code` / `category_code` のフィルタで `limit` 件に届かない場合の読み進め上限

## 8. 実装開始時の判断基準
- API 契約が 1 画面 1 API で閉じる画面から先に進める
- URL クエリ同期や段階取得を持つ画面は後ろに回す
- OIDC 本接続がブロッカーでない限り、認証導線は参照画面の基本形が固まった後に入れる
- `page` を太らせず、feature 配下へ責務を逃がせるかを常に確認する
