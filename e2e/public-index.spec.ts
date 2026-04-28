import { test, expect, MOCK_BASE, MOCK_TOKEN, testIndex } from './fixtures'

test.describe('public index page', () => {
  test('redirects home to welcome post when one exists', async ({ page }) => {
    const welcomeSlug = '2026-04-26-welcome'
    await page.route(`${MOCK_BASE}/index.json`, async (route) => {
      await route.fulfill({
        json: {
          ...testIndex,
          posts: [
            {
              slug: welcomeSlug,
              title: 'Welcome to Test Garden',
              excerpt: 'Start here.',
              postType: 'welcome',
              publishedAt: '2026-04-26T10:00:00Z',
              updatedAt: '2026-04-26T10:00:00Z',
              contentUrl: `${MOCK_BASE}/posts/${welcomeSlug}.md`,
            },
            ...testIndex.posts,
          ],
        },
      })
    })
    await page.route(`${MOCK_BASE}/posts/${welcomeSlug}.md`, async (route) => {
      await route.fulfill({
        body: '# Welcome to Test Garden\n\nStart here.',
        contentType: 'text/markdown',
      })
    })

    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page).toHaveURL(new RegExp(`/p/test/${MOCK_TOKEN}/${welcomeSlug}$`))
    await expect(page.getByRole('heading', { name: 'Welcome to Test Garden' }).first()).toBeVisible()
    await expect(page.locator('.stack-sidebar').getByRole('button', { name: /Welcome to Test Garden/ })).toBeVisible()
    await expect(page.locator('.stack-sidebar').getByText('welcome', { exact: true })).not.toBeVisible()
  })

  test('renders garden title in sidebar and all posts heading', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.locator('.stack-sidebar').getByText('Test Garden')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible()
  })

  test('lists all published posts as buttons', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByRole('button', { name: /Hello World/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Second Post/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /HTML Post/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Plain Post/i }).first()).toBeVisible()
  })

  test('shows post excerpts and dates', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByText('My first post.').first()).toBeVisible()
    await expect(page.getByText('Apr 20, 2026')).toBeVisible()
  })

  test('has a Loam footer link', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await expect(page.getByRole('link', { name: 'loam' })).toBeVisible()
  })
})
