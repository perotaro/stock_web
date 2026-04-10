import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'

/**
 * ルーティング例外発生時の代替画面を描画する。
 *
 * @returns ルートエラー用の画面。
 */
export function RouteErrorPage() {
  const routeError = useRouteError()
  const errorMessage = isRouteErrorResponse(routeError)
    ? `${routeError.status} ${routeError.statusText}`
    : routeError instanceof Error
      ? routeError.message
      : '想定外のエラーが発生しました。'

  return (
    <div className="page-panel mx-auto mt-10 max-w-2xl">
      <p className="eyebrow">Route Error</p>
      <h1 className="mt-4 text-3xl font-semibold text-[color:var(--color-ink)]">
        画面の読み込みに失敗しました
      </h1>
      <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
        {errorMessage}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/" className="button-primary">
          公開トップへ戻る
        </Link>
        <Link to="/app" className="button-secondary">
          アプリ概要へ移動
        </Link>
      </div>
    </div>
  )
}
