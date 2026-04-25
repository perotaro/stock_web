import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GlobalHeader } from '@/components/navigation/GlobalHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { renderWithProviders } from '@/tests/renderWithProviders'

describe('GlobalHeader', () => {
  it('ブランド導線と指定されたヘッダーアクションを表示する', () => {
    renderWithProviders(
      <GlobalHeader
        actions={[
          { label: 'Summary', to: '/app', variant: 'nav', end: true },
          { label: 'Watchlist', to: '/app/watchlist', variant: 'nav' },
          { label: 'Docs', to: '/docs', variant: 'text' },
          { label: 'Login', to: '/login', variant: 'primary' },
        ]}
      />,
      { route: '/app' },
    )

    expect(screen.getByRole('link', { name: 'Guppy' })).toHaveAttribute(
      'href',
      '/',
    )

    const navigation = screen.getByRole('navigation', { name: 'Global' })
    const summaryLink = within(navigation).getByRole('link', {
      name: 'Summary',
    })
    const watchlistLink = within(navigation).getByRole('link', {
      name: 'Watchlist',
    })
    const docsLink = within(navigation).getByRole('link', { name: 'Docs' })
    const loginLink = within(navigation).getByRole('link', { name: 'Login' })

    expect(summaryLink).toHaveAttribute('href', '/app')
    expect(summaryLink).toHaveClass('global-header-nav-link--active')
    expect(watchlistLink).toHaveAttribute('href', '/app/watchlist')
    expect(watchlistLink).not.toHaveClass('global-header-nav-link--active')
    expect(docsLink).toHaveClass('global-header-text-link')
    expect(loginLink).toHaveClass('global-header-primary')
  })
})

describe('EmptyState', () => {
  it('空状態のタイトルと説明を表示する', () => {
    renderWithProviders(
      <EmptyState
        title="表示できるデータがありません"
        description="条件を変更して再度確認してください。"
      />,
    )

    expect(screen.getByText('表示できるデータがありません')).toBeVisible()
    expect(
      screen.getByText('条件を変更して再度確認してください。'),
    ).toBeVisible()
  })
})

describe('ErrorState', () => {
  it('エラーメッセージだけを alert として表示する', () => {
    renderWithProviders(<ErrorState message="読み込みに失敗しました。" />)

    const alert = screen.getByRole('alert')

    expect(within(alert).getByText('読み込みに失敗しました。')).toBeVisible()
    expect(within(alert).queryByRole('button')).not.toBeInTheDocument()
  })

  it('アクションが指定されたときにボタンを表示してクリックを通知する', () => {
    const handleRetry = vi.fn()

    renderWithProviders(
      <ErrorState
        message="通信に失敗しました。"
        actionLabel="再試行"
        onAction={handleRetry}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    expect(handleRetry).toHaveBeenCalledTimes(1)
  })
})

describe('LoadingState', () => {
  it('ローディングのタイトル、説明、子要素を status として表示する', () => {
    renderWithProviders(
      <LoadingState title="読み込み中です" description="少々お待ちください。">
        <span>進捗を確認しています</span>
      </LoadingState>,
    )

    const status = screen.getByRole('status')

    expect(within(status).getByText('読み込み中です')).toBeVisible()
    expect(within(status).getByText('少々お待ちください。')).toBeVisible()
    expect(within(status).getByText('進捗を確認しています')).toBeVisible()
  })

  it('説明がない場合はタイトルと子要素だけを表示する', () => {
    renderWithProviders(
      <LoadingState title="システム一覧を読み込んでいます…">
        <span>ロード中</span>
      </LoadingState>,
    )

    const status = screen.getByRole('status')

    expect(
      within(status).getByText('システム一覧を読み込んでいます…'),
    ).toBeVisible()
    expect(within(status).getByText('ロード中')).toBeVisible()
  })
})

describe('SectionCard', () => {
  it('見出し、説明、子要素、追加クラスを持つ section を表示する', () => {
    renderWithProviders(
      <SectionCard
        title="システム横断サマリ"
        description="最新の状態を確認します。"
        className="summary-panel"
      >
        <p>成功: 12件</p>
      </SectionCard>,
    )

    const heading = screen.getByRole('heading', {
      name: 'システム横断サマリ',
    })
    const section = heading.closest('section')

    expect(section).not.toBeNull()

    if (!section) {
      throw new Error('SectionCard の section が見つかりません。')
    }

    expect(section).toHaveClass('page-panel')
    expect(section).toHaveClass('summary-panel')
    expect(screen.getByText('最新の状態を確認します。')).toBeVisible()
    expect(screen.getByText('成功: 12件')).toBeVisible()
  })
})

describe('StatusPill', () => {
  it('tone 未指定時は info の見た目でラベルを表示する', () => {
    renderWithProviders(<StatusPill label="稼働中" />)

    const pill = screen.getByText('稼働中')

    expect(pill).toHaveClass('rounded-[4px]')
    expect(pill).toHaveClass('bg-[color:var(--color-info-surface)]')
    expect(pill).not.toHaveClass('rounded-full')
    expect(pill).not.toHaveClass('uppercase')
  })

  it('tone に応じた見た目でラベルを表示する', () => {
    renderWithProviders(<StatusPill label="警告" tone="warning" />)

    expect(screen.getByText('警告')).toHaveClass(
      'bg-[color:var(--color-warning-surface)]',
    )
  })
})
