import { describe, expect, it } from 'vitest'
import {
  createEmptyIndex,
  markMetaDeleted,
  publishMeta,
  rebuildIndexFromPublishedMeta,
  removeIndexEntry,
  sortPostsDescendingByPublishedAt,
  toAtomFeed,
  toIndexEntry,
  toJsonFeed,
  unpublishMeta,
  upsertIndexEntry,
} from '../lib/gardenIndex'
import type { GardenIndexEntry, GardenPostMeta } from '../lib/schema'

describe('sortPostsDescendingByPublishedAt', () => {
  const entry = (slug: string, publishedAt: string): GardenIndexEntry => ({
    slug,
    title: slug,
    excerpt: '',
    publishedAt,
    updatedAt: publishedAt,
    contentUrl: `https://example.com/${slug}.md`,
  })

  it('sorts posts newest first', () => {
    const sorted = sortPostsDescendingByPublishedAt([
      entry('old', '2026-01-01T00:00:00Z'),
      entry('new', '2026-04-01T00:00:00Z'),
      entry('mid', '2026-02-01T00:00:00Z'),
    ])
    expect(sorted.map((p) => p.slug)).toEqual(['new', 'mid', 'old'])
  })

  it('returns empty array unchanged', () => {
    expect(sortPostsDescendingByPublishedAt([])).toEqual([])
  })

  it('returns single-item array unchanged', () => {
    const result = sortPostsDescendingByPublishedAt([entry('only', '2026-01-01T00:00:00Z')])
    expect(result).toHaveLength(1)
  })

  it('does not mutate the original array', () => {
    const original = [
      entry('b', '2026-02-01T00:00:00Z'),
      entry('a', '2026-01-01T00:00:00Z'),
    ]
    sortPostsDescendingByPublishedAt(original)
    expect(original[0].slug).toBe('b')
  })
})

