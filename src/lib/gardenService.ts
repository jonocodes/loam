import {
  createEmptyIndex,
  publishMeta,
  rebuildIndexFromPublishedMeta,
  removeIndexEntry,
  toAtomFeed,
  toIndexEntry,
  toJsonFeed,
  unpublishMeta,
  upsertIndexEntry,
  upsertMediaItem,
} from './gardenIndex'
import {
  deleteMediaFile,
  markdownExists,
  pullAllPostMeta,
  pullGardenSetting,
  pullIndex,
  pullMediaIndex,
  pullPostMarkdown,
  pullPostMeta,
  removePostMarkdown,
  removePostMeta,
  resolvePublicFeedAtomUrl,
  resolvePublicFeedUrl,
  resolvePublicIndexUrl,
  resolvePublicMediaUrl,
  resolvePublicPostUrl,
  storeFeed,
  storeFeedAtom,
  storeGardenSetting,
  storeIndex,
  storeMediaFile,
  storeMediaIndex,
  storePostMarkdown,
  storePostMeta,
} from './remotestorage'
import type { GardenIndex, GardenPostMeta, MediaIndex, MediaItem, PostTypeConfig } from './schema'
import { DEFAULT_POST_TYPES } from './schema'
import { buildDatedSlug, ensureUniqueSlug } from './slugs'

async function loadIndexOrCreate(): Promise<GardenIndex> {
  return (await pullIndex()) ?? createEmptyIndex()
}

export async function generateSlug(title: string, date = new Date()): Promise<string> {
  const allMeta = await pullAllPostMeta()
  const base = buildDatedSlug(title, date)
  return ensureUniqueSlug(
    base,
    allMeta.map((meta) => meta.slug),
  )
}

async function storeIndexAndFeed(nextIndex: GardenIndex): Promise<void> {
  await storeIndex(nextIndex)
  const [feedUrl, atomFeedUrl] = await Promise.all([resolvePublicFeedUrl(), resolvePublicFeedAtomUrl()])
  await Promise.all([
    storeFeed(toJsonFeed(nextIndex, feedUrl ?? undefined)),
    storeFeedAtom(toAtomFeed(nextIndex, atomFeedUrl ?? undefined)),
  ])
}

export async function syncPublishedPost(meta: GardenPostMeta, oldSlug?: string): Promise<void> {
  if (meta.status !== 'published') return

  const contentUrl = await resolvePublicPostUrl(meta.slug, meta.mediaType)
  if (!contentUrl) return

  const now = new Date().toISOString()
  const index = await loadIndexOrCreate()
  const withoutOld = oldSlug && oldSlug !== meta.slug ? removeIndexEntry(index, oldSlug, now) : index
  const upserted = upsertIndexEntry(withoutOld, toIndexEntry(meta, contentUrl), now)
  const nextIndex: GardenIndex =
    oldSlug && index.homeSlug === oldSlug ? { ...upserted, homeSlug: meta.slug } : upserted
  await storeIndexAndFeed(nextIndex)
}

export async function publishPost(slug: string): Promise<void> {
  const existingMeta = await pullPostMeta(slug)
  if (!existingMeta) {
    throw new Error(`Metadata not found for post ${slug}`)
  }

  const hasMarkdown = await markdownExists(slug, existingMeta.mediaType)
  if (!hasMarkdown) {
    throw new Error(`Content not found for post ${slug}`)
  }

  const nextMeta = publishMeta(existingMeta)
  await storePostMeta(nextMeta)

  const index = await loadIndexOrCreate()
  const contentUrl = await resolvePublicPostUrl(slug, existingMeta.mediaType)
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
  const removed = removeIndexEntry(index, slug)
  const nextIndex: GardenIndex = index.homeSlug === slug ? { ...removed, homeSlug: undefined } : removed
  await storeIndexAndFeed(nextIndex)
}

export async function deletePost(slug: string): Promise<void> {
  const meta = await pullPostMeta(slug)
  await removePostMarkdown(slug, meta?.mediaType)
  await removePostMeta(slug)

  const index = await loadIndexOrCreate()
  const removed = removeIndexEntry(index, slug)
  const nextIndex: GardenIndex = index.homeSlug === slug ? { ...removed, homeSlug: undefined } : removed
  await storeIndexAndFeed(nextIndex)
}

