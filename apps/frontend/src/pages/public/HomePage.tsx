import { Link } from 'react-router-dom'

import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { getClientEnv } from '@/lib/env/clientEnv'
import { formatJstDateTime } from '@/lib/utils/formatDate'

const publicSummaryCards = [
  {
    title: '匿名集計カード',
    value: '3 widgets',
    detail: '公開トップ用 API を接続するためのスロットを準備済みです。',
  },
  {
    title: '最終更新日時',
    value: formatJstDateTime('2026-04-08T00:30:00+09:00'),
    detail: 'JST 基準の表示ユーティリティを `lib/utils` に分離しました。',
  },
  {
    title: '認証導線',
    value: 'Ready',
    detail: '開発中はローカルバイパスで `/app` 導線を先に進められます。',
  },
] as const

/**
 * 公開トップの土台画面を描画する。
 *
 * @returns 開発環境の概要と次の実装ポイントを示すページ。
 */
export function HomePage() {
  const clientEnv = getClientEnv()

  return (
    <div className="space-y-6">
      <section className="hero-panel">
        <div className="max-w-3xl">
          <p className="eyebrow">Public Top</p>
          <h1 className="hero-title">
            運用中の小さな実システムとして見せるための、フロント開発基盤を作成しました。
          </h1>
          <p className="hero-copy">
            Vite、React Router、TanStack Query、Tailwind CSS、Vitest、Playwright
            を前提に、 `apps/frontend` を feature
            指向で育てられる状態にしています。
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <StatusPill label="vite workspace" tone="success" />
          <StatusPill label="tailwind ready" />
          <StatusPill label="dev auth bypass" tone="warning" />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/login" className="button-primary">
            ログイン導線を確認
          </Link>
          <Link to="/app" className="button-secondary">
            認証後ルートを確認
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="匿名公開サマリの配置先"
          description="公開トップの責務に沿って、匿名集計、更新日時、ログイン導線だけに絞った見せ方を先に固めています。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {publicSummaryCards.map((card) => (
              <article
                key={card.title}
                className="rounded-3xl border border-white/60 bg-white/75 p-5"
              >
                <p className="text-xs tracking-[0.2em] text-[color:var(--color-muted)] uppercase">
                  {card.title}
                </p>
                <p className="mt-4 text-2xl font-semibold text-[color:var(--color-ink)]">
                  {card.value}
                </p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
                  {card.detail}
                </p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="ランタイム設定"
          description="設計書で定義した公開設定値を `.env.local` で管理できます。"
        >
          <dl className="grid gap-4 text-sm">
            <div className="rounded-3xl border border-white/60 bg-white/75 p-4">
              <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
                API Base URL
              </dt>
              <dd className="mt-2 font-medium break-all text-[color:var(--color-ink)]">
                {clientEnv.apiBaseUrl}
              </dd>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/75 p-4">
              <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
                OIDC Authority
              </dt>
              <dd className="mt-2 font-medium break-all text-[color:var(--color-ink)]">
                {clientEnv.oidcAuthority}
              </dd>
            </div>
            <div className="rounded-3xl border border-white/60 bg-white/75 p-4">
              <dt className="text-xs tracking-[0.18em] text-[color:var(--color-muted)] uppercase">
                Dev Auth Bypass
              </dt>
              <dd className="mt-2 font-medium text-[color:var(--color-ink)]">
                {clientEnv.enableDevAuthBypass ? 'true' : 'false'}
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard
        title="次に実装する想定"
        description="設計書の実装順序を壊さず、次のステップに移りやすいように土台だけを先に揃えています。"
      >
        <ol className="grid gap-3 text-sm leading-7 text-[color:var(--color-muted)] md:grid-cols-2">
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            OIDC Provider を `react-oidc-context` に接続
          </li>
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            公開サマリ API と認証後 API を `apiRequest` に接続
          </li>
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            `features/*` へ画面固有ロジックを移動
          </li>
          <li className="rounded-3xl border border-white/60 bg-white/75 p-4">
            Playwright で `/` `/login` `/app` の導線を自動化
          </li>
        </ol>
      </SectionCard>
    </div>
  )
}
