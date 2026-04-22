import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AuthGuard } from '@/app/guards/AuthGuard'
import { AppLayout } from '@/app/layouts/AppLayout'
import { PublicLayout } from '@/app/layouts/PublicLayout'
import { RouteErrorPage } from '@/app/router/RouteErrorPage'
import { AppSummaryPage } from '@/pages/app/AppSummaryPage'
import { SystemLatestPage } from '@/pages/app/SystemLatestPage'
import { WatchlistPage } from '@/pages/app/WatchlistPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { LogoutCallbackPage } from '@/pages/auth/LogoutCallbackPage'
import { HomePage } from '@/pages/public/HomePage'
import { LoginPage } from '@/pages/public/LoginPage'
import { LogoutPage } from '@/pages/public/LogoutPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'auth/callback',
        element: <AuthCallbackPage />,
      },
      {
        path: 'auth/logout/callback',
        element: <LogoutCallbackPage />,
      },
      {
        path: 'logout',
        element: <LogoutPage />,
      },
    ],
  },
  {
    path: '/app',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <AppSummaryPage />,
      },
      {
        path: 'systems/:system_code',
        element: <SystemLatestPage />,
      },
      {
        path: 'watchlist',
        element: <WatchlistPage />,
      },
    ],
  },
])

/**
 * Router Provider を描画する。
 *
 * @returns アプリ全体のルーター。
 */
export function AppRouterProvider() {
  return <RouterProvider router={router} />
}
