import { describe, expect, it } from 'vitest'
import { upsertMediaItem } from '../lib/gardenIndex'
import { MediaIndexSchema, MediaItemSchema } from '../lib/schema'
import type { MediaIndex, MediaItem } from '../lib/schema'

const baseItem: MediaItem = {
  filename: 'photo.jpg',
  contentPath: 'media/photo.jpg',
  resolvedUrl: 'https://example.com/public/loam/media/photo.jpg',
  uploadedAt: '2026-04-26T10:00:00Z',
  mimeType: 'image/jpeg',
  size: 12345,
}

const emptyIndex: MediaIndex = { version: 1, items: [] }

describe('MediaItemSchema', () => {
  it('parses a valid media item', () => {
    expect(() => MediaItemSchema.parse(baseItem)).not.toThrow()
  })

  it('allows size to be absent', () => {
    const { size: _, ...withoutSize } = baseItem
    expect(() => MediaItemSchema.parse(withoutSize)).not.toThrow()
  })

  it('rejects an item missing required fields', () => {
    expect(() => MediaItemSchema.parse({ filename: 'photo.jpg' })).toThrow()
  })
})

describe('MediaIndexSchema', () => {
  it('parses an empty index', () => {
    expect(() => MediaIndexSchema.parse(emptyIndex)).not.toThrow()
  })

  it('parses an index with items', () => {
    expect(() => MediaIndexSchema.parse({ version: 1, items: [baseItem] })).not.toThrow()
  })

  it('rejects wrong version', () => {
    expect(() => MediaIndexSchema.parse({ version: 2, items: [] })).toThrow()
  })
})

describe('upsertMediaItem', () => {
  it('adds a new item to an empty index', () => {
    const result = upsertMediaItem(emptyIndex, baseItem)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].filename).toBe('photo.jpg')
  })

  it('replaces an existing item with the same contentPath', () => {
    const withItem = upsertMediaItem(emptyIndex, baseItem)
    const updated: MediaItem = { ...baseItem, resolvedUrl: 'https://new.example.com/photo.jpg' }
    const result = upsertMediaItem(withItem, updated)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].resolvedUrl).toBe('https://new.example.com/photo.jpg')
  })

  it('keeps other items when inserting a new one', () => {
    const other: MediaItem = { ...baseItem, filename: 'banner.png', contentPath: 'media/banner.png' }
    const withFirst = upsertMediaItem(emptyIndex, baseItem)
    const withBoth = upsertMediaItem(withFirst, other)
    expect(withBoth.items).toHaveLength(2)
  })

  it('does not mutate the original index', () => {
    upsertMediaItem(emptyIndex, baseItem)
    expect(emptyIndex.items).toHaveLength(0)
  })
})
