import { useEffect, useMemo, useState } from 'react'
import { navigate } from '../lib/navigate'
import { buildPostLinkUrl } from '../lib/publicUrls'
import { getPublicIndexUrl } from '../lib/remotestorage'
import type { GardenIndex, GardenIndexEntry } from '../lib/schema'

function getIndexUrlFromQuery(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('index')
}

interface Props {
  indexUrl?: string
  indexBasePath?: string
}

export function PublicIndexView({ indexUrl: propIndexUrl, indexBasePath }: Props = {}) {
  const [index, setIndex] = useState<GardenIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const indexUrl = useMemo(() => propIndexUrl ?? getIndexUrlFromQuery() ?? getPublicIndexUrl(), [propIndexUrl])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    if (index) {
      for (const p of index.posts) {
        for (const t of p.tags ?? []) {
          set.add(t)
        }
      }
    }
    return [...set].sort()
  }, [index])

  const visiblePosts = useMemo(
    () => (tagFilter ? (index?.posts.filter((p) => p.tags?.includes(tagFilter)) ?? []) : (index?.posts ?? [])),
    [index, tagFilter],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!indexUrl) {
        setError('No public index URL available yet. Connect to remoteStorage first or provide ?index=.')
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(indexUrl)
        if (!response.ok) {
          throw new Error(`Unable to load garden index (${response.status}).`)
        }

        const parsed = (await response.json()) as GardenIndex
        if (!cancelled) {
          setIndex(parsed)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load garden index.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [indexUrl])

  if (loading) {
    return <p className="mx-auto max-w-3xl p-6 text-slate-500">Loading garden index...</p>
  }

  if (error) {
    return <p className="mx-auto max-w-3xl p-6 text-red-600">{error}</p>
  }

  if (!index) {
    return <p className="mx-auto max-w-3xl p-6 text-slate-500">Garden index not found.</p>
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:p-6">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{index.title || 'Loam'}</h1>
        {index.tagline ? <p className="mt-2 text-slate-600">{index.tagline}</p> : null}
      </header>

      {allTags.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${tagFilter === tag ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="space-y-4">
        {visiblePosts.map((post) => {
          const postUrl = buildPostLinkUrl(indexUrl, indexBasePath ?? null, index.urlEncoding ?? 'e2', post.slug)

          return (
            <li key={post.slug} className="rounded-lg border border-slate-200 bg-white p-4">
              <a
                className="text-lg font-semibold text-slate-900 underline underline-offset-4"
                href={postUrl}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(postUrl, { entry: post } satisfies { entry: GardenIndexEntry })
                }}
              >
                {post.title}
              </a>
              <p className="mt-1 text-sm text-slate-600">{post.excerpt}</p>
              {post.tags && post.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-slate-500">
                Published {post.date || new Date(post.publishedAt).toLocaleDateString()}
              </p>
            </li>
          )
        })}
      </ul>

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Published with{' '}
        <a
          className="underline underline-offset-4 hover:text-slate-600"
          href="/"
          onClick={(e) => {
            e.preventDefault()
            navigate('/')
          }}
        >
          Loam
        </a>
      </footer>
    </main>
  )
}
