# Guppy バックエンド実装メモ

## 1. 文書目的
本書は、バックエンド実装開始前後の判断、未決事項、実装順序、ローカル開発方針を記録する。

基本設計や API 契約で固定済みの内容は各設計書を正とし、本書では実装時に迷いやすい補足と、後続タスクへ引き継ぐべき論点を扱う。

## 2. 関連ドキュメント
- [バックエンド基本設計](backend_basic_design.md)
- [DynamoDB データ設計](dynamodb_data_design.md)
- [フロントエンド API 契約](frontend_api_contract.md)
- [CI/CD・リリースフロー設計](../operations/ci_cd_design.md)
- [Backend README](../../apps/backend/README.md)

## 3. 現時点の前提
- 現在のバックエンドは、フロントエンド開発用のダミーサーバーが中心である。
- 本実装は `API Gateway + Lambda + DynamoDB` を前提にする。
- API は初期段階では read-only に限定する。
- バッチ処理、集計更新、シグナル生成は別リポジトリの責務とする。
- AWS アカウントや Cognito の実値は未準備のため、当面は dummy の環境値で開発を進める。

## 4. 実装開始前に決めたこと

### 4.1 `success_rate` の扱い
DynamoDB では `success_rate` を `0..1` の比率で保持する。

API レスポンスでは、フロントエンド API 契約に合わせて `0..100` の百分率へ変換して返す。

例:
- DynamoDB: `0.9444`
- API: `94.44`

この変換はバックエンドの assembler 層で行い、フロントエンドには比率を渡さない。

### 4.2 watchlist の既定挙動
`GET /api/v1/watchlist` は query parameter 未指定時にも以下を適用する。

- `is_active=true`
- `updated_at` 降順

`sort` は `updated_at_desc` のみ許可する。未指定時も同じ並び順として扱う。

ダミーサーバーはこの方針に合わせて修正済み。

### 4.3 ローカル DynamoDB の目的
ローカル DynamoDB には、すでに本番相当の read model データが投入されている前提で開発する。

このデータは、主に以下の用途で使う。

- ローカル手動確認
- repository 層が実際の DynamoDB API で動作することの確認
- `PK` / `SK` / `GSI` の設計と実装のズレ検出
- watchlist の `LastEvaluatedKey` とページング挙動の確認
- 実データに近い件数、属性欠損、並び順で API レスポンスを確認すること
- バッチリポジトリが書き込む read model との shape すり合わせ

ただし、すべての単体テストを DynamoDB Local や本番相当データに依存させない。

単体テストは `moto` または repository の fake を使い、DynamoDB Local はローカル結合確認や手動確認に寄せる。

初期実装では `Stubber` は採用しない。

本番相当データは Git 管理しない。`docs/design`、`tests/fixtures`、seed JSON へ実データを貼り付けない。

ログにはレスポンス全体や DynamoDB item 全体を出さず、調査に必要な `request_id`、`system_code`、件数、エラー種別などに絞る。

### 4.4 テスト fixture と本番相当データの分離
本番相当データは Git 管理しない。

自動テストには、実データではなく小さい固定 fixture を使う。

fixture 候補:

- `apps/backend/tests/fixtures/*.json`
- テスト内の最小 dict fixture
- repository fake

ローカル DynamoDB に投入済みの本番相当データは、手動確認と repository の結合確認に限定する。

将来、このリポジトリ単体で DynamoDB Local を初期化したくなった場合のみ、匿名化した seed スクリプトを別途検討する。

## 5. cursor 仕様の検討

### 5.1 候補
| 方式 | メリット | デメリット | 評価 |
|---|---|---|---|
| `offset:10` | 実装が簡単で理解しやすい | DynamoDB と相性が悪い。途中でデータが変わるとズレる。大きい offset が非効率 | ダミーサーバー用に限定 |
| `LastEvaluatedKey` を JSON 化して base64url | DynamoDB と相性がよい。ステートレス。低コスト | キー構造が少し見える。改ざん検知はできない | 署名なしでは採用しない |
| base64url + HMAC 署名 | 改ざんを検出できる。ステートレス。実運用に向く | 署名キー管理が必要。実装が少し増える | 初期本実装で採用 |
| サーバー側 cursor 保存 | cursor が短い。内部構造を隠せる。TTL 管理できる | 保存先が必要。状態管理が増える | 今回の規模では過剰 |
| 暗号化 cursor | 内部構造を隠せる。改ざんにも強い | 鍵管理と実装が重い | 機密性が高い cursor でなければ不要 |

