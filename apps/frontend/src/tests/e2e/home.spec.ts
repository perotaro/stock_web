import { expect, test } from '@playwright/test'

test('公開トップが表示される', async ({ page }) => {
  await page.route('**/api/v1/public/summary', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        operating_days: 7,
        batch_runs_total: 1284,
        success_rate: 98.4,
        avg_duration_sec: 12.4,
        updated_at: '2026-04-10T00:00:00Z',
      }),
    })
  })

  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: '売買判断を、感覚ではなく戦略で。',
    }),
  ).toBeVisible()

  await expect(page.getByText('当月稼働日数', { exact: true })).toBeVisible()
  await expect(page.getByText('7日')).toBeVisible()
  await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'ログインして詳細を見る' }),
  ).toHaveCount(0)
})
