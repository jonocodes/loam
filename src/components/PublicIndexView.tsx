import { useEffect, useMemo, useState } from 'react'
import { navigate } from '../lib/navigate'
import { buildPostLinkUrl } from '../lib/publicUrls'
import { getPublicIndexUrl } from '../lib/remotestorage'
import type { GardenIndex, GardenIndexEntry } from '../lib/schema'
import { StackLayout, useStackTheme } from './StackLayout'

function getIndexUrlFromQuery(): string | null {
  return new URLSearchParams(window.location.search).get('index')
}

const MONO = '"JetBrains Mono", ui-monospace, monospace'

interface Props {
  indexUrl?: string
  indexBasePath?: string
}

function IndexContent({
  index,
  loading,
  error,
  indexUrl,
  indexBasePath,
}: {
  index: GardenIndex | null
  loading: boolean
  error: string | null
  indexUrl: string | null
  indexBasePath?: string | null
}) {
  const theme = useStackTheme()
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const allTags = useMemo(() => {
    if (!index) return []
    const s = new Set<string>()
    for (const p of index.posts) {
      for (const t of p.tags ?? []) s.add(t)
    }
    return [...s].sort()
  }, [index])

  const visiblePosts = useMemo(
    () => (tagFilter ? (index?.posts.filter((p) => p.tags?.includes(tagFilter)) ?? []) : (index?.posts ?? [])),
    [index, tagFilter],
  )

  if (loading) {
    return (
      <div style={{ padding: '24px 28px', color: theme.dim, fontFamily: MONO, fontSize: 12 }}>loading index...</div>
    )
  }

  if (error) {
    return <div style={{ padding: '24px 28px', color: '#e06c75', fontFamily: MONO, fontSize: 12 }}>error: {error}</div>
  }

  if (!index) {
    return <div style={{ padding: '24px 28px', color: theme.dim }}>No posts found.</div>
  }

  return (
    <div style={{ padding: '20px 28px 60px' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: -0.2, color: theme.ink }}>
          {tagFilter ? `#${tagFilter}` : 'All posts'}
        </h1>
        <span style={{ color: theme.dim, fontSize: 12, fontFamily: MONO }}>{visiblePosts.length} files</span>
      </div>

      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              style={{
                background: tagFilter === tag ? theme.sel : 'none',
                border: `1px solid ${tagFilter === tag ? theme.accent : theme.rule}`,
                color: tagFilter === tag ? theme.accent : theme.dim,
                padding: '2px 8px',
                borderRadius: 3,
                cursor: 'pointer',
                fontFamily: MONO,
                fontSize: 11,
              }}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${theme.rule}` }}>
        {visiblePosts.map((post) => {
          const postUrl = buildPostLinkUrl(indexUrl, indexBasePath ?? null, index.urlEncoding ?? 'e2', post.slug)
          const date = post.date || new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

          return (
            <button
              key={post.slug}
              type="button"
              onClick={() => navigate(postUrl, { entry: post } satisfies { entry: GardenIndexEntry })}
              style={{
                display: 'grid',
                gridTemplateColumns: '96px 1fr 90px',
                gap: 16,
                alignItems: 'baseline',
                width: '100%',
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.ink,
                borderBottom: `1px solid ${theme.rule}`,
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 11, color: theme.dim }}>{date}</span>
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{post.title}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: theme.dim,
                    lineHeight: 1.45,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {post.excerpt}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {(post.tags ?? []).slice(0, 2).map((t) => (
                  <span key={t} style={{ fontSize: 10, color: theme.dim, fontFamily: MONO }}>
                    #{t}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <div
        style={{
          marginTop: 48,
          paddingTop: 16,
          borderTop: `1px solid ${theme.rule}`,
          textAlign: 'center',
          fontSize: 11,
          color: theme.dim,
          fontFamily: MONO,
        }}
      >
        published with{' '}
        <a
          href="/"
          style={{ color: theme.accent, textDecoration: 'underline', textUnderlineOffset: 3 }}
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
        >
          loam
        </a>
      </div>
    </div>
  )
}

export function PublicIndexView({ indexUrl: propIndexUrl, indexBasePath }: Props = {}) {
  const [index, setIndex] = useState<GardenIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const indexUrl = useMemo(() => propIndexUrl ?? getIndexUrlFromQuery() ?? getPublicIndexUrl(), [propIndexUrl])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!indexUrl) {
        setError('No public index URL configured.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(indexUrl)
        if (!res.ok) throw new Error(`Failed to load index (${res.status})`)
        const data = (await res.json()) as GardenIndex
        if (!cancelled) setIndex(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load index')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [indexUrl])

  return (
    <StackLayout index={index} indexUrl={indexUrl ?? null} indexBasePath={indexBasePath ?? null} currentSlug={null}>
      <IndexContent
        index={index}
        loading={loading}
        error={error}
        indexUrl={indexUrl ?? null}
        indexBasePath={indexBasePath ?? null}
      />
    </StackLayout>
  )
}