### 5.2 推奨方針
初期本実装から、`LastEvaluatedKey` を含む JSON payload に HMAC 署名を付与し、全体を `base64url` でエンコードする方式を採用する。

フロントエンドは cursor を opaque string として扱い、中身を decode しない。

payload 例:

```json
{
  "v": 1,
  "exclusive_start_key": {
    "ticker": "AAPL",
    "is_active": "true",
    "updated_at_epoch": 1772237460
  },
  "filters": {
    "is_active": true,
    "system_code": "DMP",
    "category_code": "MEGA_TECH",
    "q_ticker": null,
    "limit": 50,
    "sort": "updated_at_desc"
  }
}
```

cursor は、以下の内部 JSON を `base64url` でエンコードした opaque string として API に返す。

フロントエンドはこの JSON を直接扱わず、返却された cursor 文字列を次回リクエストの query parameter にそのまま渡す。

`base64url` エンコード前の内部 JSON は以下のようにする。

```json
{
  "payload": {
    "v": 1,
    "exclusive_start_key": {
      "ticker": "AAPL",
      "is_active": "true",
      "updated_at_epoch": 1772237460
    },
    "filters": {
      "is_active": true,
      "system_code": "DMP",
      "category_code": "MEGA_TECH",
      "q_ticker": null,
      "limit": 50,
      "sort": "updated_at_desc"
    }
  },
  "sig": "hmac-sha256-signature"
}
```

次ページ取得時は、cursor 内の `filters` と現在の query parameter が一致していることを検証する。

`q_ticker` と `limit` も一致検証対象に含める。したがって、cursor 発行後に `limit` を変更した次ページ取得は `400 invalid_cursor` として扱う。

署名が一致しない場合、decode できない場合、payload の version が未対応の場合、現在の query parameter と `filters` が一致しない場合は `400 invalid_cursor` を返す。

HMAC 署名に使う秘密値は `CURSOR_SIGNING_SECRET` として環境変数で受け取る。

本番では Secrets Manager または SSM Parameter Store で管理し、Lambda 環境変数へ渡す。

バックエンドは、発行した cursor や署名そのものを DynamoDB などへ保存しない。

cursor 検証時は、返却された cursor の `payload` から `CURSOR_SIGNING_SECRET` を使って署名を再計算し、cursor 内の `sig` と一致するかを確認する。

この方式により、cursor ごとのサーバー側状態を持たずに改ざん検知を行う。

署名対象の payload JSON は、キー順や空白差分で署名が揺れないように正規化する。

Python 実装では以下のような固定ルールで JSON 文字列化する。

```python
json.dumps(payload, separators=(",", ":"), sort_keys=True)
```

`CURSOR_SIGNING_SECRET` を変更すると、過去に発行した cursor は検証できなくなる。cursor は一時的なページング状態のため、古い cursor は `400 invalid_cursor` として扱い、利用者には再検索してもらう前提とする。

## 6. 認証・CORS・環境値の扱い

### 6.1 現時点の方針
AWS アカウントや Cognito の実値が未準備のため、現時点では dummy env で開発を進める。

これらはコード上の定数ではなく、環境別設定値として扱う。

コードにハードコードせず、`.env.example`、CDK context、GitHub Environment Variables などから注入できる形にする。

### 6.2 ローカル環境値の例
```env
ENV_NAME=local
VITE_AUTH_MODE=dev-bypass
VITE_API_BASE_URL=/api
VITE_OIDC_AUTHORITY=http://localhost:9000/dummy
VITE_OIDC_CLIENT_ID=guppy-web-local
ALLOWED_ORIGINS=http://localhost:5173
COGNITO_ISSUER_URL=http://localhost:9000/dummy
COGNITO_AUDIENCE=guppy-web-local
CURSOR_SIGNING_SECRET=local-dev-cursor-secret
```

### 6.3 本番向け制約
`ENV_NAME=prd` では dummy 値を許可しない。

本番向けの settings 読み込み、CDK synth、または deploy 前チェックで以下を検出した場合は失敗させる。

- `dummy` を含む issuer / audience
- `localhost` の CORS origin
- `VITE_AUTH_MODE=dev-bypass`
- 空の Cognito / OIDC 設定
- 空または短すぎる `CURSOR_SIGNING_SECRET`

### 6.4 実値が必要になるタイミング
以下に着手するまでは dummy env で進めてよい。

- API Gateway JWT Authorizer の実デプロイ
- Cognito User Pool / App Client の実作成
- フロントエンドの OIDC 実接続
- 本番または staging の CORS 設定
- GitHub Actions からの CDK deploy