export async function rebuildIndex(): Promise<void> {
  const mediaIndex = await pullMediaIndex()
  if (mediaIndex && mediaIndex.items.length > 0) {
    const reResolved = await Promise.all(
      mediaIndex.items.map(async (item) => ({ item, newUrl: await resolvePublicMediaUrl(item.contentPath) })),
    )
    const changed = reResolved.filter(({ item, newUrl }) => newUrl !== null && newUrl !== item.resolvedUrl)
    if (changed.length > 0) {
      const replacements = new Map(changed.map(({ item, newUrl }) => [item.resolvedUrl, newUrl as string]))
      const allMetaForMedia = await pullAllPostMeta()
      await Promise.all(
        allMetaForMedia.map(async (meta) => {
          const content = await pullPostMarkdown(meta.slug, meta.mediaType)
          if (!content) return
          let rewritten = content
          for (const [oldUrl, newUrl] of replacements) rewritten = rewritten.split(oldUrl).join(newUrl)
          if (rewritten !== content) await storePostMarkdown(meta.slug, rewritten, meta.mediaType)
        }),
      )
      const updatedItems = mediaIndex.items.map((item) => {
        const newUrl = replacements.get(item.resolvedUrl)
        return newUrl ? { ...item, resolvedUrl: newUrl } : item
      })
      await storeMediaIndex({ ...mediaIndex, items: updatedItems })
    }
  }

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
      .map(async (meta) => ({
        meta,
        exists: await markdownExists(meta.slug, meta.mediaType),
        contentUrl: await resolvePublicPostUrl(meta.slug, meta.mediaType),
      })),
  )

  const existingPublished = publishedWithExistence.filter((item) => item.exists)
  if (existingPublished.length > 0 && existingPublished.every((item) => !item.contentUrl)) {
    throw new Error('Unable to resolve public URLs — check your storage connection and token scopes')
  }

  const validMeta = publishedWithExistence
    .filter((item) => item.exists && Boolean(item.contentUrl))
    .map((item) => item.meta)
  const contentUrlMap = new Map(publishedWithExistence.map((item) => [item.meta.slug, item.contentUrl ?? null]))

  const existingIndex = await pullIndex()
  const urlPrefix = existingIndex?.urlPrefix
  const urlEncoding = existingIndex?.urlEncoding
  const postTypes = existingIndex?.postTypes
  const homeSlug = existingIndex?.homeSlug
  const nextIndex = rebuildIndexFromPublishedMeta(
    validMeta,
    (slug) => contentUrlMap.get(slug) ?? null,
    title,
    tagline,
    urlPrefix,
    urlEncoding,
    postTypes,
    homeSlug,
  )
  await storeIndexAndFeed(nextIndex)

  const publicIndexUrl = await resolvePublicIndexUrl()
  if (publicIndexUrl) await storeGardenSetting('publicIndexUrl', publicIndexUrl)
}

function sanitizeFilename(name: string): string {
  const dotIdx = name.lastIndexOf('.')
  const base = dotIdx > 0 ? name.slice(0, dotIdx) : name
  const ext = dotIdx > 0 ? name.slice(dotIdx) : ''
  return base.replace(/[^a-zA-Z0-9._-]/g, '_') + ext
}

export async function uploadMedia(file: File): Promise<MediaItem> {
  const contentPath = `media/${sanitizeFilename(file.name)}`
  await storeMediaFile(contentPath, file.type, file)

  const resolvedUrl = await resolvePublicMediaUrl(contentPath)
  if (!resolvedUrl) throw new Error('Could not resolve public URL for uploaded media')

  const item: MediaItem = {
    filename: file.name,
    contentPath,
    resolvedUrl,
    uploadedAt: new Date().toISOString(),
    mimeType: file.type,
    size: file.size,
  }

  const existing = await pullMediaIndex()
  const base: MediaIndex = existing ?? { version: 1, items: [] }
  await storeMediaIndex(upsertMediaItem(base, item))

  return item
}

