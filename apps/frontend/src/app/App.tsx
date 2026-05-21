import { AppProviders } from '@/app/providers/AppProviders'
import { AppRouterProvider } from '@/app/router/AppRouterProvider'

/**
 * アプリケーション全体の起動ルートを描画する。
 *
 * @returns Provider と Router を束ねたルートコンポーネント。
 */
export function App() {
  return (
    <AppProviders>
      <AppRouterProvider />
    </AppProviders>
  )
}
