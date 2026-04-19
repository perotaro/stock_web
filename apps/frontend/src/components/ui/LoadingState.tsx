
import type { PropsWithChildren } from "react";


type LoadingStateProps = PropsWithChildren<{
    title: string,
    description?:string
}>

/**
 * 共通のローディング状態表示を描画する。
 * 
 * @param props タイトル、補足文、子要素を含むprops
 * @returns ロード画面の共通表示
 */

export function LoadingState(props: LoadingStateProps) {

    const { title, description, children } = props;

    return (
        <div role="status">
            <p className="text-sm font-semibold text-[color:var(--color-ink)]">{title}</p>
            {description ? <p  className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">{description}</p> :null }
            <div className="mt-4">{children}</div>
        </div>
    )
}