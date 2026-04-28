import { useEffect, useMemo, useState } from 'react'
import { ConnectWidget } from './components/ConnectWidget'
import { MarkdownEditor } from './components/MarkdownEditor'
import { MediaPanel } from './components/MediaPanel'
import { SettingsView } from './components/SettingsView'
import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader } from './components/ui/card'
import { Input } from './components/ui/input'
import { deletePost, generateSlug, publishPost, unpublishPost } from './lib/gardenService'
import { parseMarkdownToPost } from './lib/markdown'
import { buildPublicHomeUrl, buildPublicPostUrl } from './lib/publicUrls'
import {
  clearCloudSharingCache,
  fetchWellKnownIndexUrl,
  isConnected,
  loadPublicIndexUrl,
  onConnected,
  onDisconnected,
  pullAllPostMeta,
  pullGardenSetting,
  pullIndex,
  pullPostMarkdown,
  removePostMarkdown,
  removePostMeta,
  storePostMarkdown,
  storePostMeta,
} from './lib/remotestorage'
import { matchRoute } from './lib/routes'
import type { GardenPostMeta } from './lib/schema'

function sortByUpdatedDescending(items: GardenPostMeta[]): GardenPostMeta[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function App() {
  const [path, setPath] = useState(window.location.pathname + window.location.search)
  const [urlPrefix, setUrlPrefix] = useState('')
  const [connected, setConnected] = useState(isConnected())
  const [view, setView] = useState<'posts' | 'settings'>('posts')
  const [items, setItems] = useState<GardenPostMeta[]>([])
  const [_selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const [slug, setSlug] = useState<string>('')
  const [originalSlug, setOriginalSlug] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [postDate, setPostDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<GardenPostMeta['status']>('draft')
  const [mediaType, setMediaType] = useState<'text/markdown' | 'text/html' | 'text/plain'>('text/markdown')
  const [originalMediaType, setOriginalMediaType] = useState<'text/markdown' | 'text/html' | 'text/plain'>(
    'text/markdown',
  )
  const [tagsInput, setTagsInput] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [blobUrlToResolved, setBlobUrlToResolved] = useState<Map<string, string>>(new Map())
  const [mobilePanel, setMobilePanel] = useState<'list' | 'editor'>('list')
  const [sidebarTab, setSidebarTab] = useState<'posts' | 'media'>('posts')

  const [publicIndexUrl, setPublicIndexUrl] = useState<string | null>(null)
  // undefined = still checking, null = not found, string = found
  const [wellKnownIndexUrl, setWellKnownIndexUrl] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function refreshList(): Promise<void> {
    const all = await pullAllPostMeta()
    setItems(sortByUpdatedDescending(all))
  }

  useEffect(() => {
    let cancelled = false

    const connectedHandler = () => {
      if (!cancelled) setConnected(true)
    }
    const disconnectedHandler = () => {
      if (!cancelled) {
        setConnected(false)
        clearCloudSharingCache()
      }
    }
    const popStateHandler = () => {
      if (!cancelled) setPath(window.location.pathname + window.location.search)
    }
    onConnected(connectedHandler)
    onDisconnected(disconnectedHandler)
    window.addEventListener('popstate', popStateHandler)

    void fetchWellKnownIndexUrl().then((u) => {
      if (!cancelled) setWellKnownIndexUrl(u)
    })

    void pullAllPostMeta()
      .then((all) => {
        if (!cancelled) setItems(sortByUpdatedDescending(all))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })

    void pullGardenSetting('title').then((t) => {
      if (!cancelled && t) document.title = t
    })

    void pullIndex().then((index) => {
      if (!cancelled && index?.urlPrefix) setUrlPrefix(index.urlPrefix)
    })

    return () => {
      cancelled = true
      window.removeEventListener('popstate', popStateHandler)
    }
  }, [])

  useEffect(() => {
    if (!connected) {
      setPublicIndexUrl(null)
      return
    }
    void loadPublicIndexUrl()
      .then(setPublicIndexUrl)
      .catch(() => setPublicIndexUrl(null))
  }, [connected])

  function loadPost(meta: GardenPostMeta): void {
    setSelectedSlug(meta.slug)
    setSlug(meta.slug)
    setOriginalSlug(meta.slug)
    setTitle(meta.title)
    setExcerpt(meta.excerpt)
    setStatus(meta.status)
    setPostDate(meta.publishedAt ? meta.publishedAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
    const mt = (meta.mediaType ?? 'text/markdown') as 'text/markdown' | 'text/html' | 'text/plain'
    setMediaType(mt)
    setOriginalMediaType(mt)
    setTagsInput(meta.tags?.join(', ') ?? '')
    setMessage('')
    setError('')

    void pullPostMarkdown(meta.slug, meta.mediaType)
      .then((content) => setBody(content ?? ''))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err))
      })
  }

  function clearEditor(): void {
    setSelectedSlug(null)
    setSlug('')
    setOriginalSlug(null)
    setTitle('')
    setExcerpt('')
    setBody('')
    setPostDate(new Date().toISOString().slice(0, 10))
    setStatus('draft')
    setMediaType('text/markdown')
    setOriginalMediaType('text/markdown')
    setTagsInput('')
    setError('')
    setMessage('')
  }

  const selectedMeta = useMemo(
    () => items.find((item) => item.slug === (originalSlug ?? slug)) ?? null,
    [items, originalSlug, slug],
  )

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      for (const t of item.tags ?? []) {
        set.add(t)
      }
    }
    return [...set].sort()
  }, [items])

  const visibleItems = useMemo(
    () => (tagFilter ? items.filter((item) => item.tags?.includes(tagFilter)) : items),
    [items, tagFilter],
  )

  const publicHomePageUrl = buildPublicHomeUrl(publicIndexUrl, urlPrefix || '', 'e2')

  const publicPostPageUrl = originalSlug
    ? buildPublicPostUrl(publicIndexUrl, urlPrefix || '', 'e2', originalSlug)
    : null

  const pathname = path.split('?')[0]
  const { render } = matchRoute(pathname, window.location.search, wellKnownIndexUrl)
  const routeResult = render() as ReturnType<typeof render>

  if (routeResult !== null) {
    return routeResult
  }

  async function saveDraft(): Promise<void> {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      const now = new Date().toISOString()
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      const parsed = parseMarkdownToPost(body)
      const resolvedTitle =
        mediaType === 'text/markdown' ? title.trim() || parsed.title || 'Untitled' : title.trim() || 'Untitled'
      const resolvedExcerpt = excerpt.trim() || parsed.excerpt
      const rawBody = mediaType === 'text/markdown' ? parsed.body : body.trim()
      let parsedBody = rawBody
      for (const [blobUrl, resolvedUrl] of blobUrlToResolved) {
        parsedBody = parsedBody.split(blobUrl).join(resolvedUrl)
      }

      const resolvedSlug = slug.trim()
        ? slug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : await generateSlug(resolvedTitle || 'untitled')

      const slugChanged = originalSlug !== null && resolvedSlug !== originalSlug
      const mediaTypeChanged = originalSlug !== null && mediaType !== originalMediaType

      const createdAt = selectedMeta?.createdAt ?? now
      const nextStatus = selectedMeta?.status ?? 'draft'
      const nextPublishedAt = postDate ? new Date(postDate).toISOString() : (selectedMeta?.publishedAt ?? null)
      const nextDeletedAt = selectedMeta?.deletedAt ?? null

      const meta: GardenPostMeta = {
        version: 1,
        slug: resolvedSlug,
        title: resolvedTitle,
        excerpt: resolvedExcerpt,
        ...(tags.length > 0 ? { tags } : {}),
        status: nextStatus,
        createdAt,
        updatedAt: now,
        publishedAt: nextPublishedAt,
        deletedAt: nextDeletedAt,
        ...(mediaType !== 'text/markdown' ? { mediaType } : {}),
      }

      const needsRename = (slugChanged || mediaTypeChanged) && originalSlug
      if (needsRename) {
        await storePostMeta(meta)
        await storePostMarkdown(resolvedSlug, parsedBody, mediaType)
        await removePostMarkdown(originalSlug, originalMediaType)
        if (slugChanged) await removePostMeta(originalSlug)
        if (nextStatus === 'published') {
          setMessage('Saved. Post was published — republish to update the public site.')
        } else {
          setMessage('Saved')
        }
      } else {
        await storePostMeta(meta)
        await storePostMarkdown(resolvedSlug, parsedBody, mediaType)
        setMessage('Saved')
      }

      setSlug(resolvedSlug)
      setOriginalSlug(resolvedSlug)
      setTitle(meta.title)
      setExcerpt(meta.excerpt)
      setBody(parsedBody)
      setStatus(meta.status)
      setOriginalMediaType(mediaType)
      setBlobUrlToResolved(new Map())
      await refreshList()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function runAction(action: 'publish' | 'unpublish' | 'delete'): Promise<void> {
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (!slug && !originalSlug) {
        throw new Error('Select or save a post first')
      }

      const activeSlug = originalSlug ?? slug

      if (action === 'publish') {
        await publishPost(activeSlug)
        setMessage('Post published')
        setStatus('published')
        void loadPublicIndexUrl().then(setPublicIndexUrl)
      } else if (action === 'unpublish') {
        await unpublishPost(activeSlug)
        setMessage('Post unpublished')
        setStatus('unpublished')
      } else if (action === 'delete') {
        const confirmed = window.confirm('Delete this post markdown and metadata?')
        if (!confirmed) return
        await deletePost(activeSlug)
        setMessage('Post deleted')
        clearEditor()
        setMobilePanel('list')
      }

      await refreshList()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 md:p-6 font-sans text-slate-900">
      <ConnectWidget />

      <header className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold md:text-3xl">Loam</h1>
          <nav className="flex flex-wrap gap-2">
            <Button variant={view === 'posts' ? 'default' : 'outline'} size="sm" onClick={() => setView('posts')}>
              Posts
            </Button>
            <Button variant={view === 'settings' ? 'default' : 'outline'} size="sm" onClick={() => setView('settings')}>
              Settings
            </Button>
            {publicHomePageUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={publicHomePageUrl} target="_blank" rel="noreferrer">
                  Public site
                </a>
              </Button>
            ) : null}
          </nav>
        </div>
        <p className="text-sm text-slate-600">
          <strong className="text-slate-900">{connected ? 'Connected' : 'Not connected'}</strong>.{' '}
          {connected
            ? 'Your posts sync to remote storage.'
            : 'Use the sync widget in the page corner if you want your site to be public.'}
        </p>
      </header>

      {view === 'settings' ? <SettingsView onSave={(prefix) => setUrlPrefix(prefix)} /> : null}

      <section className={`grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]${view === 'settings' ? ' hidden' : ''}`}>
        <Card className={mobilePanel === 'editor' ? 'hidden md:block' : ''}>
          <CardHeader>
            <div className="flex gap-3">
              <button
                type="button"
                className={`text-sm font-semibold ${sidebarTab === 'posts' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                onClick={() => setSidebarTab('posts')}
              >
                Posts
              </button>
              <button
                type="button"
                className={`text-sm font-semibold ${sidebarTab === 'media' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                onClick={() => setSidebarTab('media')}
              >
                Media
              </button>
            </div>
            {sidebarTab === 'posts' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearEditor()
                  setMobilePanel('editor')
                }}
              >
                New
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {sidebarTab === 'media' ? (
              <MediaPanel
                onInsert={(fragment, blobUrl, resolvedUrl) => {
                  setBody((prev) => (prev ? `${prev}\n${fragment}` : fragment))
                  if (blobUrl && resolvedUrl) {
                    setBlobUrlToResolved((prev) => new Map(prev).set(blobUrl, resolvedUrl))
                  }
                  setMobilePanel('editor')
                }}
              />
            ) : (
              <>
                {allTags.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                        className={`rounded-full px-2 py-0.5 text-xs transition-colors ${tagFilter === tag ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : null}
                {visibleItems.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    {items.length === 0 ? 'No posts yet.' : 'No posts with this tag.'}
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {visibleItems.map((item) => (
                    <li key={item.slug}>
                      <Button
                        variant="secondary"
                        className="h-auto w-full justify-start p-3 text-left"
                        onClick={() => {
                          loadPost(item)
                          setMobilePanel('editor')
                        }}
                      >
                        <div>
                          <div className="font-semibold">{item.title}</div>
                          <div className="text-xs text-slate-500">
                            {item.status} · {item.slug}
                          </div>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={mobilePanel === 'list' ? 'hidden md:block' : ''}>
          <CardContent className="space-y-4 pt-4">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-slate-500 md:hidden"
              onClick={() => setMobilePanel('list')}
            >
              ← Posts
            </button>
            <label className="grid gap-1 text-sm">
              <span className="font-medium">Title</span>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Slug</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="(autogenerated)" />
              <span className="text-xs text-slate-500">
                URL-friendly identifier. Leave empty to auto-generate from title.
              </span>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Excerpt</span>
              <Input value={excerpt} onChange={(event) => setExcerpt(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Tags</span>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tag1, tag2, tag3" />
              <span className="text-xs text-slate-500">Comma-separated.</span>
            </label>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Date</span>
              <Input type="date" value={postDate} onChange={(event) => setPostDate(event.target.value)} />
            </label>

            <fieldset className="grid gap-1 text-sm">
              <span className="font-medium">Format</span>
              <div className="flex gap-4">
                {(
                  [
                    ['text/markdown', 'Markdown'],
                    ['text/html', 'HTML'],
                    ['text/plain', 'Plain text'],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="mediaType"
                      value={value}
                      checked={mediaType === value}
                      onChange={() => setMediaType(value)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="text-xs text-slate-500">
                Controls how the body is rendered when published. Does not convert existing content.
              </span>
            </fieldset>

            <label className="grid gap-1 text-sm">
              <span className="font-medium">Body</span>
              <MarkdownEditor
                value={body}
                onChange={setBody}
                language={mediaType === 'text/markdown' ? 'markdown' : 'plaintext'}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void saveDraft()}>
                Save
              </Button>
              <span title={!connected ? 'Connect a remote storage provider to publish' : undefined}>
                <Button disabled={busy || !connected} variant="secondary" onClick={() => void runAction('publish')}>
                  Publish
                </Button>
              </span>
              <span title={!connected ? 'Connect a remote storage provider to unpublish' : undefined}>
                <Button disabled={busy || !connected} variant="secondary" onClick={() => void runAction('unpublish')}>
                  Unpublish
                </Button>
              </span>
              <Button disabled={busy} variant="destructive" onClick={() => void runAction('delete')}>
                Delete
              </Button>
              {publicPostPageUrl ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={publicPostPageUrl} target="_blank" rel="noreferrer">
                    Open public post page
                  </a>
                </Button>
              ) : null}
              <span className="ml-auto text-xs text-slate-500">Status: {status}</span>
            </div>

            {message ? <p className="text-sm text-green-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
