import { describe, expect, it } from 'vitest'
import { inferMediaType, mediaTypeToExt } from '../lib/mediaType'

describe('mediaTypeToExt', () => {
  it('maps text/html to html', () => {
    expect(mediaTypeToExt('text/html')).toBe('html')
  })

  it('maps text/plain to txt', () => {
    expect(mediaTypeToExt('text/plain')).toBe('txt')
  })

  it('maps text/markdown to md', () => {
    expect(mediaTypeToExt('text/markdown')).toBe('md')
  })

  it('defaults to md when undefined', () => {
    expect(mediaTypeToExt(undefined)).toBe('md')
  })

  it('defaults to md for unknown types', () => {
    expect(mediaTypeToExt('application/json')).toBe('md')
  })
})

describe('inferMediaType', () => {
  it('returns the explicit mediaType when set', () => {
    expect(inferMediaType('text/html', 'https://example.com/post.txt')).toBe('text/html')
  })

  it('infers text/html from .html extension', () => {
    expect(inferMediaType(undefined, 'https://example.com/post.html')).toBe('text/html')
  })

  it('infers text/plain from .txt extension', () => {
    expect(inferMediaType(undefined, 'https://example.com/post.txt')).toBe('text/plain')
  })

  it('defaults to text/markdown for .md extension', () => {
    expect(inferMediaType(undefined, 'https://example.com/post.md')).toBe('text/markdown')
  })

  it('defaults to text/markdown when url is undefined', () => {
    expect(inferMediaType(undefined, undefined)).toBe('text/markdown')
  })
})
