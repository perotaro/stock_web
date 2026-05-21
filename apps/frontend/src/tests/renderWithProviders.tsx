import type { ReactElement } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { createTestQueryClient } from '@/app/providers/queryClient'

type RenderWithProvidersOptions = {
  route?: string
  queryClient?: ReturnType<typeof createTestQueryClient>
}

/**
 * テスト用 Provider を付けて描画する。
 *
 * @param ui 描画対象の React 要素。
 * @param options ルートと QueryClient の上書き設定。
 * @returns QueryClient を含む描画結果。
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const { route = '/', queryClient = createTestQueryClient() } = options

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  }
}
