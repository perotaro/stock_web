# Codex Multi-Agent Review

Codexでコードレビューを行うときに、複数の専門観点を持つレビュー用Subagentを使って、変更差分を多面的に確認するためのSkillです。

このSkillは、Pull Request、ブランチ差分、コミット、作業ツリーの未コミット変更を対象に、正しさ・セキュリティ・テスト・保守性・性能・フロントエンド/アクセシビリティ・運用/ドキュメントの観点を分けてレビューし、最後に重複や推測を除いた統合レビューとしてまとめます。

## できること

- Codexでレビュー対象を推定し、`main`などのベースブランチとの差分を確認します。
- `AGENTS.md`、`AGENTS.override.md`、`CONTRIBUTING.md`、`SECURITY.md`、`TESTING.md`などのリポジトリ内ルールを優先して読みます。
- 変更の大きさやリスクに応じて、複数のレビュー観点をSubagentまたは逐次レビューとして実行します。
- 実際の不具合・回帰・セキュリティリスク・テスト不足・運用上の懸念を、証拠付きで報告します。
- 必要に応じて、同梱のカスタムAgent定義を`.codex/agents/`または`~/.codex/agents/`へ導入できます。

## インストール

このZIPを展開すると、次のディレクトリが含まれています。

```text
codex-multi-agent-review/
├── SKILL.md
├── README.md
├── agents/
├── assets/
│   └── codex-agents/
├── references/
└── scripts/
```

### リポジトリ単位で使う場合

対象リポジトリのルート、またはCodexを起動する作業ディレクトリ配下に配置します。

```bash
mkdir -p .agents/skills
unzip skill.zip -d .agents/skills
```

配置後の例:

```text
your-repo/
└── .agents/
    └── skills/
        └── codex-multi-agent-review/
            └── SKILL.md
```

### ユーザー共通で使う場合

複数リポジトリで使う場合は、ユーザーディレクトリに配置します。

```bash
mkdir -p ~/.agents/skills
unzip skill.zip -d ~/.agents/skills
```

## 使い方

Codex CLIまたはCodexで、Skill名を明示してレビューを依頼します。

```text
$codex-multi-agent-review を使って、このブランチをmainとの差分でレビューしてください。正しさ、セキュリティ、テスト、保守性の観点でSubagentを分け、全結果を待ってから統合レビューにしてください。
```

作業ツリーの未コミット変更をレビューする場合:

```text
$codex-multi-agent-review を使って、現在の未コミット変更をレビューしてください。実際のバグと不足テストを優先してください。
```

GitHub PRや特定ブランチを指定する場合:

```text
$codex-multi-agent-review を使って、PR #123をレビューしてください。認可、PII、回帰テスト不足を重点的に見てください。
```

## レビュー観点

標準では、以下の観点を使います。

| 観点 | 目的 |
| --- | --- |
| correctness / behavior | 機能回帰、エッジケース、API契約違反、状態管理の不具合を探します。 |
| security / privacy | 認可、入力検証、インジェクション、秘密情報、PII、依存関係リスクを確認します。 |
| tests / QA | 変更内容に対するテスト不足、CI不足、脆いテストを確認します。 |
| maintainability / API design | 既存パターンとの不整合、過剰な結合、公開API変更、将来の保守リスクを見ます。 |
| performance / reliability | ホットパス、N+1、キャッシュ、タイムアウト、並行処理、運用上の劣化を見ます。 |
| frontend / accessibility | UI状態、フォーム、ルーティング、フォーカス、ARIA、レスポンシブ、視覚回帰を見ます。 |
| docs / DX / ops | README、移行手順、設定、CI、リリース、運用、ロールバックの不足を見ます。 |

詳細な観点定義は`references/review-agents.md`にあります。

## 出力形式

最終出力は、`references/output-template.md`の形式に従います。

主な構成:

- Verdict: `approve` / `approve with comments` / `changes requested` / `needs human decision`
- Blocking findings: P0/P1の重大・修正必須の指摘
- Non-blocking findings: P2/P3の重要だがブロックしない指摘
- Missing or weak tests: 差分に紐づくテスト不足
- Checks run: 実行したlint、test、typecheckなど
- Agent coverage: 実行した観点と未実行理由

