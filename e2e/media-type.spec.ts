import { test, expect, MOCK_TOKEN } from './fixtures'

test.describe('media type rendering', () => {
  test('markdown post renders as formatted content', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    // Marked renders # heading as an <h1>
    await expect(page.locator('.markdown-body h1')).toBeVisible()
  })

  test('html post renders as HTML, not escaped text', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-html-post`)
    // The <strong> tag should be rendered, not shown as literal text
    await expect(page.locator('.markdown-body strong')).toBeVisible()
    await expect(page.locator('.markdown-body p.html-marker')).toBeVisible()
    await expect(page.getByText('<strong>')).not.toBeVisible()
  })

  test('plain text post renders inside a pre element', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-plain-post`)
    await expect(page.locator('pre')).toBeVisible()
    await expect(page.locator('pre')).toContainText('Plain Post')
  })

  test('html post inferred from .html extension when mediaType omitted', async ({ page }) => {
    // Serve an index entry with no mediaType but a .html contentUrl
    await page.route('http://mock.loam.test/index.json', (route) =>
      route.fulfill({
        json: {
          version: 1,
          title: 'Test',
          updatedAt: '2026-04-25T10:00:00Z',
          posts: [{
            slug: '2026-04-25-inferred-html',
            date: '2026-04-25',
            title: 'Inferred HTML',
            excerpt: 'No mediaType set.',
            publishedAt: '2026-04-25T10:00:00Z',
            updatedAt: '2026-04-25T10:00:00Z',
            contentUrl: 'http://mock.loam.test/posts/inferred.html',
          }],
        },
      })
    )
    await page.route('http://mock.loam.test/posts/inferred.html', (route) =>
      route.fulfill({
        body: '<p class="inferred-marker">Inferred <strong>HTML</strong></p>',
        contentType: 'text/html',
      })
    )

    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-inferred-html`)
    await expect(page.locator('p.inferred-marker strong')).toBeVisible()
    await expect(page.getByText('<strong>')).not.toBeVisible()
  })
})
