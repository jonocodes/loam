import { describe, expect, it } from 'vitest'
import { decodeIndexToken, encodeIndexToken } from '../lib/indexToken'

describe('indexToken', () => {
  const url = 'https://storage.5apps.com/user/public/loam/index.json'

  it('encodes with e2: prefix by default', () => {
    expect(encodeIndexToken(url)).toMatch(/^e2:/)
  })

  it('roundtrips via e2', () => {
    expect(decodeIndexToken(encodeIndexToken(url))).toBe(url)
  })

  it('encodes with e1: prefix when specified', () => {
    expect(encodeIndexToken(url, 'e1')).toMatch(/^e1:/)
  })

  it('roundtrips via e1', () => {
    expect(decodeIndexToken(encodeIndexToken(url, 'e1'))).toBe(url)
  })

  it('returns null for bare base64 (no prefix)', () => {
    const bare = btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    expect(decodeIndexToken(bare)).toBeNull()
  })

  it('returns null for random text', () => {
    expect(decodeIndexToken('badtoken')).toBeNull()
  })

  it('returns null for valid base64 that is not a URL', () => {
    expect(decodeIndexToken('aGVsbG8gd29ybGQ')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeIndexToken('')).toBeNull()
  })
})
