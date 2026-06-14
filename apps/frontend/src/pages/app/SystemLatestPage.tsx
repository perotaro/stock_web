import { useParams } from 'react-router-dom'

import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { StatusPill } from '@/components/ui/StatusPill'
import { AppSectionNav } from '@/features/app-summary/components/AppSectionNav'
import type { SystemLatestSignal } from '@/features/system-latest/api/fetchSystemLatest'
import { useSystemLatestQuery } from '@/features/system-latest/hooks/useSystemLatestQuery'
import { ApiClientError } from '@/lib/api/httpClient'
import { formatJstDateTimeWithZone } from '@/lib/utils/formatDate'

type SystemLatestHeaderProps = {
  systemCode: string
  systemName: string
  latestRunAt: string | null
}

type RunMetadataListProps = {
  latestRunId: string | null
  latestRunAt: string | null
  updatedAt: string
}

type SignalsGridProps = {
  signals: SystemLatestSignal[]
}

type SignalCardProps = {
  signal: SystemLatestSignal
}

/**
 * シグナルカードで表示する銘柄名を返す。
 *
 * @param signal API が返したシグナル情報。
 * @returns 銘柄名。未設定の場合はティッカー。
 */
function getSignalDisplayName(signal: SystemLatestSignal): string {
  return signal.name.trim() || signal.ticker
}

/**
 * 任意の日時を JST 表記へ変換する。
 *
 * @param value API が返す ISO 形式の日時。未実行時は null。
 * @returns 表示用の日時文字列。
 */
function formatOptionalDateTime(value: string | null): string {
  if (value === null) {
    return '未実行'
  }

  return formatJstDateTimeWithZone(value)
}

/**
 * 判定結果に応じた pill の tone を返す。
 *
 * @param decision API が返す判定結果。
 * @returns StatusPill に渡す tone。
 */
function getDecisionTone(decision: string): 'info' | 'success' | 'warning' {
  if (decision === 'BUY') {
    return 'success'
  }

  if (decision === 'NO_SIGNAL') {
    return 'info'
  }

  return 'warning'
}

/**
 * システム別最新結果の取得失敗時メッセージを返す。
 *
 * @param error 発生した例外。
 * @returns 利用者向けの簡潔な文言。
 */
function getSystemLatestErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError && error.status === 404) {
    return '対象システムが見つかりませんでした。'
  }

  if (error instanceof ApiClientError && error.code === 'response_invalid') {
    return 'システム別最新結果の形式が不正です。時間をおいて再試行してください。'
  }

  return 'システム別最新結果を読み込めませんでした。時間をおいて再試行してください。'
}

/**
 * ローディング中のシグナルカード骨格を描画する。
 *
 * @returns スケルトン風のシグナルカード群。
 */
function LoadingSignalsGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={`system-latest-skeleton-${index}`}
          className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)]"
        >
          <div className="h-5 w-20 rounded-[2px] bg-[color:var(--color-subtle-surface)]" />
          <div className="mt-5 h-6 w-40 rounded-[2px] bg-[color:var(--color-subtle-surface)]" />
          <div className="mt-3 h-4 w-16 rounded-[2px] bg-[color:var(--color-subtle-surface)]" />
          <div className="mt-5 h-4 w-full rounded-[2px] bg-[color:var(--color-subtle-surface)]" />
        </div>
      ))}
    </div>
  )
}

/**
 * システム別最新結果のページヘッダを描画する。
 *
 * @param props システム名、システムコード、最新実行日時。
 * @returns システム文脈を示すページヘッダ。
 */
function SystemLatestHeader(props: SystemLatestHeaderProps) {
  const { systemCode, systemName, latestRunAt } = props

  return (
    <header className="space-y-2">
      <h1 className="text-4xl leading-[1.15] font-bold tracking-tight text-[color:var(--color-ink)] md:text-[40px]">
        {systemName}
      </h1>
      <p className="max-w-2xl text-base leading-6 text-[color:var(--color-muted)]">
        {systemCode} / 最新実行 {formatOptionalDateTime(latestRunAt)}
      </p>
    </header>
  )
}

/**
 * 最新実行のメタ情報を描画する。
 *
 * @param props 最新実行 ID、最新実行日時、更新日時。
 * @returns 実行メタの定義リスト。
 */