### 6.5 本番用 dummy 値拒否の実装箇所
フロントエンドの env 検証では、すでに本番 `dev-bypass` を拒否する方針がある。

追加対応として、バックエンド settings 検証と CDK context 検証を実装する。

#### バックエンド settings 検証
`apps/backend/src/lib/settings.py` で環境変数を読み込み、`ENV_NAME=prd` の場合に dummy / local 用の値を拒否する。

対象候補:

- `COGNITO_ISSUER_URL`
- `COGNITO_AUDIENCE`
- `ALLOWED_ORIGINS`
- `CURSOR_SIGNING_SECRET`
- DynamoDB endpoint override

拒否する値の例:

- `dummy`
- `example`
- `localhost`
- `127.0.0.1`
- local 用 DynamoDB endpoint
- 空文字

`CURSOR_SIGNING_SECRET` は、`ENV_NAME=prd` では十分な長さの値を必須とし、`dummy`、`example`、`local` を含む値を拒否する。

この検証は settings 生成時に一度だけ行い、handler ごとに重複実装しない。

#### CDK context 検証
`infra/cdk` 側でも、`environment=prd` の synth / deploy 前に同じ種類の値を拒否する。

CDK で拒否する目的は、危険な設定の AWS リソースを作成する前に失敗させることである。

対象候補:

- Cognito issuer / User Pool ID / App Client ID
- CORS 許可 origin
- API domain
- frontend auth mode
- cursor signing secret
- DynamoDB table name / endpoint override

#### GitHub Actions の扱い
GitHub Actions の deploy 前チェックは、CDK context 検証を補助する最後の保険として扱う。

初期段階では必須にしない。

本番 deploy workflow を追加する段階で、`confirm_production` のような明示確認入力を検討する。

## 7. 実装順序メモ
初期のバックエンド実装は、以下の順で進める。

1. Python 設定ファイルを整備する
   - `pyproject.toml`
   - `ruff`
   - `mypy`
   - `pytest`
2. 共通部品を作る
   - `lib/settings.py`
   - `lib/errors.py`
   - `lib/response.py`
   - `lib/validators.py`
3. `GET /api/v1/public/summary` に必要な domain / assembler / usecase / handler を作る
   - `PublicSummaryItem`
   - `PublicSummaryResponse`
   - `PublicSummaryAssembler`
   - `GetPublicSummaryUseCase`
   - `get_public_summary` handler
4. DynamoDB repository の土台を作る
   - `repositories/dynamodb_client.py`
   - 各テーブル名を env 経由で取得
5. `GET /api/v1/public/summary` の DynamoDB repository を実装する
   - DynamoDB から `PUBLIC/CURRENT` を取得
   - `success_rate` は DynamoDB 保存形の `0..1` のまま取得し、百分率変換は assembler に閉じ込める
   - API response の公開禁止項目除外は assembler に閉じ込める
6. HMAC 署名付き cursor encode / decode の helper とテストを作る
7. `GET /api/v1/summary` を実装する
8. `GET /api/v1/systems/{system_code}/latest` を実装する
9. `GET /api/v1/watchlist` を実装する
   - `is_active=true` 既定値
   - `updated_at` 降順
   - `limit/cursor`
   - `q_ticker` 完全一致
10. ローカル DynamoDB 接続確認手順を整備する
11. CDK の雛形を追加する
12. API Gateway / Lambda / DynamoDB / Cognito を配線する

## 8. 未決事項

### 8.1 ローカル DynamoDB の運用範囲
現状は、バッチ側 compose の共有 DynamoDB Local を使う。

将来、このリポジトリ単体で DynamoDB Local を起動できるようにするかは未決。

### 8.2 認証実値
AWS アカウント準備後に以下を確定する。

- Cognito User Pool issuer
- App Client ID
- callback URL
- logout URL
- CORS 許可 origin
- API Gateway の公開 URL
- `VITE_API_BASE_URL`

## 9. 直近の推奨タスク
1. `pyproject.toml` を追加し、Python 品質コマンドを固定する。
2. `GET /api/v1/public/summary` の assembler / usecase / repository / handler を最小構成で作る。
3. `success_rate` 変換の単体テストを追加する。
4. HMAC 署名付き cursor encode / decode の helper とテストを作る。
5. バックエンド `settings.py` で `ENV_NAME=prd` の dummy / localhost 拒否を実装する。
6. CDK context 検証で `environment=prd` の dummy / localhost 拒否を実装する。
7. 既存の DynamoDB Local データに対する接続確認手順を README に追記する。
