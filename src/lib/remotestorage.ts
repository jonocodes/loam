import RemoteStorage from 'remotestoragejs'
import { mediaTypeToExt } from './mediaType'
import type { GardenIndex, GardenPostMeta, MediaIndex } from './schema'
import { GardenIndexSchema, GardenPostMetaSchema, MediaIndexSchema } from './schema'

export { inferMediaType, mediaTypeToExt } from './mediaType'

export const rs = new RemoteStorage({ logging: true })

const dropboxAppKey = import.meta.env.VITE_DROPBOX_APP_KEY
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
if (dropboxAppKey || googleClientId) {
  rs.setApiKeys({
    ...(dropboxAppKey ? { dropbox: dropboxAppKey } : {}),
    ...(googleClientId ? { googledrive: googleClientId } : {}),
  })
}

const RS_MODULE = import.meta.env.VITE_RS_MODULE ?? 'loam'
const PUBLIC_DIR = import.meta.env.VITE_PUBLIC_DIR ?? RS_MODULE

rs.access.claim(RS_MODULE, 'rw')
rs.caching.enable(`/${RS_MODULE}/`)
rs.caching.enable(`/public/${PUBLIC_DIR}/`)
rs.setSyncInterval(2000)

function privateClient() {
  return rs.scope(`/${RS_MODULE}/`)
}

function publicClient() {
  return rs.scope(`/public/${PUBLIC_DIR}/`)
}

function scopedItemUrl(client: { getItemURL(path: string): unknown }, path: string): string | null {
  try {
    const url = client.getItemURL(path)
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}

function itemUrl(path: string): string | null {
  return scopedItemUrl(publicClient(), path)
}

const POSTS_PATH = 'posts/'
const META_PATH = 'meta/'

function mediaTypeToMime(mediaType?: string): string {
  return mediaType ?? 'text/markdown'
}
const INDEX_PATH = 'index.json'
const FEED_PATH = 'feed.json'
const FEED_ATOM_PATH = 'feed.atom'
const MEDIA_PATH = 'media/'
const MEDIA_INDEX_PATH = 'media-index.json'
const SETTINGS_PATH = 'settings/garden.json'

export function connectRemoteStorage(userAddress: string): void {
  rs.connect(userAddress)
}

export function disconnectRemoteStorage(): void {
  rs.disconnect()
}

export function isConnected(): boolean {
  return rs.connected
}

export function onConnected(cb: () => void): void {
  rs.on('connected', cb)
}

export function onDisconnected(cb: () => void): void {
  rs.on('disconnected', cb)
}

export function clearCloudSharingCache(): void {
  gdPublicFolderId = null
}

export function getActiveBackend(): string {
  return (rs as unknown as { backend?: string }).backend ?? 'remotestorage'
}

export async function checkDropboxSharingAccess(): Promise<string | null> {
  if (getActiveBackend() !== 'dropbox') return null
  const token = getRemoteToken()
  if (!token) return 'Dropbox connected, but no auth token is available. Try disconnecting and reconnecting.'

  const res = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: `/public/${PUBLIC_DIR}/`, direct_only: true }),
  })
  if (res.ok) return null

  let summary = ''
  try {
    const body = (await res.json()) as { error_summary?: string }
    if (typeof body.error_summary === 'string') summary = ` (${body.error_summary})`
  } catch {
    // Ignore parse failures and keep a status-based warning.
  }
  if (res.status === 401 || res.status === 403) {
    return `Dropbox sharing is unavailable (${res.status}${summary}). Add sharing.read and sharing.write in your Dropbox app, then disconnect and reconnect to refresh the token scopes.`
  }
  return `Dropbox sharing check failed (${res.status}${summary}). Public links may not work until this is resolved.`
}

