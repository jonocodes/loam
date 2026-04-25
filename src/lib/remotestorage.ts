import RemoteStorage from 'remotestoragejs'
import type { GardenIndex, GardenPostMeta } from './types'

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
rs.setSyncInterval(2000)

function privateClient() {
  return rs.scope(`/${RS_MODULE}/`)
}

function publicClient() {
  return rs.scope(`/public/${PUBLIC_DIR}/`)
}

function itemUrl(path: string): string | null {
  try {
    const url = publicClient().getItemURL(path)
    return typeof url === 'string' ? url : null
  } catch {
    return null
  }
}

const POSTS_PATH = 'posts/'
const META_PATH = 'meta/'
const INDEX_PATH = 'index.json'
const FEED_PATH = 'feed.json'
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

async function createDropboxSharedLink(dropboxPath: string, token: string): Promise<string> {
  const res = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path: dropboxPath, settings: { requested_visibility: 'public' } }),
  })

  if (res.status === 409) {
    const body = await res.json() as { error?: { '.tag': string; shared_link_already_exists?: { metadata: { url: string } } } }
    const existing = body.error?.shared_link_already_exists?.metadata.url
    if (existing) return dropboxToDirectUrl(existing)
  }

  if (!res.ok) throw new Error(`Dropbox sharing API error: ${res.status}`)
  const data = await res.json() as { url: string }
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
  const data = await res.json() as { files?: { id: string }[] }
  return data.files ?? []
}

async function googleDriveFindChild(name: string, parentId: string, isFolder: boolean, token: string): Promise<string | null> {
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

async function resolvePublicFileUrl(publicFilePath: string): Promise<string | null> {
  const backend = getActiveBackend()
  if (backend === 'dropbox') {
    const token = getRemoteToken()
    if (!token) return null
    return createDropboxSharedLink(`/public/${PUBLIC_DIR}/${publicFilePath}`, token)
  }
  if (backend === 'googledrive') {
    const token = getRemoteToken()
    if (!token) return null
    return getGoogleDrivePublicUrl(publicFilePath, token)
  }
  return itemUrl(publicFilePath)
}

export async function resolvePublicPostUrl(id: string): Promise<string | null> {
  return resolvePublicFileUrl(`${POSTS_PATH}${id}.md`)
}

export async function resolvePublicIndexUrl(): Promise<string | null> {
  return resolvePublicFileUrl(INDEX_PATH)
}

export async function resolvePublicFeedUrl(): Promise<string | null> {
  return resolvePublicFileUrl(FEED_PATH)
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

export function getGardenSettingsUrl(): string | null {
  const url = privateClient().getItemURL(SETTINGS_PATH)
  return typeof url === 'string' ? url : null
}

export async function storePostMarkdown(id: string, markdown: string): Promise<void> {
  await publicClient().storeFile('text/markdown', `${POSTS_PATH}${id}.md`, markdown)
}

export async function pullPostMarkdown(id: string): Promise<string | null> {
  const result = await publicClient().getFile(`${POSTS_PATH}${id}.md`)
  if (!result?.data) return null

  if (typeof result.data === 'string') {
    return result.data
  }

  if (result.data instanceof ArrayBuffer) {
    return new TextDecoder().decode(result.data)
  }

  return await (result.data as Blob).text()
}

export async function removePostMarkdown(id: string): Promise<void> {
  await publicClient().remove(`${POSTS_PATH}${id}.md`)
}

export async function storePostMeta(meta: GardenPostMeta): Promise<void> {
  await privateClient().storeFile('application/json', `${META_PATH}${meta.id}.json`, JSON.stringify(meta))
}

export async function pullPostMeta(id: string): Promise<GardenPostMeta | null> {
  const result = await privateClient().getFile(`${META_PATH}${id}.json`)
  if (!result?.data) return null
  return JSON.parse(result.data as string) as GardenPostMeta
}

export async function removePostMeta(id: string): Promise<void> {
  await privateClient().remove(`${META_PATH}${id}.json`)
}

export async function listPostMetaIds(): Promise<string[]> {
  const listing = await privateClient().getListing(META_PATH)
  if (!listing) return []

  return Object.keys(listing)
    .filter((key) => key.endsWith('.json'))
    .map((key) => key.slice(0, -'.json'.length))
}

export async function pullAllPostMeta(): Promise<GardenPostMeta[]> {
  const ids = await listPostMetaIds()
  const all = await Promise.all(ids.map((id) => pullPostMeta(id)))
  return all.filter((item): item is GardenPostMeta => item !== null)
}

export async function storeIndex(index: GardenIndex): Promise<void> {
  await publicClient().storeFile('application/json', INDEX_PATH, JSON.stringify(index))
}

export async function pullIndex(): Promise<GardenIndex | null> {
  const result = await publicClient().getFile(INDEX_PATH)
  if (!result?.data) return null
  return JSON.parse(result.data as string) as GardenIndex
}

export async function storeFeed(feed: unknown): Promise<void> {
  await publicClient().storeFile('application/json', FEED_PATH, JSON.stringify(feed))
}

export async function markdownExists(id: string): Promise<boolean> {
  const result = await publicClient().getFile(`${POSTS_PATH}${id}.md`)
  return Boolean(result?.data)
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

  const settings = JSON.parse(result.data as string) as Record<string, string>
  return settings[key] ?? null
}