## カスタムSubagentを使う場合

このSkillは、任意で使えるカスタムAgent定義を`assets/codex-agents/`に同梱しています。Skill自体はこれらを導入しなくても使えます。

リポジトリ単位で導入する場合:

```bash
cd .agents/skills/codex-multi-agent-review
python3 scripts/install_custom_agents.py --target ../../../.codex/agents
```

または手動でコピーします。

```bash
mkdir -p .codex/agents
cp .agents/skills/codex-multi-agent-review/assets/codex-agents/*.toml .codex/agents/
```

ユーザー共通で導入する場合:

```bash
mkdir -p ~/.codex/agents
cp ~/.agents/skills/codex-multi-agent-review/assets/codex-agents/*.toml ~/.codex/agents/
```

上書きする場合は、既存ファイルを確認したうえで`--force`を使ってください。

## 推奨プロンプト

標準レビュー:

```text
$codex-multi-agent-review を使って、このブランチをmainとの差分でレビューしてください。変更マップを作り、correctness、security/privacy、tests、maintainabilityの各観点を走らせ、必要ならperformanceやopsも追加してください。推測ではなく、差分と既存コードに紐づく証拠がある指摘だけを出してください。
```

セキュリティ重視:

```text
$codex-multi-agent-review を使って、認可、テナント分離、PII、ログ出力、依存関係の変更を重点的にレビューしてください。攻撃または誤用シナリオが説明できるものだけ指摘してください。
```

テスト重視:

```text
$codex-multi-agent-review を使って、今回の変更で不足している回帰テストとCIチェックを中心にレビューしてください。各テスト不足は、どの変更挙動を守るために必要かまで説明してください。
```

## 運用上の注意

- デフォルトはレビュー専用です。ユーザーが明示しない限り、コードは編集しません。
- Subagentは原則としてread-onlyで使います。
- 小さな差分では、Subagentを実際に使わず、同じ観点をメインスレッドで順番に模擬レビューしても構いません。
- スタイルだけの指摘は避け、実害や検証可能なリスクがある内容を優先します。
- 実行できなかったテストや確認コマンドは、失敗扱いではなく「未実行理由」として明記します。
- 大規模差分では、最大6個程度のSubagentに抑えて、結果を統合してください。

## カスタマイズ

リポジトリ固有のレビュー基準は、Skill自体を直接変更するより、まずリポジトリの`AGENTS.md`や`code_review.md`に追加するのがおすすめです。

Skillを変更する場合は、主に以下を編集します。

- `SKILL.md`: レビュー全体の手順や発火条件
- `references/review-agents.md`: 観点ごとのチェック項目
- `references/output-template.md`: 最終レビューの形式、Severity定義
- `assets/codex-agents/*.toml`: カスタムAgentの名前、説明、開発者指示、sandbox設定

## トラブルシューティング

### Skillが候補に出ない

- 配置先が`.agents/skills/`または`~/.agents/skills/`配下になっているか確認してください。
- `codex-multi-agent-review/SKILL.md`が存在するか確認してください。
- Codexを再起動すると認識される場合があります。

### Subagentが起動されない

- プロンプトで「Subagentを分けて実行」「各観点を並列に走らせる」「全結果を待つ」と明示してください。
- 小さな差分では、Skillが逐次レビューに切り替える場合があります。

### カスタムAgentが見つからない

- `.codex/agents/`または`~/.codex/agents/`にTOMLがコピーされているか確認してください。
- Agent名はTOML内の`name`で指定されています。例: `review_correctness`、`review_security_privacy`。

## 同梱ファイル

- `SKILL.md`: Skillのメイン手順
- `README.md`: この日本語README
- `references/review-agents.md`: レビュー観点の詳細
- `references/output-template.md`: 出力テンプレートとSeverity定義
- `references/custom-agent-setup.md`: カスタムAgent導入手順
- `assets/codex-agents/*.toml`: 任意導入用のカスタムAgent定義
- `scripts/install_custom_agents.py`: Agent定義をコピーする補助スクリプト
