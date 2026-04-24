export type PostStatus = 'draft' | 'published' | 'unpublished' | 'deleted'

export interface GardenPostMeta {
  version: 1
  id: string
  title: string
  excerpt: string
  status: PostStatus
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  deletedAt: string | null
}

export interface GardenIndexEntry {
  id: string
  slug: string
  date: string
  title: string
  excerpt: string
  publishedAt: string
  updatedAt: string
  contentUrl: string
}

export interface GardenIndex {
  version: 1 | 2
  title: string
  tagline?: string
  urlPrefix?: string
  urlEncoding?: 'e1' | 'e2'
  updatedAt: string
  posts: GardenIndexEntry[]
}
