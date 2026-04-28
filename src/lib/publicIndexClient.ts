import type { GardenIndex } from './schema'

const indexCache = new Map<string, GardenIndex>()
const indexRequests = new Map<string, Promise<GardenIndex>>()

export function getCachedPublicIndex(indexUrl: string): GardenIndex | null {
  return indexCache.get(indexUrl) ?? null
}

export async function loadPublicIndex(indexUrl: string): Promise<GardenIndex> {
  const cached = indexCache.get(indexUrl)
  if (cached) return cached

  const pending = indexRequests.get(indexUrl)
  if (pending) return pending

  const request = (async () => {
    const res = await fetch(indexUrl)
    if (!res.ok) throw new Error(`Failed to load index (${res.status})`)
    const data = (await res.json()) as GardenIndex
    indexCache.set(indexUrl, data)
    return data
  })()
    .finally(() => {
      indexRequests.delete(indexUrl)
    })

  indexRequests.set(indexUrl, request)
  return request
}
