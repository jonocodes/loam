import { z } from 'zod'

export const PostStatusSchema = z.enum(['draft', 'published', 'unpublished', 'deleted'])

// Planned mediaType values (not yet implemented in UI):
//   'text/plain' — plain text posts
//   'text/html'  — raw HTML posts
// Default when absent: 'text/markdown'

export const GardenPostMetaSchema = z.object({
  version: z.literal(1),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()).optional(),
  mediaType: z.string().optional(),
  status: PostStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
})

export const GardenIndexEntrySchema = z.object({
  slug: z.string(),
  date: z.string(),
  title: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()).optional(),
  mediaType: z.string().optional(),
  publishedAt: z.string(),
  updatedAt: z.string(),
  contentUrl: z.string(),
})

export const GardenIndexSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  tagline: z.string().optional(),
  urlPrefix: z.string().optional(),
  urlEncoding: z.enum(['e1', 'e2']).optional(),
  updatedAt: z.string(),
  posts: z.array(GardenIndexEntrySchema),
})

export type PostStatus = z.infer<typeof PostStatusSchema>
export type GardenPostMeta = z.infer<typeof GardenPostMetaSchema>
export type GardenIndexEntry = z.infer<typeof GardenIndexEntrySchema>
export type GardenIndex = z.infer<typeof GardenIndexSchema>

export const MediaItemSchema = z.object({
  filename: z.string(),
  contentPath: z.string(),
  resolvedUrl: z.string(),
  uploadedAt: z.string(),
  mimeType: z.string(),
  size: z.number().optional(),
})

export const MediaIndexSchema = z.object({
  version: z.literal(1),
  items: z.array(MediaItemSchema),
})

export type MediaItem = z.infer<typeof MediaItemSchema>
export type MediaIndex = z.infer<typeof MediaIndexSchema>
