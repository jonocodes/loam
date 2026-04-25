import {
  createEmptyIndex,
  markMetaDeleted,
  publishMeta,
  rebuildIndexFromPublishedMeta,
  removeIndexEntry,
  toIndexEntry,
  toJsonFeed,
  unpublishMeta,
  upsertIndexEntry,
} from './gardenIndex'
import { buildDatedSlug, ensureUniqueSlug } from './slugs'
import {
  markdownExists,
  pullAllPostMeta,
  pullGardenSetting,
  pullIndex,
  pullPostMeta,
  removePostMarkdown,
  removePostMeta,
  resolvePublicFeedUrl,
  resolvePublicIndexUrl,
  resolvePublicPostUrl,
  storeGardenSetting,
  storeFeed,
  storeIndex,
  storePostMeta,
} from './remotestorage'
import type { GardenIndex } from './schema'


async function loadIndexOrCreate(): Promise<GardenIndex> {
  return (await pullIndex()) ?? createEmptyIndex()
}

export async function generateSlug(title: string, date = new Date()): Promise<string> {
  const allMeta = await pullAllPostMeta()
  const base = buildDatedSlug(title, date)
  return ensureUniqueSlug(base, allMeta.map((meta) => meta.slug))
}

async function storeIndexAndFeed(nextIndex: GardenIndex): Promise<void> {
  await storeIndex(nextIndex)
  const feedUrl = await resolvePublicFeedUrl()
  await storeFeed(toJsonFeed(nextIndex, feedUrl ?? undefined))
}

export async function publishPost(slug: string): Promise<void> {
  const existingMeta = await pullPostMeta(slug)
  if (!existingMeta) {
    throw new Error(`Metadata not found for post ${slug}`)
  }

  const hasMarkdown = await markdownExists(slug)
  if (!hasMarkdown) {
    throw new Error(`Markdown not found for post ${slug}`)
  }

  const nextMeta = publishMeta(existingMeta)
  await storePostMeta(nextMeta)

  const index = await loadIndexOrCreate()
  const contentUrl = await resolvePublicPostUrl(slug)
  if (!contentUrl) {
    throw new Error('Unable to generate public content URL for this backend')
  }

  const nextIndex = upsertIndexEntry(index, toIndexEntry(nextMeta, contentUrl))
  await storeIndexAndFeed(nextIndex)

  const publicIndexUrl = await resolvePublicIndexUrl()
  if (publicIndexUrl) await storeGardenSetting('publicIndexUrl', publicIndexUrl)
}

export async function unpublishPost(slug: string): Promise<void> {
  const existingMeta = await pullPostMeta(slug)
  if (!existingMeta) {
    throw new Error(`Metadata not found for post ${slug}`)
  }

  const nextMeta = unpublishMeta(existingMeta)
  await storePostMeta(nextMeta)

  const index = await loadIndexOrCreate()
  const nextIndex = removeIndexEntry(index, slug)
  await storeIndexAndFeed(nextIndex)
}

export async function deletePost(slug: string): Promise<void> {
  const existingMeta = await pullPostMeta(slug)
  if (existingMeta) {
    const deletedMeta = markMetaDeleted(existingMeta)
    await storePostMeta(deletedMeta)
  }

  await removePostMarkdown(slug)
  await removePostMeta(slug)

  const index = await loadIndexOrCreate()
  const nextIndex = removeIndexEntry(index, slug)
  await storeIndexAndFeed(nextIndex)
}

export async function rebuildIndex(): Promise<void> {
  const [settingsTitle, settingsTagline, allMeta] = await Promise.all([
    pullGardenSetting('title'),
    pullGardenSetting('tagline'),
    pullAllPostMeta(),
  ])
  const title = settingsTitle ?? 'Loam'
  const tagline = settingsTagline ?? undefined

  const publishedWithExistence = await Promise.all(
    allMeta
      .filter((meta) => meta.status === 'published' && Boolean(meta.publishedAt))
      .map(async (meta) => ({ meta, exists: await markdownExists(meta.slug), contentUrl: await resolvePublicPostUrl(meta.slug) })),
  )

  const validMeta = publishedWithExistence.filter((item) => item.exists && Boolean(item.contentUrl)).map((item) => item.meta)
  const contentUrlMap = new Map(publishedWithExistence.map((item) => [item.meta.slug, item.contentUrl ?? null]))

  const existingIndex = await pullIndex()
  const urlPrefix = existingIndex?.urlPrefix
  const urlEncoding = existingIndex?.urlEncoding
  const nextIndex = rebuildIndexFromPublishedMeta(validMeta, (slug) => contentUrlMap.get(slug) ?? null, title, tagline, urlPrefix, urlEncoding)
  await storeIndexAndFeed(nextIndex)

  const publicIndexUrl = await resolvePublicIndexUrl()
  if (publicIndexUrl) await storeGardenSetting('publicIndexUrl', publicIndexUrl)
}

export async function saveSiteSettings(title: string, tagline: string, urlPrefix: string, urlEncoding: 'e1' | 'e2'): Promise<void> {
  await Promise.all([
    storeGardenSetting('title', title),
    storeGardenSetting('tagline', tagline),
  ])

  const index = await loadIndexOrCreate()
  const nextIndex: GardenIndex = {
    ...index,
    title,
    tagline: tagline || undefined,
    urlPrefix: urlPrefix || undefined,
    urlEncoding,
    updatedAt: new Date().toISOString(),
  }
  await storeIndexAndFeed(nextIndex)
}
