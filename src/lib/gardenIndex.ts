import type { GardenIndex, GardenIndexEntry, GardenPostMeta, MediaIndex, MediaItem } from './schema'

export function createEmptyIndex(title = 'Loam', tagline?: string, now = new Date().toISOString()): GardenIndex {
  return {
    version: 1,
    title,
    ...(tagline !== undefined ? { tagline } : {}),
    updatedAt: now,
    posts: [],
  }
}

export function toIndexEntry(meta: GardenPostMeta, contentUrl: string): GardenIndexEntry {
  if (!meta.publishedAt) {
    throw new Error(`Post ${meta.slug} has no publishedAt timestamp`)
  }

  const date = meta.publishedAt.slice(0, 10)

  return {
    slug: meta.slug,
    date,
    title: meta.title,
    excerpt: meta.excerpt,
    ...(meta.tags !== undefined ? { tags: meta.tags } : {}),
    ...(meta.mediaType !== undefined ? { mediaType: meta.mediaType } : {}),
    ...(meta.postType !== undefined ? { postType: meta.postType } : {}),
    ...(meta.favorite ? { favorite: true } : {}),
    publishedAt: meta.publishedAt,
    updatedAt: meta.updatedAt,
    contentUrl,
  }
}

export function sortPostsDescendingByPublishedAt(posts: GardenIndexEntry[]): GardenIndexEntry[] {
  return [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}

export function upsertIndexEntry(
  index: GardenIndex,
  entry: GardenIndexEntry,
  now = new Date().toISOString(),
): GardenIndex {
  const filtered = index.posts.filter((post) => post.slug !== entry.slug)
  const posts = sortPostsDescendingByPublishedAt([...filtered, entry])

  return {
    ...index,
    updatedAt: now,
    posts,
  }
}

export function removeIndexEntry(index: GardenIndex, postSlug: string, now = new Date().toISOString()): GardenIndex {
  return {
    ...index,
    updatedAt: now,
    posts: index.posts.filter((post) => post.slug !== postSlug),
  }
}

export function publishMeta(meta: GardenPostMeta, now = new Date().toISOString()): GardenPostMeta {
  return {
    ...meta,
    status: 'published',
    publishedAt: meta.publishedAt ?? now,
    updatedAt: now,
    deletedAt: null,
  }
}

export function unpublishMeta(meta: GardenPostMeta, now = new Date().toISOString()): GardenPostMeta {
  return {
    ...meta,
    status: 'unpublished',
    updatedAt: now,
  }
}

export function markMetaDeleted(meta: GardenPostMeta, now = new Date().toISOString()): GardenPostMeta {
  return {
    ...meta,
    status: 'deleted',
    updatedAt: now,
    deletedAt: now,
  }
}

export function rebuildIndexFromPublishedMeta(
  metaRecords: GardenPostMeta[],
  contentUrlBySlug: (slug: string) => string | null,
  title = 'Loam',
  tagline?: string,
  urlPrefix?: string,
  urlEncoding?: 'e1' | 'e2',
  now = new Date().toISOString(),
): GardenIndex {
  const posts = metaRecords
    .filter((meta) => meta.status === 'published')
    .filter((meta) => Boolean(meta.publishedAt))
    .map((meta) => {
      const contentUrl = contentUrlBySlug(meta.slug)
      return contentUrl ? toIndexEntry(meta, contentUrl) : null
    })
    .filter((entry): entry is GardenIndexEntry => entry !== null)

  return {
    version: 1,
    title,
    ...(tagline !== undefined ? { tagline } : {}),
    ...(urlPrefix !== undefined ? { urlPrefix } : {}),
    ...(urlEncoding !== undefined ? { urlEncoding } : {}),
    updatedAt: now,
    posts: sortPostsDescendingByPublishedAt(posts),
  }
}

interface JsonFeedItem {
  id: string
  url: string
  title: string
  summary: string
  date_published: string
  date_modified: string
}

interface JsonFeedV1 {
  version: 'https://jsonfeed.org/version/1.1'
  title: string
  feed_url?: string
  items: JsonFeedItem[]
}

export function upsertMediaItem(index: MediaIndex, item: MediaItem): MediaIndex {
  const filtered = index.items.filter((i) => i.contentPath !== item.contentPath)
  return { ...index, items: [...filtered, item] }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function toAtomFeed(index: GardenIndex, feedUrl?: string): string {
  const entries = index.posts
    .map(
      (post) => `  <entry>
    <title>${escapeXml(post.title)}</title>
    <link href="${escapeXml(post.contentUrl)}" />
    <id>${escapeXml(post.contentUrl)}</id>
    <published>${post.publishedAt}</published>
    <updated>${post.updatedAt}</updated>
    <summary>${escapeXml(post.excerpt)}</summary>
  </entry>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(index.title)}</title>
  <updated>${index.updatedAt}</updated>
  <id>${feedUrl ?? ''}</id>${feedUrl ? `\n  <link rel="self" href="${escapeXml(feedUrl)}" />` : ''}
${entries}
</feed>`
}

export function toJsonFeed(index: GardenIndex, feedUrl?: string): JsonFeedV1 {
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: index.title,
    ...(feedUrl ? { feed_url: feedUrl } : {}),
    items: index.posts.map((post) => ({
      id: post.contentUrl,
      url: post.contentUrl,
      title: post.title,
      summary: post.excerpt,
      date_published: post.publishedAt,
      date_modified: post.updatedAt,
    })),
  }
}
