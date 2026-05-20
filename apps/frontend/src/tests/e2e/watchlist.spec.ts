import { expect, test } from '@playwright/test'

test('Watchlist で銘柄を表示し、フィルタ検索できる', async ({ page }) => {
  const requestedUrls: string[] = []

  await page.route('**/api/v1/watchlist**', async (route) => {
    const requestUrl = new URL(route.request().url())
    const tickerQuery = requestUrl.searchParams.get('q_ticker')

    requestedUrls.push(requestUrl.toString())

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items:
          tickerQuery === 'AAPL'
            ? [
                {
                  ticker: 'AAPL',
                  is_active: true,
                  category_code: 'MEGA_TECH',
                  systems: ['DMP'],
                  latest_decisions_by_system: {
                    DMP: 'BUY',
                  },
                  updated_at: '2026-04-10T06:31:00+09:00',
                },
              ]
            : [
                {
                  ticker: 'MSFT',
                  is_active: true,
                  category_code: 'MEGA_TECH',
                  systems: ['TGB'],
                  latest_decisions_by_system: {
                    TGB: 'NO_SIGNAL',
                  },
                  updated_at: '2026-04-10T06:20:00+09:00',
                },
              ],
        next_cursor: null,
      }),
    })
  })

  await page.goto('/app/watchlist')

  await expect(page.getByRole('heading', { name: 'Watchlist' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'フィルタ' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '結果一覧' })).toBeVisible()
  await expect(page.getByLabel('Ticker')).toHaveValue('')
  await expect(page.getByLabel('System Code')).toHaveValue('')
  await expect(page.getByLabel('Category Code')).toHaveValue('')
  await expect(page.getByLabel('Active')).toHaveValue('true')
  await expect(
    page.getByRole('row', { name: /MSFT active MEGA_TECH/ }),
  ).toBeVisible()

  await page.getByLabel('Ticker').fill('AAPL')
  await expect(page.getByText('フィルタ条件を反映予定')).toBeVisible()
  await page.getByRole('button', { name: '検索' }).click()

  await expect(page.getByText('フィルタを適用しました')).toBeVisible()
  await expect(page.getByText('Ticker: AAPL')).toBeVisible()
  await expect(
    page.getByRole('row', { name: /AAPL active MEGA_TECH/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('row', { name: /MSFT active MEGA_TECH/ }),
  ).toHaveCount(0)
  expect(
    requestedUrls.some((url) => {
      const requestUrl = new URL(url)

      return (
        requestUrl.searchParams.get('q_ticker') === 'AAPL' &&
        requestUrl.searchParams.get('is_active') === 'true' &&
        requestUrl.searchParams.get('sort') === 'updated_at_desc'
      )
    }),
  ).toBe(true)
})
