import type { PropsWithChildren } from 'react'

type SectionCardProps = PropsWithChildren<{
  title: string
  description?: string
  className?: string
}>

/**
 * 汎用カードセクションを描画する。
 *
 * @param props タイトル、説明、子要素を含む props。
 * @returns 再利用可能なカードコンポーネント。
 */
export function SectionCard(props: SectionCardProps) {
  const { title, description, className = '', children } = props

  return (
    <section className={`page-panel ${className}`.trim()}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--color-ink)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}
