type ErrorStateProps = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

/**
 * エラーメッセージ表示する
 *
 * @param props メッセージ、ラベル、クリック時動作を含むprops
 * @returns propsで与えられたエラーメッセージを返す
 */
export function ErrorState(props: ErrorStateProps) {
  const { message, actionLabel, onAction } = props

  if (!(actionLabel === undefined) && !(onAction === undefined)) {
    return (
      <div
        role="alert"
        className="rounded-[4px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
      >
        <p>{message}</p>
        <button
          type="button"
          onClick={onAction}
          className="button-secondary mt-3"
        >
          {actionLabel}
        </button>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="rounded-[4px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800"
    >
      <p>{message}</p>
    </div>
  )
}
