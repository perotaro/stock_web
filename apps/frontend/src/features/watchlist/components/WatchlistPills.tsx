type ActivePillProps = {
  isActive: boolean
}

type CodePillProps = {
  label: string
}

type DecisionPillProps = {
  decision: string | null
}

/**
 * 判定結果に対応する CSS クラスを返す。
 *
 * @param decision 表示対象の判定文字列。
 * @returns 判定の tone を表す CSS クラス名。
 */
function getDecisionToneClassName(decision: string): string {
  if (decision === 'BUY') {
    return 'watchlist-decision-pill--success'
  }

  if (decision === 'NO_SIGNAL') {
    return 'watchlist-decision-pill--info'
  }

  return 'watchlist-decision-pill--warning'
}

/**
 * 判定結果を画面表示用ラベルへ変換する。
 *
 * @param decision API が返す判定結果。未判定の場合は null。
 * @returns 判定結果の表示ラベル。
 */
function formatDecisionLabel(decision: string | null): string {
  return decision ?? '未判定'
}

/**
 * active 状態を画面表示用ラベルへ変換する。
 *
 * @param isActive API が返す active 状態。
 * @returns active または inactive の表示ラベル。
 */
function formatActiveLabel(isActive: boolean): string {
  return isActive ? 'active' : 'inactive'
}

/**
 * システムコードの pill を描画する。
 *
 * @param props 表示するコード文字列を含む props。
 * @returns システムコード用の pill。
 */
export function CodePill(props: CodePillProps) {
  const { label } = props

  return <span className="watchlist-code-pill">{label}</span>
}

/**
 * 判定結果の pill を描画する。
 *
 * @param props 表示する判定文字列を含む props。
 * @returns 判定結果用の pill。
 */
export function DecisionPill(props: DecisionPillProps) {
  const { decision } = props
  const label = formatDecisionLabel(decision)

  return (
    <span
      className={`watchlist-decision-pill ${getDecisionToneClassName(label)}`}
    >
      {label}
    </span>
  )
}

/**
 * active 状態の pill を描画する。
 *
 * @param props active 状態を含む props。
 * @returns active 状態用の pill。
 */
export function ActivePill(props: ActivePillProps) {
  const { isActive } = props

  return (
    <span className="watchlist-active-pill">{formatActiveLabel(isActive)}</span>
  )
}
