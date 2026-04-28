import { test as base, expect } from '@playwright/test'
import { encodeIndexToken } from '../src/lib/indexToken'

export { expect }

const MOCK_BASE = 'http://mock.loam.test'
export const MOCK_INDEX_URL = `${MOCK_BASE}/index.json`
export { MOCK_BASE }
export const MOCK_TOKEN = encodeIndexToken(MOCK_INDEX_URL)

export const testIndex = {
  version: 1,
  title: 'Test Garden',
  tagline: 'Notes from the test suite',
  urlPrefix: 'test',
  urlEncoding: 'e2' as const,
  updatedAt: '2026-04-25T10:00:00Z',
  posts: [
    {
      slug: '2026-04-20-hello-world',
      title: 'Hello World',
      excerpt: 'My first post.',
      tags: ['intro'],
      favorite: true,
      publishedAt: '2026-04-20T09:00:00Z',
      updatedAt: '2026-04-20T09:00:00Z',
      contentUrl: `${MOCK_BASE}/posts/2026-04-20-hello-world.md`,
    },
    {
      slug: '2026-04-25-second-post',
      title: 'Second Post',
      excerpt: 'The second post with a cross-link.',
      tags: ['meta'],
      publishedAt: '2026-04-25T10:00:00Z',
      updatedAt: '2026-04-25T10:00:00Z',
      contentUrl: `${MOCK_BASE}/posts/2026-04-25-second-post.md`,
    },
    {
      slug: '2026-04-25-html-post',
      title: 'HTML Post',
      excerpt: 'A post in HTML.',
      tags: ['web'],
      mediaType: 'text/html',
      publishedAt: '2026-04-25T11:00:00Z',
      updatedAt: '2026-04-25T11:00:00Z',
      contentUrl: `${MOCK_BASE}/posts/2026-04-25-html-post.html`,
    },
    {
      slug: '2026-04-25-plain-post',
      title: 'Plain Post',
      excerpt: 'A post in plain text.',
      mediaType: 'text/plain',
      publishedAt: '2026-04-25T12:00:00Z',
      updatedAt: '2026-04-25T12:00:00Z',
      contentUrl: `${MOCK_BASE}/posts/2026-04-25-plain-post.txt`,
    },
  ],
}

const postContent: Record<string, { body: string; contentType: string }> = {
  '2026-04-20-hello-world.md': {
    body: '# Hello World\n\nThis is my first post.\n\nSee also [second post](2026-04-25-second-post).\n\nInline `code` here.',
    contentType: 'text/markdown',
  },
  '2026-04-25-second-post.md': {
    body: '# Second Post\n\n> This is a blockquote\n\nThis is the second post.\n\n```js\nconst x = 42;\n```',
    contentType: 'text/markdown',
  },
  '2026-04-25-html-post.html': {
    body: '<h1>HTML Post</h1><p class="html-marker">This is <strong>bold</strong> HTML content.</p>',
    contentType: 'text/html',
  },
  '2026-04-25-plain-post.txt': {
    body: 'Plain Post\n\nThis is plain text content.',
    contentType: 'text/plain',
  },
}

type Fixtures = {
  mockFetch: undefined
}

export const test = base.extend<Fixtures>({
  mockFetch: [
    async ({ page }, use) => {
      await page.route(`${MOCK_BASE}/**`, async (route) => {
        const url = new URL(route.request().url())

        if (url.pathname === '/index.json') {
          await route.fulfill({ json: testIndex })
          return
        }

        const filename = url.pathname.split('/').pop() ?? ''
        const post = postContent[filename]
        if (post) {
          await route.fulfill({ body: post.body, contentType: post.contentType })
          return
        }

        await route.fulfill({ status: 404, body: 'Not found' })
      })
      await use()
    },
    { auto: true },
  ],
})
