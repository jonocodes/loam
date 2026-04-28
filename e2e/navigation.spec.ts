import { encodeIndexToken } from '../src/lib/indexToken'
import { expect, MOCK_BASE, MOCK_TOKEN, test } from './fixtures'

test.describe('browser history navigation', () => {
  test('navigating between posts does not refetch index.json', async ({ page }) => {
    let indexRequests = 0
    page.on('request', (request) => {
      if (request.url() === `${MOCK_BASE}/index.json`) indexRequests += 1
    })

    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page
      .getByRole('button', { name: /Hello World/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await page
      .locator('.stack-sidebar')
      .getByRole('button', { name: /Second Post/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Second Post' }).first()).toBeVisible()

    await expect.poll(() => indexRequests).toBe(1)
  })

  test('back button returns to index after navigating to post', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page
      .getByRole('button', { name: /Hello World/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible()
  })

  test('forward button restores post after going back', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    await page
      .getByRole('button', { name: /Hello World/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
  })

  test('direct navigation to post then home via breadcrumb', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-second-post`)
    await expect(page.getByRole('heading', { name: 'Second Post' }).first()).toBeVisible()
    await page.getByRole('button', { name: '~/Test Garden' }).click()
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Second Post' }).first()).toBeVisible()
  })
})

test.describe('tag filtering', () => {
  test('tag buttons appear for posts with tags', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    const tagButtons = page.locator('.stack-main').getByRole('button', { name: /#intro/ })
    await expect(tagButtons.first()).toBeVisible()
  })

  test('clicking tag button filters posts client-side', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}`)
    const tagButtons = page.locator('.stack-main').getByRole('button', { name: /#intro/ })
    await tagButtons.first().click()
    await expect(page.getByRole('heading', { name: '#intro' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Hello World/i }).first()).toBeVisible()
  })
})

test.describe('post not found', () => {
  test('shows error for non-existent post slug', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/this-post-does-not-exist`)
    await expect(page.getByText(/error/i)).toBeVisible()
  })
})

test.describe('markdown rendering', () => {
  test('renders inline code', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await expect(page.locator('.markdown-body code').first()).toBeVisible()
  })

  test('renders code blocks with pre element', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-second-post`)
    await expect(page.locator('.markdown-body pre').first()).toBeVisible()
  })

  test('renders blockquotes', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-second-post`)
    await expect(page.locator('.markdown-body blockquote').first()).toBeVisible()
  })
})

test.describe('URL encoding variants', () => {
  test('e2 token encodes index URL and decodes back correctly', async ({ page }) => {
    const token = encodeIndexToken(`${MOCK_BASE}/index.json`, 'e2')
    await page.goto(`/p/test/${token}`)
    await expect(page.locator('.stack-sidebar').getByText('Test Garden')).toBeVisible()
  })
})

test.describe('SPA fresh page load', () => {
  test('direct post URL loads correctly with history entry', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
    await page.getByRole('button', { name: '~/Test Garden' }).click()
    await expect(page.getByRole('heading', { name: 'All posts' })).toBeVisible()
    await page.goBack()
    await expect(page.getByRole('heading', { name: 'Hello World' }).first()).toBeVisible()
  })
})
