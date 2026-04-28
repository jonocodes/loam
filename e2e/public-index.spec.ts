import { test, expect, MOCK_TOKEN } from './fixtures'

test.describe('public index page', () => {
  test('renders garden title and tagline', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByRole('heading', { name: 'Test Garden' })).toBeVisible()
    await expect(page.getByText('Notes from the test suite')).toBeVisible()
  })

  test('lists all published posts', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByRole('link', { name: 'Hello World' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Second Post' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'HTML Post' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Plain Post' })).toBeVisible()
  })

  test('shows post excerpts and dates', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByText('My first post.')).toBeVisible()
    await expect(page.getByText('2026-04-20')).toBeVisible()
  })

  test('has a Loam footer link', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByRole('link', { name: 'Loam' })).toBeVisible()
  })
})
