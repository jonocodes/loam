import { test, expect, MOCK_INDEX_URL, MOCK_TOKEN } from './fixtures'

test.describe('well-known masked domain routing', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/.well-known/loam.json', (route) =>
      route.fulfill({ json: { indexUrl: MOCK_INDEX_URL } })
    )
  })

  test('root path shows public garden when well-known is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.stack-sidebar').getByText('Test Garden')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible()
  })

  test('post links use /p/{slug} path format', async ({ page }) => {
    await page.goto('/')
    const link = page.getByRole('button', { name: /Hello World/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/2026-04-20-hello-world$/)
  })

  test('navigating to /p/{slug} shows the post', async ({ page }) => {
    await page.goto('/p/2026-04-20-hello-world')
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await expect(page.getByText('This is my first post.')).toBeVisible()
  })

  test('back link from post returns to /', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await page.getByRole('button', { name: '~/Test Garden' }).click()
    await expect(page.locator('.stack-sidebar').getByText('Test Garden')).toBeVisible()
    await expect(page).toHaveURL(/\/p\/test\//)
  })

  test('shows landing page when well-known is absent', async ({ page }) => {
    await page.route('**/.well-known/loam.json', (route) => route.fulfill({ status: 404 }))
    await page.goto('/')
    await expect(page.locator('.stack-sidebar').getByText('Test Garden')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Loam' })).toBeVisible()
  })
})