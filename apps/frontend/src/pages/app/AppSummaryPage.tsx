import { AppSectionNav } from '@/features/app-summary/components/AppSectionNav'

import { AppSummarySection } from '@/features/app-summary/components/AppSummarySection'

/**
 * 認証後トップのサマリ画面を描画する。
 *
 * @returns システム横断サマリのページ入口。
 */
export function AppSummaryPage() {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-[color:var(--color-ink)] md:text-[40px]">
            Summary
          </h1>
          <p className="max-w-2xl text-base leading-6 text-[color:var(--color-muted)]">
            システム横断の最新状況を確認
          </p>
        </header>
        <AppSectionNav currentSection="Summary" />
      </div>
      <AppSummarySection />
    </div>
  )
}
