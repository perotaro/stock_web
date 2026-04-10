import { expect, test } from '@playwright/test'

test('公開トップが表示される', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', {
      name: '運用中の小さな実システムとして見せるための、フロント開発基盤を作成しました。',
    }),
  ).toBeVisible()
})
