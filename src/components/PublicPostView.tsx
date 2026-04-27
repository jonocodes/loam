import { useEffect, useMemo, useState } from 'react'
import { MarkdownViewer } from './MarkdownViewer'
import { navigate } from '../lib/navigate'
import { encodeIndexToken } from '../lib/indexToken'
import { getPublicIndexUrl, inferMediaType } from '../lib/remotestorage'
import type { GardenIndex, GardenIndexEntry } from '../lib/schema'
import type { UrlEncoding } from '../lib/indexToken'

interface Props {
  postSlug: string
  indexUrl?: string
  indexBasePath?: string
}

function getQueryParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get(name)
}

function getHistoryEntry(): GardenIndexEntry | null {
  const state = history.state as { entry?: GardenIndexEntry } | null
  return state?.entry ?? null
}

export function PublicPostView({ postSlug, indexUrl: propIndexUrl, indexBasePath }: Props) {
  const [body, setBody] = useState('')
  const [post, setPost] = useState<GardenIndexEntry | null>(getHistoryEntry)
  const [urlEncoding, setUrlEncoding] = useState<UrlEncoding>('e2')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const indexUrl = useMemo(() => propIndexUrl ?? getQueryParam('index') ?? getPublicIndexUrl(), [propIndexUrl])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        let entry = getHistoryEntry()

        if (!entry) {
          if (!indexUrl) {
            throw new Error('No public index URL available yet. Connect to remoteStorage first or provide ?index=.')
          }
          const indexRes = await fetch(indexUrl)
          if (!indexRes.ok) {
            throw new Error(`Unable to load garden index (${indexRes.status})`)
          }
          const index = (await indexRes.json()) as GardenIndex
          if (index.urlEncoding) setUrlEncoding(index.urlEncoding)
          entry = index.posts?.find((item) => item.slug === postSlug) ?? null
          if (!entry) {
            throw new Error('Post not found in index.')
          }
        }

        const bodyRes = await fetch(entry.contentUrl)
        if (!bodyRes.ok) {
          throw new Error(`Unable to load post body (${bodyRes.status})`)
        }

        const rawBody = await bodyRes.text()
        if (!cancelled) {
          setPost(entry)
          setBody(rawBody)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load public post')
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
  }, [indexUrl, postSlug])

  if (error) {
    return <p className="mx-auto max-w-3xl p-6 text-red-600">{error}</p>
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 md:p-6">
      <header className="mb-4 border-b border-slate-200 pb-4">
        <div className="mb-2">
          <a
            className="text-sm text-slate-700 underline underline-offset-4"
            href={(() => {
              if (indexBasePath) return indexBasePath
              if (window.location.pathname !== '/') return indexUrl ? `/p/${encodeIndexToken(indexUrl, urlEncoding)}` : '/'
              return new URLSearchParams(window.location.search).has('index') && indexUrl
                ? `/?index=${encodeURIComponent(indexUrl)}`
                : '/'
            })()}
            onClick={(e) => {
              e.preventDefault()
              const href = (() => {
                if (indexBasePath) return indexBasePath
                if (window.location.pathname !== '/') return indexUrl ? `/p/${encodeIndexToken(indexUrl, urlEncoding)}` : '/'
                return new URLSearchParams(window.location.search).has('index') && indexUrl
                  ? `/?index=${encodeURIComponent(indexUrl)}`
                  : '/'
              })()
              navigate(href)
            }}
          >
            ← Back to home
          </a>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{post?.title ?? postSlug}</h1>
        {post?.updatedAt ? <p className="mt-2 text-xs text-slate-500">Updated {new Date(post.updatedAt).toLocaleString()}</p> : null}
        {post?.tags && post.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{tag}</span>
            ))}
          </div>
        ) : null}
      </header>
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : (() => {
        const effectiveMediaType = inferMediaType(post?.mediaType, post?.contentUrl)
        if (effectiveMediaType === 'text/html') {
          return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: body }} />
        }
        if (effectiveMediaType === 'text/plain') {
          return <pre className="overflow-x-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-900">{body}</pre>
        }
        return <MarkdownViewer value={body} />
      })()}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Published with{' '}
        <a className="underline underline-offset-4 hover:text-slate-600" href="/" onClick={(e) => { e.preventDefault(); navigate('/') }}>
          Loam
        </a>
      </footer>
    </main>
  )
}
