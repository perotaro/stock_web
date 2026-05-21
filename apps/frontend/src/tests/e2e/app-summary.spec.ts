import { expect, test } from '@playwright/test'

test('認証後トップでサマリとシステム一覧が表示される', async ({ page }) => {
  await page.route('**/api/v1/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        system_count: 2,
        latest_run_at: '2026-04-10T06:30:00+09:00',
        status_counts: {
          succeeded: 1,
          failed: 1,
          not_run: 0,
        },
        systems: [
          {
            system_code: 'DMP',
            system_name: 'Dynamic Momentum Pullback',
            latest_status: 'SUCCEEDED',
            latest_run_at: '2026-04-10T06:30:00+09:00',
            updated_at: '2026-04-10T06:31:00+09:00',
          },
          {
            system_code: 'TGB',
            system_name: 'Trend Guard Breakout',
            latest_status: 'FAILED',
            latest_run_at: '2026-04-10T06:20:00+09:00',
            updated_at: '2026-04-10T06:31:00+09:00',
          },
        ],
      }),
    })
  })

  await page.goto('/app')

  await expect(page.getByRole('heading', { name: 'Summary' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Logout' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Watchlist' })).toHaveAttribute(
    'href',
    '/app/watchlist',
  )

  await expect(
    page.getByRole('heading', { name: 'システム横断サマリ' }),
  ).toBeVisible()
  await expect(page.getByText('システム数')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Dynamic Momentum Pullback' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Trend Guard Breakout' }),
  ).toBeVisible()

  await expect(
    page.getByRole('link', { name: '詳細を見る' }).first(),
  ).toHaveAttribute('href', '/app/systems/DMP')
})
