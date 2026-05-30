# Guppy CI/CD・リリースフロー設計

## 1. 文書目的
本書は、Guppy Webシステムにおける GitHub Actions ベースの CI/CD およびリリースフロー設計を定義する。  
対象は、`.github/workflows` 配下に配置するワークフロー、環境ごとのデプロイ方針、AWS 認証連携、デプロイ単位、承認フロー、成果物管理である。

## 2. 関連ドキュメント
- [システム基本設計](../design/system_basic_design.md)
- [バックエンド基本設計](../design/backend_basic_design.md)
- [インフラ IaC 設計](../design/infrastructure_iac_design.md)
- [Webシステム要件定義](../required/web_system_required.md)

## 3. スコープ

### 3.1 対象
- `.github/workflows` 配下の GitHub Actions ワークフロー設計
- フロントエンド、バックエンドの CI 設計
- Web システムの AWS CDK デプロイ設計
- GitHub Environments を用いた承認・環境分離
- GitHub OIDC を用いた AWS 認証

### 3.2 対象外
- アプリケーションコードの詳細設計
- AWS リソースの詳細定義
- バッチリポジトリ側の CI/CD 設計

## 4. 基本方針

### 4.1 運用原則
- フロントエンドとバックエンドは分離してリリースできること
- 本番デプロイ前に自動テストを通過させること
- AWS 認証は長期アクセスキーではなく GitHub OIDC を利用すること
- 本番環境へのデプロイには明示的な承認を挟めること
- 再現性のあるデプロイを行うため、手動コンソール操作に依存しないこと

### 4.2 デプロイ対象
- `Frontend`
  - S3 / CloudFront
- `Backend`
  - API Gateway / Lambda / DynamoDB / Cognito / CloudWatch
- `Infrastructure`
  - AWS CDK により管理するフロントエンド配信基盤、バックエンド関連リソース、GitHub OIDC 関連リソース

### 4.3 責務分離
- CI は品質確認を担当する
- CD は成果物のデプロイを担当する
- リリース判定は GitHub のブランチ保護および Environment 承認で制御する

## 5. 環境設計

### 5.1 想定環境
- `dev`
- `stg`
- `prd`

初期段階では `prd` のみ先行し、必要に応じて `dev` `stg` を追加してよい。  
ただし、設計上は複数環境を前提としておく。

### 5.2 GitHub Environments
GitHub 上に以下の Environment を定義する。

- `backend-dev`
- `backend-stg`
- `backend-prd`
- `frontend-dev`
- `frontend-stg`
- `frontend-prd`

### 5.3 Environment ごとの用途
- `dev`
  - 任意の検証用
  - 手動実行や特定ブランチからの検証を許可
- `stg`
  - 本番相当前確認
  - main 取り込み後の検証用
- `prd`
  - 本番リリース
  - 承認必須

## 6. ブランチ・リリース方針

### 6.1 ブランチ方針
- 機能開発ブランチ
  - `feature/xxx`
- 修正ブランチ
  - `fix/xxx`
- 統合ブランチ
  - `develop`
- デフォルトブランチ
  - `main`

### 6.2 リリース方針
- Pull Request 経由で `main` にマージする
- 本番デプロイは `main` を起点に行う
- 直接本番にデプロイするのではなく、CI 成功済みコミットのみを対象にする

### 6.3 タグ運用
本番リリースは以下のいずれかで運用する。

- `workflow_dispatch` による手動実行
- `v*` タグ push による実行

初期段階では運用負荷を下げるため、`workflow_dispatch` を第一候補とする。

## 7. ワークフロー一覧

### 7.1 推奨ワークフロー
`.github/workflows` 配下には、少なくとも以下を配置する。

- `backend-ci.yml`
- `frontend-ci.yml`
- `cdk-ci.yml`

デプロイ段階で以下を追加する。

- `backend-deploy.yml`
- `frontend-deploy.yml`

必要に応じて以下を追加する。

- `cdk-diff.yml`
- `dependency-update.yml`