function RunMetadataList(props: RunMetadataListProps) {
  const { latestRunId, latestRunAt, updatedAt } = props
  const metaItems = [
    { label: '最新実行 ID', value: latestRunId ?? '未実行' },
    { label: '最新実行日時', value: formatOptionalDateTime(latestRunAt) },
    { label: '更新日時', value: formatJstDateTimeWithZone(updatedAt) },
  ]

  return (
    <dl className="grid gap-4 md:grid-cols-3">
      {metaItems.map((item) => (
        <div
          key={item.label}
          className="rounded-[4px] border border-[color:var(--color-line)] bg-[color:var(--color-subtle-surface)] p-4"
        >
          <dt className="text-xs font-medium text-[color:var(--color-muted)]">
            {item.label}
          </dt>
          <dd className="mt-3 text-base font-semibold break-words text-[color:var(--color-ink)]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * シグナル一覧をグリッドで描画する。
 *
 * @param props API 返却順のシグナル一覧。
 * @returns シグナルカード群。
 */
function SignalsGrid(props: SignalsGridProps) {
  const { signals } = props

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {signals.map((signal) => (
        <SignalCard
          key={`${signal.priority_rank}-${signal.ticker}`}
          signal={signal}
        />
      ))}
    </div>
  )
}

/**
 * 1 件のシグナルカードを描画する。
 *
 * @param props シグナル情報。
 * @returns 判定、優先度、銘柄情報を含むカード。
 */
function SignalCard(props: SignalCardProps) {
  const { signal } = props
  const isBuySignal = signal.decision === 'BUY'
  const displayName = getSignalDisplayName(signal)

  return (
    <article
      aria-label={`${signal.priority_rank}. ${displayName}`}
      className={`rounded-[4px] border bg-[color:var(--color-surface)] p-5 shadow-[var(--shadow-soft)] ${
        isBuySignal
          ? 'border-[color:var(--color-accent)]'
          : 'border-[color:var(--color-line)]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <StatusPill
          label={signal.decision}
          tone={getDecisionTone(signal.decision)}
        />
        <p className="text-xs font-medium text-[color:var(--color-muted)]">
          優先度 {signal.priority_rank}
        </p>
      </div>

      <h3 className="mt-5 text-xl font-semibold tracking-tight text-[color:var(--color-ink)]">
        {displayName}
      </h3>
      <p className="mt-2 text-sm font-medium text-[color:var(--color-muted)]">
        {signal.ticker}
      </p>
      {signal.reason ? (
        <p className="mt-5 text-sm leading-6 text-[color:var(--color-muted)]">
          {signal.reason}
        </p>
      ) : null}
    </article>
  )
}

/**
 * システム別の最新結果画面を描画する。
 *
 * @returns 最新シグナル表示のページ。
 */
export function SystemLatestPage() {
  const params = useParams()
  const systemCode = params.system_code ?? ''
  const systemLatestQuery = useSystemLatestQuery(systemCode)
  const systemLatest = systemLatestQuery.data

  if (systemCode.length === 0) {
    return (
      <SectionCard
        title="システム別最新結果"
        description="最新 1 回分の実行結果を確認します。"
      >
        <ErrorState message="対象システムコードが指定されていません。" />
      </SectionCard>
    )
  }

  const errorMessage =
    systemLatestQuery.error !== null
      ? getSystemLatestErrorMessage(systemLatestQuery.error)
      : undefined

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <SystemLatestHeader
          systemCode={systemCode}
          systemName={systemLatest?.system_name ?? systemCode}
          latestRunAt={systemLatest?.latest_run_at ?? null}
        />
        <AppSectionNav />
      </div>

      {systemLatestQuery.isPending ? (
        <div className="space-y-12">
          <SectionCard
            title="実行メタ"
            description="最新 1 回分の実行 ID、実行日時、更新日時を確認します。"
          >
            <LoadingState title="実行メタを読み込んでいます…" />
          </SectionCard>

          <SectionCard
            title="シグナル一覧"
            description="優先度順に銘柄判定を確認します。"
          >
            <LoadingState title="シグナル一覧を読み込んでいます…">
              <LoadingSignalsGrid />
            </LoadingState>
          </SectionCard>
        </div>
      ) : null}

      {!systemLatestQuery.isPending && (!systemLatest || errorMessage) ? (
        <SectionCard
          title="システム別最新結果"
          description="最新 1 回分の実行結果を確認します。"
        >
          <ErrorState
            message={
              errorMessage ?? 'システム別最新結果を読み込めませんでした。'
            }
            actionLabel="再試行"
            onAction={() => {
              void systemLatestQuery.refetch()
            }}
          />
        </SectionCard>
      ) : null}

      {!systemLatestQuery.isPending && systemLatest && !errorMessage ? (
        <>
          <SectionCard
            title="実行メタ"
            description="最新 1 回分の実行 ID、実行日時、更新日時を確認します。"
          >
            <RunMetadataList
              latestRunId={systemLatest.latest_run_id}
              latestRunAt={systemLatest.latest_run_at}
              updatedAt={systemLatest.updated_at}
            />
          </SectionCard>

          <SectionCard
            title="シグナル一覧"
            description="優先度順に銘柄判定を確認します。"
          >
            {systemLatest.signals.length > 0 ? (
              <SignalsGrid signals={systemLatest.signals} />
            ) : (
              <EmptyState
                title="表示できるシグナルがありません"
                description="最新実行の銘柄判定はまだ登録されていません。"
              />
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
