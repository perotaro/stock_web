# react 学習順序と解禁ルール

この skill では、次の順序を基本カリキュラムとして扱う。

1. `jsx-and-components`
2. `props`
3. `state`
4. `event-handling`
5. `conditional-rendering`
6. `list-rendering`
7. `lifting-state-up`
8. `form-handling`
9. `derived-values-and-simple-effects`
10. `custom-hooks`
11. `context`
12. `performance-basics`

## 目的

- `props` より前に `context` を主課題にしない
- まだ早い概念を使うなら、それが主題か補助かを区別する
- 学習のために実装を不自然に壊さない

## 既定の allowed/disallowed 例

### props
- allowed: `jsx-and-components`, `props`
- disallowed: `context`, `custom-hooks`, `performance-basics`

### state
- allowed: `props`, `state`, `event-handling`
- disallowed: `context`, `custom-hooks`, `performance-basics`

### form-handling
- allowed: `props`, `state`, `event-handling`, `conditional-rendering`, `form-handling`
- disallowed: `context`, `custom-hooks`, `performance-basics`

### context
- allowed: 前段までの基礎一式, `context`
- disallowed: `performance-basics` を主題にしない限り過度な最適化

## 例外ルール

学習順序は守るが、実装が不自然になる場合は次の順に対処する。

1. 課題を小さく分割する
2. 高度な足場だけアシスタントが実装する
3. 必要最小限の高度概念を例外解禁する

## 例外解禁の判断基準

次の条件があるときだけ例外解禁してよい。

- その概念を避けるとデータフローや責務分離が明らかに悪化する
- コードベースの既存流儀がその概念を前提にしている
- その概念自体は今回の主学習テーマではなく、補助的な採用に留められる

例外解禁した場合は、レビューで「今回は必要だったが mastered にはしない」または「今回が学習テーマなので mastered 候補にする」を明示する。
