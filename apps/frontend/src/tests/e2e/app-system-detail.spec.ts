import { expect, test } from '@playwright/test'

test('認証後トップからシステム詳細へ遷移して最新結果が表示される', async ({
  page,
}) => {
  await page.route('**/api/v1/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        system_count: 1,
        latest_run_at: '2026-04-10T06:30:00+09:00',
        status_counts: {
          succeeded: 1,
          failed: 0,
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
        ],
      }),
    })
  })

  await page.route('**/api/v1/systems/DMP/latest', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        system_code: 'DMP',
        system_name: 'Dynamic Momentum Pullback',
        latest_run_id: 'run-20260410-063000',
        latest_run_at: '2026-04-10T06:30:00+09:00',
        updated_at: '2026-04-10T06:31:00+09:00',
        signals: [
          {
            priority_rank: 1,
            ticker: 'AAPL',
            name: 'Apple Inc.',
            decision: 'BUY',
            reason: '押し目反発条件を満たしました。',
            run_id: 'run-20260410-063000',
          },
        ],
      }),
    })
  })

  await page.goto('/app')
  await page.getByRole('link', { name: '詳細を見る' }).first().click()

  await expect(page).toHaveURL('/app/systems/DMP')
  await expect(
    page.getByRole('heading', { name: 'Dynamic Momentum Pullback' }),
  ).toBeVisible()
  await expect(page.getByText('DMP / 最新実行')).toBeVisible()
  await expect(page.getByRole('heading', { name: '実行メタ' })).toBeVisible()
  await expect(page.getByText('run-20260410-063000')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'シグナル一覧' }),
  ).toBeVisible()
  await expect(
    page.getByRole('article', { name: '1. Apple Inc.' }),
  ).toBeVisible()
  await expect(page.getByText('BUY')).toBeVisible()
  await expect(page.getByText('AAPL')).toBeVisible()
})
