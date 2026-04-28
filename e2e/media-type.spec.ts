import { test, expect, MOCK_TOKEN } from './fixtures'

test.describe('media type rendering', () => {
  test('markdown post renders as formatted content', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-20-hello-world`)
    // Marked renders # heading as an <h1>
    await expect(page.locator('.markdown-body h1')).toBeVisible()
  })

  test('html post renders as HTML, not escaped text', async ({ page }) => {
    await page.goto(`/p/test/${MOCK_TOKEN}/2026-04-25-html-post`)
    await expect(page.locator('iframe[title="Post content"]')).toBeVisible()
    const iframe = page.locator('iframe[title="Post content"]').contentFrame()
    await expect(iframe.locator('h1')).toContainText('HTML Post')
    await expect(iframe.locator('p.html-marker')).toBeVisible()
    await expect(iframe.locator('strong')).toBeVisible()
    await expect(page.getByText('<strong>')).not.toBeVisible()
    await expect(iframe.locator('body')).toHaveCSS('background-color', 'rgb(14, 16, 20)')
    await expect(iframe.locator('body')).toHaveCSS('color', 'rgb(221, 226, 236)')
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
    await expect(page.locator('iframe[title="Post content"]')).toBeVisible()
    const iframe = page.locator('iframe[title="Post content"]').contentFrame()
    await expect(iframe.locator('p.inferred-marker')).toBeVisible()
    await expect(iframe.locator('p.inferred-marker strong')).toBeVisible()
    await expect(page.getByText('<strong>')).not.toBeVisible()
  })
})
