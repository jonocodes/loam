import { expect, MOCK_TOKEN, test } from './fixtures'

test.describe('public post page', () => {
  test('navigates to post on click and shows content', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page
      .getByRole('button', { name: /Hello World/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await expect(page.getByText('This is my first post.')).toBeVisible()
  })

  test('URL updates to post slug after navigation', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page
      .getByRole('button', { name: /Hello World/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/2026-04-20-hello-world$/)
  })

  test('back link returns to index via breadcrumb', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await page.getByRole('button', { name: '~/Test Garden' }).click()
    await expect(page.locator('.stack-sidebar').getByText('Test Garden')).toBeVisible()
  })

  test('loads post directly by URL without index navigation', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await expect(page.getByText('This is my first post.')).toBeVisible()
  })
})
