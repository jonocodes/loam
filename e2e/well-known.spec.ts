import { test, expect, MOCK_INDEX_URL } from './fixtures'

test.describe('well-known masked domain routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/.well-known/loam.json', (route) =>
      route.fulfill({ json: { indexUrl: MOCK_INDEX_URL } })
    )
  })

  test('root path shows public garden when well-known is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Test Garden' })).toBeVisible()
  })

  test('post links use /p/{slug} path format', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('link', { name: 'Hello World' })
    const href = await link.getAttribute('href')
    expect(href).toMatch(/\/p\/2026-04-20-hello-world$/)
  })

  test('navigating to /p/{slug} shows the post', async ({ page }) => {
    await page.goto('/p/2026-04-20-hello-world')
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible()
    await expect(page.getByText('This is my first post.')).toBeVisible()
  })

  test('back link from post returns to /', async ({ page }) => {
    await page.goto('/p/2026-04-20-hello-world')
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page.getByRole('heading', { name: 'Test Garden' })).toBeVisible()
    await expect(page).toHaveURL('/')
  })

  test('shows landing page when well-known is absent', async ({ page }) => {
    // Override the well-known route to 404
    await page.route('/.well-known/loam.json', (route) => route.fulfill({ status: 404 }))
    await page.goto('/')
    // Should not show the garden
    await expect(page.getByRole('heading', { name: 'Test Garden' })).not.toBeVisible()
  })
})
