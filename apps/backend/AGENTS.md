## Project Overview

バックエンドは、画面からのリクエストを受けて認証・入力検証を行い、DynamoDB から参照データを取得して API レスポンスを返す層とする。

- 言語: Python 3.11
- 実行基盤: AWS Lambda + API Gateway + DynamoDB
- 認証: OIDC 前提、Cognito User Pools を第一候補とし、API Gateway の JWT Authorizer で検証済みクレームを Lambda に渡す
- 提供API: `GET /api/v1/public/summary` `GET /api/v1/summary` `GET /api/v1/systems/{system_code}/latest` `GET /api/v1/watchlist`
- 主責務: 認証済みリクエストの受け付け、クエリ条件の解釈、DynamoDB 参照、レスポンス整形、エラー応答
- データ前提: 公開サマリや最新実行結果などの元データは別リポジトリで管理されるバッチ処理により作成・更新される
- 時刻基準: 返却する業務日付・月次集計・更新日時の意味は JST 基準を前提とする
- 対象外: バッチ実行、スケジュール管理、売買ロジック、データモデル詳細、画面からのバッチ起動

## Commands

- Install dependencies: `pip install -r apps/backend/requirements.txt`
- Run all tests: `pytest`
- Run coverage: `pytest apps/backend/tests --cov=apps/backend/src --cov-report=term-missing`
- Run single test: `pytest -k <test_name>`
- Lint: `ruff check apps/backend`
- Format: `ruff format apps/backend`
- Type check: `mypy apps/backend`

## Code Style

- モジュール名・ファイル名: `snake_case.py` (`get_public_summary.py`)
- クラス名: `PascalCase`、例外クラスは `Error` サフィックスを付ける
- 関数名・変数名: `snake_case`、定数: `UPPER_SNAKE_CASE`
- 公開関数・メソッドは型ヒントを必須とし、日本語の docstring を Google スタイルで記述する
- handler は薄く保ち、リクエスト解析・認証済みコンテキスト受け取り・レスポンス整形に集中させる
- API ごとの実行手順は usecase、外部入力の解釈は parser、API response への変換は assembler、DynamoDB との入出力は repository に分離する
- repository implementation は DynamoDB item を domain DTO に変換して返す。ただし API response model は返さない
- domain は現時点では rich domain model ではなく、DynamoDB item、API response、query、cursor などを表す pydantic DTO / schema model として扱う
- datetime はタイムゾーン付きで扱い、JST 前提の値を naive datetime で扱わない
- コメントは「なぜ」を補足するときだけ追加し、コード上で表現できる内容はコメントに逃がさない

## Testing

- フレームワーク: `pytest` を前提に、正常系・異常系・認可境界を振る舞いベースで検証する
- 公開API: 保存済みの匿名集計値のみを返し、個別銘柄・閾値・生シグナルを公開しないことを検証する
- 認証必須API: 未認証・無効トークン・期限切れトークンで `401/403` となることを検証する
- JST 基準の集計値や更新日時を API が破壊せず返すことを検証する
- DynamoDB、JWT Authorizer のクレーム、Secrets Manager / SSM Parameter Store などの外部依存は必ずモック化する
- DB アクセス失敗や不正入力時は、明確なエラーメッセージと適切なステータスコードを返すことを検証する

## Boundaries

- `.env*` ファイルを変更・コミットしない
- データベースのマイグレーションを自動実行しない
- 公開領域・公開APIに機密情報、内部ロジック、個別銘柄、パラメータ値、当日シグナル生データを出さない
- 画面からバッチ起動する API や、要件外の書き込み系 API（`POST` `PUT` `PATCH` `DELETE`）を追加しない
- バッチ実行、Scheduler 設定、集計更新ジョブの責務をこのリポジトリに持ち込まない
- 認証必須APIで JWT Authorizer を迂回しない。未検証トークンやクライアント自己申告の権限情報を信用しない
- Cognito の callback URL、logout URL、許可ドメイン、Secrets などの環境差分をコードにハードコードしない
- JST 前提の業務日付を UTC で代用しない
- 画面責務と API 責務を分離し、公開領域と認証後領域の境界を曖昧にしない