async function createDropboxSharedLink(dropboxPath: string, token: string): Promise<string> {
  async function listExistingLink(): Promise<string | null> {
    const lookup = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: dropboxPath, direct_only: true }),
    })
    if (!lookup.ok) return null
    const links = (await lookup.json()) as { links?: Array<{ url?: string }> }
    const existingUrl = links.links?.[0]?.url
    return typeof existingUrl === 'string' ? dropboxToDirectUrl(existingUrl) : null
  }

  const res = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: dropboxPath, settings: { requested_visibility: 'public' } }),
  })

  if (res.status === 409) {
    const body = (await res.json()) as {
      error?: { '.tag': string; shared_link_already_exists?: { metadata: { url: string } } }
      error_summary?: string
    }
    const existing = body.error?.shared_link_already_exists?.metadata.url
    if (existing) return dropboxToDirectUrl(existing)
    const fallback = await listExistingLink()
    if (fallback) return fallback
    const summary = typeof body.error_summary === 'string' ? ` (${body.error_summary})` : ''
    throw new Error(`Dropbox sharing API conflict: unable to reuse existing link${summary}`)
  }

  if (!res.ok) {
    let summary = ''
    try {
      const body = (await res.json()) as { error_summary?: string }
      if (typeof body.error_summary === 'string') summary = ` (${body.error_summary})`
    } catch {
      // Ignore parse failures and keep a status-based error message.
    }
    if (res.status === 401) {
      throw new Error(
        'Dropbox sharing API error: 401. Your Dropbox token likely lacks sharing scopes. Add sharing.read and sharing.write in the Dropbox app settings, then disconnect and reconnect Dropbox.',
      )
    }
    throw new Error(`Dropbox sharing API error: ${res.status}${summary}`)
  }
  const data = (await res.json()) as { url: string }
  return dropboxToDirectUrl(data.url)
}

function dropboxToDirectUrl(url: string): string {
  return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=0$/, '')
}

async function googleDriveListFiles(query: string, token: string): Promise<{ id: string }[]> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) return []
  const data = (await res.json()) as { files?: { id: string }[] }
  return data.files ?? []
}

async function googleDriveFindChild(
  name: string,
  parentId: string,
  isFolder: boolean,
  token: string,
): Promise<string | null> {
  const mimeFilter = isFolder ? " and mimeType='application/vnd.google-apps.folder'" : ''
  const query = `name='${name}' and '${parentId}' in parents and trashed=false${mimeFilter}`
  const files = await googleDriveListFiles(query, token)
  return files[0]?.id ?? null
}

let gdPublicFolderId: string | null = null