### 7.2 各ワークフローの役割
| ファイル名 | 主目的 | 主トリガー |
|---|---|---|
| `backend-ci.yml` | バックエンドの品質確認 | `pull_request`, `push` |
| `backend-deploy.yml` | バックエンドのデプロイ | `workflow_dispatch`, `push`, `tag` |
| `frontend-ci.yml` | フロントエンドの品質確認 | `pull_request`, `push` |
| `frontend-deploy.yml` | フロントエンドのデプロイ | `workflow_dispatch`, `push`, `tag` |
| `cdk-ci.yml` | CDK app の build / synth 確認 | `pull_request`, `push` |
| `cdk-diff.yml` | CDK 差分確認 | `pull_request` |

## 8. バックエンド CI 設計

### 8.1 対象
- `apps/backend/**`

### 8.2 実行内容
- Python セットアップ
- 依存関係インストール
- `ruff check`
- `mypy`
- `pytest`

### 8.3 トリガー
- `pull_request`
  - `main` 向け
  - `develop` 向け
- `push`
  - `develop`
  - `main`
  - `feature/**`
  - `fix/**`

初期実装では、push は `develop` と `main` を対象とする。
feature / fix ブランチでは Pull Request 作成時に CI を実行し、必要になった段階で push 対象へ追加する。

### 8.4 失敗時の扱い
- CI 失敗時はマージ不可とする
- 本番デプロイワークフローは CI 成功済みコミットのみを対象とする

## 9. バックエンド デプロイ設計

### 9.1 デプロイ方式
- AWS CDK を用いてバックエンド関連リソースをデプロイする
- Lambda コードと API Gateway 設定を同一フローで扱う

### 9.2 主な実行内容
- Python セットアップ
- 依存関係インストール
- CDK 依存関係インストール
- `cdk synth`
- 必要に応じて `cdk diff`
- `cdk deploy`

### 9.3 トリガー
- `workflow_dispatch`
  - 環境を指定して手動デプロイする
- 将来的に必要なら `main` マージ時の自動 `dev/stg` デプロイを許可する
- `prd` は手動実行またはタグ起点を推奨する

### 9.4 入力パラメータ
`workflow_dispatch` では少なくとも以下を入力とする。

- `environment`
  - `dev` / `stg` / `prd`
- `stack_scope`
  - `backend` / `all`
- `confirm_production`
  - 本番時のみ明示確認用

### 9.5 本番デプロイ制約
- `prd` は GitHub Environment の承認必須
- `main` 由来のコミットのみ許可
- テスト成功済みであることを前提とする

## 10. フロントエンド CI/CD 設計

### 10.1 フロントエンド CI
フロントエンド実装追加後は以下を実行する。

- 依存関係インストール
- lint
- type check
- test
- build

### 10.2 フロントエンド デプロイ
- ビルド成果物を S3 へ配置する
- 必要に応じて CloudFront キャッシュ無効化を行う
- バックエンドとは独立して実行できるようにする
- S3 / CloudFront / OAC / bucket policy は CDK 管理対象とし、通常のフロントエンドデプロイでは変更しない
- 独自ドメイン、ACM、Route 53、WAF は初期スコープ外とし、デプロイワークフローでも扱わない

## 11. CDK 差分確認フロー

### 11.1 CDK CI
- AWS 認証なしで実行できる CDK の静的確認として、`cdk-ci.yml` を先に実装する。
- 対象は `infra/cdk/**` と、Lambda asset に影響する `apps/backend/src/**` とする。
- 実行内容は以下とする。
  - Node.js セットアップ
  - Python 3.11 セットアップ
  - CDK 依存関係インストール
  - `npm run build`
  - `npm run synth -- -c config=config/dev.example.json`
- `cdk-ci.yml` では AWS 認証、`cdk diff`、`cdk deploy`、`cdk destroy` を実行しない。

### 11.2 CDK diff の目的
- Pull Request 時点でインフラ変更内容をレビュー可能にする
- 想定外の差分を早期に検出する

### 11.3 CDK diff の実行内容
- CDK synth
- CDK diff
- 差分の要約を PR に出力

