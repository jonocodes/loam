import { test, expect, MOCK_TOKEN } from './fixtures'

test.describe('public post page', () => {
  test('navigates to post on click and shows content', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page.getByRole('link', { name: 'Hello World' }).click()
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
    await expect(page.getByText('This is my first post.')).toBeVisible()
  })

  test('URL updates to post slug after navigation', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page.getByRole('link', { name: 'Hello World' }).click()
    await expect(page).toHaveURL(/\/2026-04-20-hello-world$/)
  })

  test('back link returns to index', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page.getByRole('heading', { name: 'Test Garden' })).toBeVisible()
  })

  test('loads post directly by URL without index navigation', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
    await expect(page.getByText('This is my first post.')).toBeVisible()
  })
})
