type StatusPillTone = 'info' | 'success' | 'warning'

type StatusPillProps = {
  label: string
  tone?: StatusPillTone
}

const toneClassMap: Record<StatusPillTone, string> = {
  info: 'bg-[color:var(--color-info-surface)] text-[color:var(--color-info-text)]',
  success:
    'bg-[color:var(--color-success-surface)] text-[color:var(--color-success-text)]',
  warning:
    'bg-[color:var(--color-warning-surface)] text-[color:var(--color-warning-text)]',
}

/**
 * 画面内の簡易ステータスをバッジ表示する。
 *
 * @param props 表示文言と色味を含む props。
 * @returns ステータスバッジ。
 */
export function StatusPill(props: StatusPillProps) {
  const { label, tone = 'info' } = props

  return (
    <span
      className={`inline-flex rounded-[4px] px-3 py-1 text-xs leading-5 font-semibold ${toneClassMap[tone]}`}
    >
      {label}
    </span>
  )
}