### 11.4 CDK diff の適用対象
- `infra/cdk/**`
- フロントエンド配信基盤の定義変更を含む場合
- バックエンド Lambda 定義変更を含む場合

`cdk-diff.yml` は GitHub OIDC Role と環境別設定の扱いが固まった後に追加する。
初期段階では `cdk-ci.yml` による build / synth までを CI の範囲とする。

## 12. AWS 認証設計

### 12.1 方針
- GitHub Actions から AWS へ接続する際は GitHub OIDC を利用する
- 長期の AWS Access Key / Secret Access Key は GitHub Secrets に保存しない

### 12.2 構成
- GitHub OIDC Provider を AWS 側に登録する
- 環境ごとに AssumeRole 用 IAM Role を用意する
- GitHub Actions は `id-token: write` 権限でトークンを取得する

### 12.3 環境別ロール例
- `GitHubActionsBackendDevRole`
- `GitHubActionsBackendStgRole`
- `GitHubActionsBackendPrdRole`
- `GitHubActionsFrontendPrdRole`

### 12.4 権限方針
- 環境ごとに最小権限ロールを分離する
- `prd` には本番デプロイに必要な権限のみを付与する
- 読み取り専用の diff 用ロールを別途作成してもよい

## 13. Secrets / Variables 設計

### 13.1 GitHub Secrets に置かないもの
- AWS 長期アクセスキー
- 本番用シークレット値そのもの

### 13.2 GitHub Environments / Variables に置く候補
- `AWS_REGION`
- `AWS_ROLE_ARN`
- `CDK_APP_PATH`
- `FRONTEND_S3_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID`

### 13.3 AWS 側に置くもの
- Cognito 設定の機密値
- アプリケーションの機密設定
- 将来追加される秘密情報

## 14. 成果物設計

### 14.1 バックエンド
- CDK デプロイを前提とするため、ローカル生成物の長期保存は必須としない
- 必要に応じて `cdk.out` を一時成果物として扱う

### 14.2 フロントエンド
- ビルド成果物をアーティファクトとして保持してよい
- 同一アーティファクトを利用して複数環境へ再配布可能な構成を優先する

## 15. 承認・保護設計

### 15.1 ブランチ保護
- `main` への直接 push を禁止する
- Pull Request 必須とする
- 必須ステータスチェックとして CI を設定する

### 15.2 Environment 保護
- `prd` Environment は承認者を設定する
- `prd` デプロイ前に人手確認を挟む

## 16. 障害時・ロールバック方針

### 16.1 基本方針
- フロントエンドは直前の安定版成果物へ戻せるようにする
- バックエンドは CDK と Lambda の直前安定版へ戻せるようにする
- リリース単位は Git commit と紐づける

### 16.2 最低限の対応
- どのコミットがどの環境へデプロイされたかを記録する
- デプロイ履歴を GitHub Actions 上で追跡できるようにする
- 本番障害時は直前コミット再デプロイを可能にする

## 17. `.github` 配下の想定構成
```text
.github/
├─ workflows/
│  ├─ backend-ci.yml
│  ├─ backend-deploy.yml
│  ├─ cdk-ci.yml
│  ├─ frontend-ci.yml
│  ├─ frontend-deploy.yml
│  └─ cdk-diff.yml
└─ pull_request_template.md
```

## 18. 初期実装順序
1. `frontend-ci.yml` を作成する
2. `backend-ci.yml` を作成する
3. `cdk-ci.yml` を作成する
4. GitHub OIDC と AWS IAM Role を整備する
5. `prd` Environment の承認設定を行う
6. `frontend-deploy.yml` を `workflow_dispatch` ベースで作成する
7. `backend-deploy.yml` を `workflow_dispatch` ベースで作成する
8. 必要に応じて `cdk-diff.yml` と dev / stg 向け CDK deploy workflow を追加する

## 19. 設計上の注意事項
- 本番デプロイを完全自動にしない
- Secrets を GitHub 側へ過剰に置かない
- CI と CD を混ぜすぎず、責務を分ける
- フロントエンドとバックエンドを同時リリース前提にしない
- テスト未実行の状態で PR や本番デプロイを行わない