async function ensureGoogleDrivePublicFolder(token: string): Promise<string | null> {
  if (gdPublicFolderId) return gdPublicFolderId

  // Traverse root → public → PUBLIC_DIR to find the shared folder
  let parentId = 'root'
  for (const segment of ['public', PUBLIC_DIR]) {
    const id = await googleDriveFindChild(segment, parentId, true, token)
    if (!id) return null
    parentId = id
  }

  // Set the whole public folder public once — all children inherit
  await fetch(`https://www.googleapis.com/drive/v3/files/${parentId}/permissions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  })

  gdPublicFolderId = parentId
  return parentId
}

async function getGoogleDrivePublicUrl(publicFilePath: string, token: string): Promise<string | null> {
  const folderId = await ensureGoogleDrivePublicFolder(token)
  if (!folderId) return null

  // Traverse from the cached public folder — avoids re-walking root→public→loam each time
  const parts = publicFilePath.split('/').filter(Boolean)
  let parentId = folderId
  for (let i = 0; i < parts.length; i++) {
    const id = await googleDriveFindChild(parts[i], parentId, i < parts.length - 1, token)
    if (!id) return null
    parentId = id
  }

  return `https://drive.usercontent.google.com/download?id=${parentId}&export=download`
}

function getRemoteToken(): string | null {
  return (rs as unknown as { remote?: { token?: string } }).remote?.token ?? null
}

export async function resolvePublicFileUrl(publicFilePath: string): Promise<string | null> {
  const backend = getActiveBackend()
  if (backend === 'dropbox') {
    const token = getRemoteToken()
    if (!token) return null
    try {
      return await createDropboxSharedLink(`/public/${PUBLIC_DIR}/${publicFilePath}`, token)
    } catch {
      return null
    }
  }
  if (backend === 'googledrive') {
    const token = getRemoteToken()
    if (!token) return null
    return getGoogleDrivePublicUrl(publicFilePath, token)
  }
  return itemUrl(publicFilePath)
}

export async function resolvePublicPostUrl(slug: string, mediaType?: string): Promise<string | null> {
  return resolvePublicFileUrl(`${POSTS_PATH}${slug}.${mediaTypeToExt(mediaType)}`)
}

export async function resolvePublicIndexUrl(): Promise<string | null> {
  return resolvePublicFileUrl(INDEX_PATH)
}

export async function resolvePublicFeedUrl(): Promise<string | null> {
  return resolvePublicFileUrl(FEED_PATH)
}

export async function resolvePublicFeedAtomUrl(): Promise<string | null> {
  return resolvePublicFileUrl(FEED_ATOM_PATH)
}

export function getPublicIndexUrl(): string | null {
  return itemUrl(INDEX_PATH)
}

export async function loadPublicIndexUrl(): Promise<string | null> {
  if (getActiveBackend() === 'remotestorage') return itemUrl(INDEX_PATH)
  return pullGardenSetting('publicIndexUrl')
}

export function getPublicScopePath(): string {
  return `/public/${PUBLIC_DIR}/`
}

export async function fetchWellKnownIndexUrl(): Promise<string | null> {
  try {
    const res = await fetch('/.well-known/loam.json')
    if (!res.ok) return null
    const data = (await res.json()) as { indexUrl?: string }
    return typeof data.indexUrl === 'string' ? data.indexUrl : null
  } catch {
    return null
  }
}

export function getGardenSettingsUrl(): string | null {
  return scopedItemUrl(privateClient(), SETTINGS_PATH)
}

export async function storePostMarkdown(slug: string, content: string, mediaType?: string): Promise<void> {
  const ext = mediaTypeToExt(mediaType)
  await publicClient().storeFile(mediaTypeToMime(mediaType), `${POSTS_PATH}${slug}.${ext}`, content)
}

export async function pullPostMarkdown(slug: string, mediaType?: string): Promise<string | null> {
  const ext = mediaTypeToExt(mediaType)
  const result = await publicClient().getFile(`${POSTS_PATH}${slug}.${ext}`)
  if (!result?.data) return null

  if (typeof result.data === 'string') {
    return result.data
  }

  if (result.data instanceof ArrayBuffer) {
    return new TextDecoder().decode(result.data)
  }

  return await (result.data as Blob).text()
}

export async function removePostMarkdown(slug: string, mediaType?: string): Promise<void> {
  const ext = mediaTypeToExt(mediaType)
  await publicClient().remove(`${POSTS_PATH}${slug}.${ext}`)
}

export async function storePostMeta(meta: GardenPostMeta): Promise<void> {
  await privateClient().storeFile('application/json', `${META_PATH}${meta.slug}.json`, JSON.stringify(meta))
}

export async function pullPostMeta(slug: string): Promise<GardenPostMeta | null> {
  const result = await privateClient().getFile(`${META_PATH}${slug}.json`)
  if (!result?.data) return null
  try {
    return GardenPostMetaSchema.parse(JSON.parse(result.data as string))
  } catch {
    return null
  }
}

export async function removePostMeta(slug: string): Promise<void> {
  await privateClient().remove(`${META_PATH}${slug}.json`)
}

export async function listPostMetaSlugs(): Promise<string[]> {
  const listing = await privateClient().getListing(META_PATH)
  if (!listing) return []

  return Object.keys(listing)
    .filter((key) => key.endsWith('.json'))
    .map((key) => key.slice(0, -'.json'.length))
}

export async function pullAllPostMeta(): Promise<GardenPostMeta[]> {
  const slugs = await listPostMetaSlugs()
  const all = await Promise.all(slugs.map((slug) => pullPostMeta(slug)))
  return all.filter((item): item is GardenPostMeta => item !== null)
}

export async function markdownExists(slug: string, mediaType?: string): Promise<boolean> {
  const ext = mediaTypeToExt(mediaType)
  const result = await publicClient().getFile(`${POSTS_PATH}${slug}.${ext}`)
  return Boolean(result?.data)
}

export async function storeIndex(index: GardenIndex): Promise<void> {
  await publicClient().storeFile('application/json', INDEX_PATH, JSON.stringify(index))
}

export async function pullIndex(): Promise<GardenIndex | null> {
  const result = await publicClient().getFile(INDEX_PATH)
  if (!result?.data) return null
  try {
    return GardenIndexSchema.parse(JSON.parse(result.data as string))
  } catch {
    return null
  }
}

export async function storeFeed(feed: unknown): Promise<void> {
  await publicClient().storeFile('application/json', FEED_PATH, JSON.stringify(feed))
}

export async function storeFeedAtom(xml: string): Promise<void> {
  await publicClient().storeFile('application/atom+xml', FEED_ATOM_PATH, xml)
}

export async function storeGardenSetting(key: string, value: string): Promise<void> {
  const result = await privateClient().getFile(SETTINGS_PATH)
  const current = result?.data ? (JSON.parse(result.data as string) as Record<string, string>) : {}
  current[key] = value

  await privateClient().storeFile('application/json', SETTINGS_PATH, JSON.stringify(current))
}

export async function pullGardenSetting(key: string): Promise<string | null> {
  const result = await privateClient().getFile(SETTINGS_PATH)
  if (!result?.data) return null

  try {
    const settings = JSON.parse(result.data as string)
    if (typeof settings !== 'object' || settings === null) return null
    const value = (settings as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

export async function storeMediaFile(contentPath: string, mimeType: string, data: ArrayBuffer | Blob): Promise<void> {
  // RS.js 2.0-beta has a bug where a 404 pre-sync GET causes binary files to be delayed
  // indefinitely rather than PUTted. Bypass the sync pipeline for native RS backend.
  if (getActiveBackend() === 'remotestorage') {
    const url = itemUrl(contentPath)
    const token = getRemoteToken()
    if (url && token) {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
        body: data,
      })
      if (!res.ok) throw new Error(`Media upload failed: ${res.status}`)
      return
    }
  }
  await publicClient().storeFile(mimeType, contentPath, data instanceof Blob ? await data.arrayBuffer() : data)
}

export async function deleteMediaFile(contentPath: string): Promise<void> {
  if (getActiveBackend() === 'remotestorage') {
    const url = itemUrl(contentPath)
    const token = getRemoteToken()
    if (url && token) {
      await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      return
    }
  }
  await publicClient().remove(contentPath)
}

export async function resolvePublicMediaUrl(contentPath: string): Promise<string | null> {
  return resolvePublicFileUrl(contentPath)
}

export async function pullMediaIndex(): Promise<MediaIndex | null> {
  const result = await privateClient().getFile(MEDIA_INDEX_PATH)
  if (!result?.data) return null
  try {
    return MediaIndexSchema.parse(JSON.parse(result.data as string))
  } catch {
    return null
  }
}

export async function storeMediaIndex(index: MediaIndex): Promise<void> {
  await privateClient().storeFile('application/json', MEDIA_INDEX_PATH, JSON.stringify(index))
}

export async function listMediaPaths(): Promise<string[]> {
  const listing = await publicClient().getListing(MEDIA_PATH)
  if (!listing) return []
  return Object.keys(listing).map((k) => MEDIA_PATH + k)
}

export async function getMediaFileAsObjectUrl(contentPath: string): Promise<string | null> {
  // For native RS, fetch directly — file was PUT outside the RS.js cache
  if (getActiveBackend() === 'remotestorage') {
    const url = itemUrl(contentPath)
    if (!url) return null
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      return URL.createObjectURL(await res.blob())
    } catch {
      return null
    }
  }
  const result = (await publicClient().getFile(contentPath)) as { data?: unknown; mimeType?: string } | null
  if (!result?.data) return null
  const mimeType = result.mimeType ?? 'application/octet-stream'
  if (result.data instanceof Blob) return URL.createObjectURL(result.data)
  if (result.data instanceof ArrayBuffer) return URL.createObjectURL(new Blob([result.data], { type: mimeType }))
  return null
}
