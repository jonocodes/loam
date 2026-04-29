import { describe, expect, it } from 'vitest'
import { parseMarkdownToPost } from '../lib/markdown'

describe('parseMarkdownToPost', () => {
  it('extracts title from first markdown heading and removes it from body', () => {
    const parsed = parseMarkdownToPost('# Hello world\n\nThis is a post body.')
    expect(parsed.title).toBe('Hello world')
    expect(parsed.body).toBe('This is a post body.')
    expect(parsed.excerpt).toBe('This is a post body.')
  })

  it('keeps body as-is when no heading is present', () => {
    const parsed = parseMarkdownToPost('Plain content\n\nSecond line')
    expect(parsed.title).toBeNull()
    expect(parsed.body).toBe('Plain content\n\nSecond line')
    expect(parsed.excerpt).toBe('Plain content')
  })

  it('truncates long excerpt lines', () => {
    const longLine = 'a'.repeat(200)
    const parsed = parseMarkdownToPost(longLine)
    expect(parsed.excerpt.endsWith('...')).toBe(true)
    expect(parsed.excerpt.length).toBe(160)
  })

  it('handles CRLF line endings', () => {
    const parsed = parseMarkdownToPost('# Hello\r\n\r\nBody text')
    expect(parsed.title).toBe('Hello')
    expect(parsed.body).toBe('Body text')
  })

  it('returns empty strings for empty input', () => {
    const parsed = parseMarkdownToPost('')
    expect(parsed.title).toBeNull()
    expect(parsed.body).toBe('')
    expect(parsed.excerpt).toBe('')
  })

  it('handles heading-only input with no body', () => {
    const parsed = parseMarkdownToPost('# Just a title')
    expect(parsed.title).toBe('Just a title')
    expect(parsed.body).toBe('')
    expect(parsed.excerpt).toBe('')
  })

  it('only extracts the first heading', () => {
    const parsed = parseMarkdownToPost('# First\n\nSome text\n\n## Second')
    expect(parsed.title).toBe('First')
    expect(parsed.body).toContain('## Second')
  })

  it('uses first non-empty line as excerpt when no heading', () => {
    const parsed = parseMarkdownToPost('\n\nFirst real line\n\nSecond')
    expect(parsed.excerpt).toBe('First real line')
  })
})
