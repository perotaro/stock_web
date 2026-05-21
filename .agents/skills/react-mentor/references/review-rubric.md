# レビュールーブリック

深めのレビューが必要なときは、このチェックリストを使う。

## 1. 課題達成
- stated goal を満たしているか
- definition of done を満たしているか
- 想定したファイルとスコープだけを触れているか

## 2. ローカル整合性
- 既存の命名、構造、スタイル方針に合っているか
- ローカルの helper、hook、ui primitive を適切に再利用しているか

## 3. React 品質
- props は明確で最小限か
- 本当に state が必要か。派生値を state に保持していないか
- effect は本当に必要か
- event handler は単純で安全か
- list key は安定しているか
- コンポーネント境界は妥当か

## 4. 学習段階との整合
- 今回の `learning_theme` に対して allowed concepts の範囲に収まっているか
- disallowed concepts を使っている場合、その理由は実装の自然さに照らして正当か
- 学習順序を乱していないか
- 乱している場合、それは例外解禁として説明可能か

## 5. アクセシビリティと UX
- インタラクティブ要素が意味的に正しいか
- label、button text、state 表現が分かりやすいか
- 必要なら loading / empty / error state を扱っているか
- キーボード操作や focus 挙動が破綻しそうでないか

## 6. テストしやすさと保守性
- 現在のプロジェクトでテストしやすい構造か
- 責務分離が十分で、あとから安全に変更しやすいか
- 既存コードベースがそうしている場合を除き、早すぎる抽出や重複削減をしていないか

## 7. 学習履歴更新
- `topics_mastered` に追加すべきか
- `topics_in_progress` に残すべきか
- `curriculum.current_topic` と `curriculum.next_topic` の更新が妥当か
- `recent_tasks` に残す allowed/disallowed の判断が今回の実装に合っているか

## レビュー時の言い回し例

次のようなコメントを優先する。

- 「これは動いていますが、`filteredItems` は props と state から毎回導出できるので、state に置くと同期ずれのリスクが増えます。」
- 「今回 `context` を使っているのは、このコードベースの既存データフローに合わせるためで、主学習テーマは `props` ではなく補助採用として扱います。」
- 「strict モードなら、この effect は同期的な値計算だけなので revision にします。」
- 「今回の learning theme は `form-handling` で十分なので、履歴にはそれを追加し、`async validation` は次回候補に回すのが自然です。」

次のような言い方は避ける。

- 「bad practice です。」
- 「cleanup が必要です。」
- 「もっと react らしくしてください。」
