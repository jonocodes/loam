export function mediaTypeToExt(mediaType?: string): string {
  if (mediaType === 'text/html') return 'html'
  if (mediaType === 'text/plain') return 'txt'
  return 'md'
}

export function inferMediaType(explicitMediaType?: string, url?: string): string {
  if (explicitMediaType) return explicitMediaType
  if (url?.endsWith('.html')) return 'text/html'
  if (url?.endsWith('.txt')) return 'text/plain'
  return 'text/markdown'
}
