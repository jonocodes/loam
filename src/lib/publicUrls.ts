import type { UrlEncoding } from './indexToken'
import { encodeIndexToken } from './indexToken'

export function buildPublicHomeUrl(
  publicIndexUrl: string | null,
  urlPrefix: string,
  urlEncoding: UrlEncoding,
): string | null {
  if (!publicIndexUrl) return null
  const token = encodeIndexToken(publicIndexUrl, urlEncoding)
  const freePart = urlPrefix || 'garden'
  return `${window.location.origin}/p/${freePart}/${token}`
}

export function buildPublicPostUrl(
  publicIndexUrl: string | null,
  urlPrefix: string,
  urlEncoding: UrlEncoding,
  slug: string,
): string | null {
  const home = buildPublicHomeUrl(publicIndexUrl, urlPrefix, urlEncoding)
  return home ? `${home}/${slug}` : null
}

export function buildPostLinkUrl(
  indexUrl: string | null,
  indexPath: string | null,
  urlEncoding: UrlEncoding,
  postSlug: string,
): string {
  if (indexPath) {
    return `${window.location.origin}${indexPath}/${postSlug}`
  }
  if (window.location.pathname === '/' && indexUrl) {
    const hasIndexParam = new URLSearchParams(window.location.search).has('index')
    if (!hasIndexParam) {
      return `${window.location.origin}/p/${postSlug}`
    }
    return `${window.location.origin}/?index=${encodeURIComponent(indexUrl)}&post=${postSlug}`
  }
  if (indexUrl) {
    return `${window.location.origin}/p/${encodeIndexToken(indexUrl, urlEncoding)}/${postSlug}`
  }
  return `${window.location.origin}/public/${postSlug}`
}

export function buildBackLinkUrl(
  indexUrl: string | null,
  indexBasePath: string | null,
  urlEncoding: UrlEncoding,
): string {
  if (indexBasePath) return indexBasePath
  if (window.location.pathname !== '/') {
    return indexUrl ? `/p/${encodeIndexToken(indexUrl, urlEncoding)}` : '/'
  }
  if (new URLSearchParams(window.location.search).has('index') && indexUrl) {
    return `/?index=${encodeURIComponent(indexUrl)}`
  }
  return '/'
}
