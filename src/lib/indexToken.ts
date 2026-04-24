export type UrlEncoding = 'e1' | 'e2'

export function encodeIndexToken(url: string, encoding: UrlEncoding = 'e2'): string {
  if (encoding === 'e1') return 'e1:' + encodeURIComponent(url)
  return 'e2:' + btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function decodeIndexToken(token: string): string | null {
  try {
    if (token.startsWith('e1:')) {
      const decoded = decodeURIComponent(token.slice(3))
      return decoded.startsWith('http') ? decoded : null
    }
    if (!token.startsWith('e2:')) return null
    const encoded = token.slice(3)
    const padded = encoded + '==='.slice((encoded.length + 3) % 4)
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    return decoded.startsWith('http') ? decoded : null
  } catch {
    return null
  }
}