export async function rewritePostReferences(
  oldSlug: string,
  oldMediaType: string | undefined,
  newSlug: string,
  newMediaType: string | undefined,
): Promise<void> {
  const [oldUrl, newUrl] = await Promise.all([
    resolvePublicPostUrl(oldSlug, oldMediaType),
    resolvePublicPostUrl(newSlug, newMediaType),
  ])
  if (!oldUrl || !newUrl || oldUrl === newUrl) return

  const allMeta = await pullAllPostMeta()
  await Promise.all(
    allMeta.map(async (meta) => {
      const content = await pullPostMarkdown(meta.slug, meta.mediaType)
      if (!content || !content.includes(oldUrl)) return
      await storePostMarkdown(meta.slug, content.split(oldUrl).join(newUrl), meta.mediaType)
    }),
  )
}

export async function loadMediaIndex(): Promise<MediaIndex> {
  return (await pullMediaIndex()) ?? { version: 1 as const, items: [] }
}

export async function deleteMedia(contentPath: string): Promise<void> {
  await deleteMediaFile(contentPath)
  const existing = await pullMediaIndex()
  if (!existing) return
  await storeMediaIndex({ ...existing, items: existing.items.filter((i) => i.contentPath !== contentPath) })
}

const SEED_WELCOME_CONTENT = `Welcome to your garden.

This is a space to write and share what matters to you. Posts you publish appear on the index. Pages like this one are good for timeless content — an about page, a reading list, whatever you want visitors to find first.

---

*Edit or replace this page from the sidebar. Change the home page any time in Settings.*`

const SEED_FIRST_POST_CONTENT = `# My first post

This is a draft — nothing is visible publicly until you click **publish**.

Write anything here. Loam supports **bold**, *italic*, \`code\`, and [links](https://loam.dgt.is). Images can be uploaded from the media panel in the sidebar.`

export async function seedGarden(): Promise<boolean> {
  const alreadySeeded = await pullGardenSetting('seeded')
  if (alreadySeeded) return false

  const allMeta = await pullAllPostMeta()
  if (allMeta.length > 0) {
    await storeGardenSetting('seeded', 'true')
    return false
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const datePrefix = nowIso.slice(0, 10)

  const welcomeSlug = `${datePrefix}-welcome`
  const firstPostSlug = `${datePrefix}-my-first-post`

  const welcomeMeta: GardenPostMeta = {
    version: 1,
    slug: welcomeSlug,
    title: 'Welcome',
    excerpt: 'Welcome to your garden — a space to write and share what matters to you.',
    postType: 'pages',
    status: 'draft',
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
    deletedAt: null,
  }

  const firstPostMeta: GardenPostMeta = {
    version: 1,
    slug: firstPostSlug,
    title: 'My first post',
    excerpt: 'This is a draft — nothing is visible publicly until you click publish.',
    postType: 'posts',
    status: 'draft',
    createdAt: nowIso,
    updatedAt: nowIso,
    publishedAt: null,
    deletedAt: null,
  }

  await Promise.all([
    storePostMeta(welcomeMeta),
    storePostMarkdown(welcomeSlug, SEED_WELCOME_CONTENT, undefined),
    storePostMeta(firstPostMeta),
    storePostMarkdown(firstPostSlug, SEED_FIRST_POST_CONTENT, undefined),
  ])

  await saveSiteSettings('My Garden', '', '', 'e2', DEFAULT_POST_TYPES, welcomeSlug)
  await storeGardenSetting('seeded', 'true')

  return true
}

export async function saveSiteSettings(
  title: string,
  tagline: string,
  urlPrefix: string,
  urlEncoding: 'e1' | 'e2',
  postTypes: PostTypeConfig[],
  homeSlug?: string,
): Promise<void> {
  await Promise.all([storeGardenSetting('title', title), storeGardenSetting('tagline', tagline)])

  const index = await loadIndexOrCreate()
  const nextIndex: GardenIndex = {
    ...index,
    title,
    tagline: tagline || undefined,
    homeSlug: homeSlug || undefined,
    urlPrefix: urlPrefix || undefined,
    urlEncoding,
    postTypes,
    updatedAt: new Date().toISOString(),
  }
  await storeIndexAndFeed(nextIndex)
}
