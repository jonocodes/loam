import { describe, expect, it } from 'vitest'
import {
  GardenIndexSchema,
  GardenPostMetaSchema,
  PostTypeConfigSchema,
} from '../lib/schema'

describe('GardenPostMetaSchema', () => {
  const base = {
    version: 1,
    slug: 'my-post',
    title: 'My Post',
    excerpt: 'An excerpt',
    status: 'draft',
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-04-22T10:00:00Z',
    publishedAt: null,
    deletedAt: null,
  }

  it('parses a valid post meta', () => {
    expect(() => GardenPostMetaSchema.parse(base)).not.toThrow()
  })

  it('maps legacy id field to slug', () => {
    const { slug: _, ...withoutSlug } = base
    const result = GardenPostMetaSchema.parse({ ...withoutSlug, id: 'legacy-id' })
    expect(result.slug).toBe('legacy-id')
  })

  it('prefers slug over id when both present', () => {
    const result = GardenPostMetaSchema.parse({ ...base, id: 'ignored-id' })
    expect(result.slug).toBe('my-post')
  })

  it('rejects unknown status values', () => {
    expect(() => GardenPostMetaSchema.parse({ ...base, status: 'archived' })).toThrow()
  })

  it('allows optional fields to be absent', () => {
    const result = GardenPostMetaSchema.parse(base)
    expect(result.tags).toBeUndefined()
    expect(result.mediaType).toBeUndefined()
    expect(result.postType).toBeUndefined()
    expect(result.favorite).toBeUndefined()
  })
})

describe('PostTypeConfigSchema', () => {
  it('parses with all fields', () => {
    const result = PostTypeConfigSchema.parse({
      name: 'posts',
      showInSidebar: true,
      isDefault: true,
      hideTitle: false,
    })
    expect(result.name).toBe('posts')
    expect(result.isDefault).toBe(true)
  })

  it('defaults showInSidebar to true', () => {
    const result = PostTypeConfigSchema.parse({ name: 'posts' })
    expect(result.showInSidebar).toBe(true)
  })

  it('defaults isDefault to false', () => {
    const result = PostTypeConfigSchema.parse({ name: 'posts' })
    expect(result.isDefault).toBe(false)
  })

  it('defaults hideTitle to false', () => {
    const result = PostTypeConfigSchema.parse({ name: 'posts' })
    expect(result.hideTitle).toBe(false)
  })
})

describe('GardenIndexSchema', () => {
  const base = {
    version: 1,
    title: 'My Garden',
    updatedAt: '2026-04-22T10:00:00Z',
    posts: [],
  }

  it('parses a minimal valid index', () => {
    expect(() => GardenIndexSchema.parse(base)).not.toThrow()
  })

  it('parses homeSlug when present', () => {
    const result = GardenIndexSchema.parse({ ...base, homeSlug: 'welcome-post' })
    expect(result.homeSlug).toBe('welcome-post')
  })

  it('homeSlug is absent when not provided', () => {
    const result = GardenIndexSchema.parse(base)
    expect(result.homeSlug).toBeUndefined()
  })

  it('parses postTypes with defaults applied', () => {
    const result = GardenIndexSchema.parse({
      ...base,
      postTypes: [{ name: 'posts' }],
    })
    expect(result.postTypes?.[0].showInSidebar).toBe(true)
    expect(result.postTypes?.[0].isDefault).toBe(false)
    expect(result.postTypes?.[0].hideTitle).toBe(false)
  })

  it('rejects wrong version', () => {
    expect(() => GardenIndexSchema.parse({ ...base, version: 2 })).toThrow()
  })

  it('rejects invalid urlEncoding value', () => {
    expect(() => GardenIndexSchema.parse({ ...base, urlEncoding: 'e3' })).toThrow()
  })
})