describe('garden index helpers', () => {
  const baseMeta: GardenPostMeta = {
    version: 1,
    slug: '2026-04-22-post-1',
    title: 'Post 1',
    excerpt: 'Excerpt 1',
    status: 'draft',
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-04-22T10:00:00Z',
    publishedAt: null,
    deletedAt: null,
  }

  it('publishes metadata with publishedAt defaulting to now', () => {
    const published = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    expect(published.status).toBe('published')
    expect(published.publishedAt).toBe('2026-04-22T12:00:00Z')
  })

  it('unpublishes metadata', () => {
    const published = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    const unpublished = unpublishMeta(published, '2026-04-22T13:00:00Z')
    expect(unpublished.status).toBe('unpublished')
    expect(unpublished.updatedAt).toBe('2026-04-22T13:00:00Z')
  })

  it('marks metadata as deleted', () => {
    const deleted = markMetaDeleted(baseMeta, '2026-04-22T14:00:00Z')
    expect(deleted.status).toBe('deleted')
    expect(deleted.deletedAt).toBe('2026-04-22T14:00:00Z')
  })

  it('upserts and removes index entries', () => {
    const index = createEmptyIndex('Blog', '2026-04-22T10:00:00Z')

    const withFirst = upsertIndexEntry(
      index,
      {
        slug: '2026-04-22-post-1',
        title: 'Post 1',
        excerpt: 'First',
        publishedAt: '2026-04-22T12:00:00Z',
        updatedAt: '2026-04-22T12:00:00Z',
        contentUrl: 'https://example.com/post-1.md',
      },
      '2026-04-22T12:01:00Z',
    )

    expect(withFirst.posts).toHaveLength(1)

    const removed = removeIndexEntry(withFirst, '2026-04-22-post-1', '2026-04-22T12:02:00Z')
    expect(removed.posts).toHaveLength(0)
  })

  it('exports JSON Feed 1.1 from index entries', () => {
    const index = createEmptyIndex('Blog', '2026-04-22T10:00:00Z')
    const withPost = upsertIndexEntry(index, {
      slug: '2026-04-22-post-1',
      title: 'Post 1',
      excerpt: 'First',
      publishedAt: '2026-04-22T12:00:00Z',
      updatedAt: '2026-04-22T12:00:00Z',
      contentUrl: 'https://example.com/post-1.md',
    })

    const feed = toJsonFeed(withPost, 'https://example.com/feed.json')
    expect(feed.version).toBe('https://jsonfeed.org/version/1.1')
    expect(feed.feed_url).toBe('https://example.com/feed.json')
    expect(feed.items[0].url).toBe('https://example.com/post-1.md')
    expect(feed.items[0].id).toBe('https://example.com/post-1.md')
  })

  it('propagates tags and mediaType into index entry', () => {
    const meta = publishMeta({ ...baseMeta, tags: ['a', 'b'], mediaType: 'text/html' }, '2026-04-22T12:00:00Z')
    const entry = toIndexEntry(meta, 'https://example.com/post.html')
    expect(entry.tags).toEqual(['a', 'b'])
    expect(entry.mediaType).toBe('text/html')
  })

  it('propagates postType and favorite into index entry', () => {
    const meta = publishMeta({ ...baseMeta, postType: 'pages', favorite: true }, '2026-04-22T12:00:00Z')
    const entry = toIndexEntry(meta, 'https://example.com/post.md')
    expect(entry.postType).toBe('pages')
    expect(entry.favorite).toBe(true)
  })

  it('omits postType and favorite from index entry when not set', () => {
    const meta = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    const entry = toIndexEntry(meta, 'https://example.com/post.md')
    expect(entry.postType).toBeUndefined()
    expect(entry.favorite).toBeUndefined()
  })

  it('generates Atom feed XML with correct structure', () => {
    const index = upsertIndexEntry(createEmptyIndex('My Blog'), {
      slug: '2026-04-26-hello',
      title: 'Hello World',
      excerpt: 'A greeting',
      publishedAt: '2026-04-26T10:00:00Z',
      updatedAt: '2026-04-26T11:00:00Z',
      contentUrl: 'https://example.com/hello.md',
    })
    const xml = toAtomFeed(index, 'https://example.com/feed.atom')
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">')
    expect(xml).toContain('<title>My Blog</title>')
    expect(xml).toContain('<link rel="self" href="https://example.com/feed.atom"')
    expect(xml).toContain('<title>Hello World</title>')
    expect(xml).toContain('<link href="https://example.com/hello.md"')
    expect(xml).toContain('<summary>A greeting</summary>')
  })

  it('escapes XML special characters in Atom feed', () => {
    const index = createEmptyIndex('A & B < C > D')
    const xml = toAtomFeed(index)
    expect(xml).toContain('A &amp; B &lt; C &gt; D')
  })

  it('omits self link when no feed URL is provided', () => {
    const index = createEmptyIndex('Blog')
    const xml = toAtomFeed(index)
    expect(xml).not.toContain('rel="self"')
  })

  it('omits tags and mediaType from index entry when not set', () => {
    const meta = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    const entry = toIndexEntry(meta, 'https://example.com/post.md')
    expect(entry.tags).toBeUndefined()
    expect(entry.mediaType).toBeUndefined()
  })

  it('preserves homeSlug through rebuild', () => {
    const published = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    const rebuilt = rebuildIndexFromPublishedMeta(
      [published],
      (slug) => `https://example.com/${slug}.md`,
      'Blog',
      undefined,
      undefined,
      undefined,
      undefined,
      '2026-04-22-post-1',
      '2026-04-22T15:00:00Z',
    )
    expect(rebuilt.homeSlug).toBe('2026-04-22-post-1')
  })

  it('omits homeSlug from rebuilt index when not provided', () => {
    const published = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    const rebuilt = rebuildIndexFromPublishedMeta(
      [published],
      (slug) => `https://example.com/${slug}.md`,
      'Blog',
    )
    expect(rebuilt.homeSlug).toBeUndefined()
  })

  it('toAtomFeed includes multiple entries in correct order', () => {
    const base = createEmptyIndex('Blog')
    const withTwo = upsertIndexEntry(
      upsertIndexEntry(base, {
        slug: 'older',
        title: 'Older',
        excerpt: 'Old',
        publishedAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        contentUrl: 'https://example.com/older.md',
      }),
      {
        slug: 'newer',
        title: 'Newer',
        excerpt: 'New',
        publishedAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z',
        contentUrl: 'https://example.com/newer.md',
      },
    )
    const xml = toAtomFeed(withTwo)
    const newerIdx = xml.indexOf('Newer')
    const olderIdx = xml.indexOf('Older')
    expect(newerIdx).toBeLessThan(olderIdx)
  })

  it('rebuilds index from published metadata only and checks content URL existence', () => {
    const publishedOne = publishMeta(baseMeta, '2026-04-22T12:00:00Z')
    const publishedTwo = publishMeta(
      {
        ...baseMeta,
        slug: '2026-04-22-post-2',
        title: 'Post 2',
        excerpt: 'Second',
      },
      '2026-04-22T11:00:00Z',
    )
    const draft = { ...baseMeta, slug: '2026-04-22-post-3', status: 'draft' as const }

    const rebuilt = rebuildIndexFromPublishedMeta(
      [publishedOne, publishedTwo, draft],
      (slug) => (slug === '2026-04-22-post-2' ? null : `https://example.com/${slug}.md`),
      'Blog',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      '2026-04-22T15:00:00Z',
    )

    expect(rebuilt.posts).toHaveLength(1)
    expect(rebuilt.posts[0].slug).toBe('2026-04-22-post-1')
    expect(rebuilt.posts[0].publishedAt).toBe('2026-04-22T12:00:00Z')
    expect(rebuilt.updatedAt).toBe('2026-04-22T15:00:00Z')
  })
})
