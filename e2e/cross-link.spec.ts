import { test, expect, MOCK_TOKEN } from './fixtures'

test.describe('cross-linking between posts', () => {
  test('relative slug link in post body navigates via SPA', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await expect(page.getByText('This is my first post.')).toBeVisible()

    // Click the cross-link to the second post
    await page.getByRole('link', { name: 'second post' }).click()

    await expect(page.getByRole('heading', { name: 'Second Post' }).first()).toBeVisible()
    await expect(page.getByText('This is the second post.')).toBeVisible()
  })

  test('cross-link updates URL to linked post slug', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await page.getByRole('link', { name: 'second post' }).click()
    await expect(page).toHaveURL(/\/2026-04-25-second-post$/)
  })

  test('cross-link does not trigger full page reload', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)

    // Track navigation events — a SPA navigate won't fire a full load
    let fullReload = false
    page.on('load', () => { fullReload = true })

    await page.getByRole('link', { name: 'second post' }).click()
    await expect(page.getByRole('heading', { name: 'Second Post' }).first()).toBeVisible()

    expect(fullReload).toBe(false)
  })
})
