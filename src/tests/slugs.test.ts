import { describe, expect, it } from 'vitest'
import { buildDatedSlug, ensureUniqueSlug, slugifyTitle } from '../lib/slugs'

describe('slug id helpers', () => {
  it('slugifies common titles', () => {
    expect(slugifyTitle('Hello, Remote Storage!')).toBe('hello-remote-storage')
    expect(slugifyTitle("Sam's First Post")).toBe('sams-first-post')
  })

  it('builds dated slug ids', () => {
    const id = buildDatedSlug('My First Post', new Date('2026-04-22T10:00:00Z'))
    expect(id).toBe('2026-04-22-my-first-post')
  })

  it('ensures unique ids by numeric suffixing', () => {
    const unique = ensureUniqueSlug('2026-04-22-my-first-post', [
      '2026-04-22-my-first-post',
      '2026-04-22-my-first-post-2',
    ])

    expect(unique).toBe('2026-04-22-my-first-post-3')
  })
})
