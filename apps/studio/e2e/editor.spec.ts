import { expect, test } from '@playwright/test'
test('edits a demo page and preserves editor controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Functorz Studio')).toBeVisible()
  await page.getByRole('button', { name: /首页/ }).click()
  await page.getByRole('main').getByText('让灵感变成小程序').click()
  const content = page.getByLabel('内容')
  await content.fill('自动化验收标题')
  await expect(page.getByRole('main').getByText('自动化验收标题')).toBeVisible()
  await page.getByRole('button', { name: '撤销' }).click()
  await expect(page.getByRole('main').getByText('让灵感变成小程序')).toBeVisible()
})
