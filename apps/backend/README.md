# Backend README

## 概要

`apps/backend` は、フロントエンドからのリクエストを受けて API Gateway + Lambda 経由で DynamoDB を参照し、画面向けのレスポンスを返すバックエンド層です。

このリポジトリの責務は API と DB 参照に限定します。公開サマリや各システムの最新実行結果を生成・更新するバッチ処理は別リポジトリで管理します。

## 責務

- 公開 API と認証必須 API の提供
- JWT Authorizer で検証済みクレームを前提としたアクセス制御
- クエリ文字列・Path Parameter の検証
- DynamoDB からの参照データ取得
- 画面表示に適したレスポンス整形
- 失敗時の明確なエラーレスポンス返却

## 非責務

- バッチ実行そのもの
- EventBridge Scheduler の設定管理
- 売買ロジックやシグナル生成
- データモデルの詳細設計
- 画面からバッチを起動する API の提供
- 要件外の書き込み系 API の提供

## 提供 API

### 公開 API

- `GET /api/v1/public/summary`
  - 認証不要
  - 公開トップ向けの匿名集計を返す
  - 個別銘柄、閾値、当日シグナル生データは返さない

### 認証必須 API

- `GET /api/v1/summary`
  - `/app` 向けのシステム横断サマリを返す
  - `systems[]` に `system_code` と `system_name` を含める

- `GET /api/v1/systems/{system_code}/latest`
  - `/app/systems/{system_code}` 向けの最新実行結果を返す
  - `signals[]` は保存済みの優先度順を維持して返す

- `GET /api/v1/watchlist`
  - `/app/watchlist` 向けの対象銘柄一覧を返す
  - `q_ticker` は完全一致
  - `is_active` のデフォルトは `true`
  - 並び順は `updated_at` 降順
  - `limit/cursor` によるカーソルベースページングを前提とする

## 認証

- 認証方式は OIDC を前提とします
- フロントエンドは `Authorization: Bearer <token>` で Access Token を送信します
- API Gateway の JWT Authorizer がトークンを検証します
- 未認証・無効トークン・期限切れトークンは `401/403` を返します
- Lambda は検証済みクレームのみを信頼します

## 時刻の扱い

- 業務日付、月次集計、更新日時の意味は JST 基準です
- API 層で日付を再解釈して UTC 基準に置き換えないでください
- `datetime` はタイムゾーン付きで扱い、naive datetime を避けてください

## 想定ディレクトリ構成

```text
apps/backend/
├─ src/
│  ├─ handlers/      # API Gateway 入口。薄いハンドラを保つ
│  ├─ services/      # 取得条件やレスポンス組み立て
│  ├─ repositories/  # DynamoDB との入出力
│  ├─ middleware/    # 認証コンテキスト、エラーハンドリング、ロガー
│  ├─ domain/        # ドメインモデル、値オブジェクト
│  ├─ lib/           # env、validator、response などの共通処理
│  └─ tests/         # pytest ベースのテスト
├─ AGENTS.md
├─ README.md
└─ requirements.txt
```

## 開発ルール

- `handler` は薄く保ち、リクエスト解析とレスポンス整形に集中させる
- ビジネスルールや取得条件の組み立ては `service` に置く
- DynamoDB との入出力は `repository` に閉じ込める
- 公開関数・メソッドは型ヒント必須
- 関数には日本語の Google スタイル docstring を付ける
- モジュール名・関数名・変数名は `snake_case`、定数は `UPPER_SNAKE_CASE`
- 公開 API に機密情報や内部ロジックを出さない

## セットアップ

```bash
pip install -r apps/backend/requirements.txt
```

## ローカル実行コンテナ

ルートの [`compose.yml`](/workspace/compose.yml) には `backend_dev` サービスを用意しています。`DynamoDB Local` はこのリポジトリ内では起動せず、バッチ側 compose が起動している共有インスタンスを利用する前提です。

```bash
docker compose up -d backend_dev
docker compose logs -f backend_dev
```

- 既定ポートは `8080`
- `DYNAMODB_ENDPOINT_URL` の既定値は `http://host.docker.internal:8000`
- 現時点では `apps/backend/src/local_dev_server.py` のプレースホルダーサーバーが起動し、`GET /healthz` で疎通確認できます
- 将来、本実装のローカル起動処理を `apps/backend/src/main.py` に置いた場合は、そちらを優先して起動します

## テスト・静的解析

```bash
pytest
ruff check apps/backend
ruff format apps/backend
mypy apps/backend
```

## テスト方針

- 正常系、異常系、認可境界を振る舞いベースで検証する
- 公開 API が匿名集計のみを返すことを検証する
- 認証必須 API が未認証や無効トークンで `401/403` を返すことを検証する
- `systems/{system_code}/latest` が最新実行結果のみを返し、保存済み順序を維持することを検証する
- `watchlist` の完全一致検索、既定値、並び順、ページングを検証する
- DynamoDB や JWT クレームなどの外部依存はモック化する

## 参照ドキュメント

- [AGENTS.md](./AGENTS.md)
- [web_system_required.md](../../docs/required/web_system_required.md)
