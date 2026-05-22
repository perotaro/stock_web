import { expect, test, type Page } from '@playwright/test'

/**
 * 認証後サマリ API の正常レスポンスをモックする。
 *
 * @param page Playwright のページインスタンス。
 * @returns モック設定の完了を表す Promise。
 */
async function mockAppSummaryApi(page: Page) {
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
}

test('認証後トップでサマリとシステム一覧が表示される', async ({ page }) => {
  await mockAppSummaryApi(page)

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

test('中間幅でもシステム一覧の最新実行列と導線列が表示領域に収まる', async ({
  page,
}) => {
  await mockAppSummaryApi(page)

  for (const width of [1110, 970]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/app')

    const latestRun = page.getByText('最新実行 2026/04/10 6:30').first()
    const detailLink = page.getByRole('link', { name: '詳細を見る' }).first()

    await latestRun.scrollIntoViewIfNeeded()
    await expect(latestRun).toBeVisible()
    await expect(detailLink).toBeVisible()
    await expect(latestRun).toBeInViewport({ ratio: 1 })
    await expect(detailLink).toBeInViewport({ ratio: 1 })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width)
  }
})
