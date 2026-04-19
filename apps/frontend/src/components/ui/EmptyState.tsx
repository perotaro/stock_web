
type EmptyStateProps = {
    title: string,
    description:string
}

/**
 * 表示対象のデータが存在しない場合の共通表示を描画する。
 * 
 * @param props タイトルと説明を含むprops
 * @returns  空状態を案内する共通 UI。
 */
export function EmptyState(props:EmptyStateProps) {
    const { title, description } = props

    return (
        <div className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-subtle-surface)] px-5 py-4">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">{ title }</p>
            <div className=" mt-2 text-sm leading-7 text-[color:var(--color-muted)]">{ description }</div>
        </div>
    )
}