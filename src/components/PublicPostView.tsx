import { useEffect, useMemo, useState } from 'react'
import { navigate } from '../lib/navigate'
import { getPublicIndexUrl, inferMediaType } from '../lib/remotestorage'
import type { GardenIndex, GardenIndexEntry } from '../lib/schema'
import { MarkdownViewer } from './MarkdownViewer'
import { StackLayout, useStackTheme } from './StackLayout'

const MONO = '"JetBrains Mono", ui-monospace, monospace'

interface Props {
  postSlug: string
  indexUrl?: string
  indexBasePath?: string
}

function getHistoryEntry(): GardenIndexEntry | null {
  const state = history.state as { entry?: GardenIndexEntry } | null
  return state?.entry ?? null
}

function getQueryParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name)
}

function PostContent({
  post,
  body,
  loading,
  error,
  mediaType,
}: {
  post: GardenIndexEntry | null
  body: string
  loading: boolean
  error: string | null
  mediaType: string
}) {
  const theme = useStackTheme()

  if (error) {
    return <div style={{ padding: '24px 28px', color: '#e06c75', fontFamily: MONO, fontSize: 12 }}>error: {error}</div>
  }

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 760 }}>
      {post && (
        <>
          <h1
            style={{
              fontSize: 26,
              margin: '0 0 8px',
              fontWeight: 600,
              letterSpacing: -0.4,
              lineHeight: 1.2,
              color: theme.ink,
            }}
          >
            {post.title}
          </h1>
          <div
            style={{
              display: 'flex',
              gap: 12,
              fontSize: 11,
              color: theme.dim,
              fontFamily: MONO,
              paddingBottom: 18,
              marginBottom: 24,
              borderBottom: `1px solid ${theme.rule}`,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>
              {post.date ||
                new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
            </span>
            {post.updatedAt && post.updatedAt !== post.publishedAt && (
              <>
                <span>·</span>
                <span>edited {new Date(post.updatedAt).toLocaleDateString()}</span>
              </>
            )}
            {(post.tags ?? []).length > 0 && (
              <>
                <span>·</span>
                {(post.tags ?? []).map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {loading ? (
        <div style={{ color: theme.dim, fontFamily: MONO, fontSize: 12 }}>loading...</div>
      ) : mediaType === 'text/html' ? (
        <iframe
          sandbox="allow-same-origin"
          srcDoc={body}
          style={{ width: '100%', minHeight: '40rem', border: 'none', borderRadius: 4 }}
          title="Post content"
        />
      ) : mediaType === 'text/plain' ? (
        <pre
          style={{
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.7,
            color: theme.ink,
          }}
        >
          {body}
        </pre>
      ) : (
        <MarkdownViewer value={body} />
      )}

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

export function PublicPostView({ postSlug, indexUrl: propIndexUrl, indexBasePath }: Props) {
  const [index, setIndex] = useState<GardenIndex | null>(null)
  const [post, setPost] = useState<GardenIndexEntry | null>(getHistoryEntry)
  const [body, setBody] = useState('')
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
        let fetchedIndex: GardenIndex | null = null

        if (indexUrl) {
          const res = await fetch(indexUrl)
          if (!res.ok) throw new Error(`Failed to load index (${res.status})`)
          fetchedIndex = (await res.json()) as GardenIndex
          if (!cancelled) {
            setIndex(fetchedIndex)
  
          }
        }

        if (!entry) {
          entry = fetchedIndex?.posts.find((p) => p.slug === postSlug) ?? null
          if (!entry) throw new Error('Post not found in index.')
        }

        if (!cancelled) setPost(entry)

        const bodyRes = await fetch(entry.contentUrl)
        if (!bodyRes.ok) throw new Error(`Failed to load post (${bodyRes.status})`)
        const rawBody = await bodyRes.text()
        if (!cancelled) setBody(rawBody)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load post')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [indexUrl, postSlug])

  const mediaType = inferMediaType(post?.mediaType, post?.contentUrl)

  return (
    <StackLayout
      index={index}
      indexUrl={indexUrl ?? null}
      indexBasePath={indexBasePath ?? null}
      currentSlug={postSlug}
    >
      <PostContent post={post} body={body} loading={loading} error={error} mediaType={mediaType} />
    </StackLayout>
  )
}

