import { useEffect, useMemo, useState } from 'react'
import { ConnectWidget } from './components/ConnectWidget'
import { MarkdownEditor } from './components/MarkdownEditor'
import { MediaPanel } from './components/MediaPanel'
import { SettingsView } from './components/SettingsView'
import { StackLayout, useStackTheme } from './components/StackLayout'
import type { StackTheme } from './components/StackLayout'
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

const MONO = '"JetBrains Mono", ui-monospace, monospace'

function sortByUpdatedDescending(items: GardenPostMeta[]): GardenPostMeta[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

// ── Admin sidebar ─────────────────────────────────────────────────────────────

interface SidebarProps {
  theme: StackTheme
  items: GardenPostMeta[]
  allTags: string[]
  tagFilter: string | null
  setTagFilter: (t: string | null) => void
  activeSlug: string | null
  connected: boolean
  sidebarTab: 'posts' | 'media'
  setSidebarTab: (t: 'posts' | 'media') => void
  onNew: () => void
  onSelect: (item: GardenPostMeta) => void
  onSettings: () => void
  publicHomePageUrl: string | null
  view: 'posts' | 'settings'
}

function AdminSidebar({
  theme,
  items,
  allTags,
  tagFilter,
  setTagFilter,
  activeSlug,
  connected,
  sidebarTab,
  setSidebarTab,
  onNew,
  onSelect,
  onSettings,
  publicHomePageUrl,
  view,
}: SidebarProps) {
  const visibleItems = tagFilter ? items.filter((i) => i.tags?.includes(tagFilter)) : items

  return (
    <>
      {/* Tabs */}
      <div style={{ padding: '4px 6px', display: 'flex', gap: 2, borderBottom: `1px solid ${theme.rule}`, marginBottom: 4 }}>
        {(['posts', 'media'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setSidebarTab(tab)}
            style={{
              flex: 1,
              background: sidebarTab === tab ? theme.sel : 'none',
              border: 'none',
              cursor: 'pointer',
              color: sidebarTab === tab ? theme.ink : theme.dim,
              padding: '5px 8px',
              fontFamily: 'inherit',
              fontSize: 12,
              borderRadius: 3,
              textAlign: 'center',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {sidebarTab === 'media' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
          <MediaPanelWrapper theme={theme} />
        </div>
      ) : (
        <>
          {/* New post */}
          <div style={{ padding: '4px 6px' }}>
            <button
              type="button"
              onClick={onNew}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.ink,
                padding: '5px 8px',
                fontFamily: 'inherit',
                fontSize: 12,
                textAlign: 'left',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: theme.dim, width: 12 }}>+</span> New post
            </button>
          </div>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <div style={{ padding: '4px 14px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  style={{
                    background: tagFilter === tag ? theme.sel : 'none',
                    border: `1px solid ${tagFilter === tag ? theme.accent : theme.rule}`,
                    color: tagFilter === tag ? theme.accent : theme.dim,
                    padding: '1px 6px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontFamily: MONO,
                    fontSize: 10,
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Post list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 6px' }}>
            {visibleItems.length === 0 && (
              <div style={{ padding: '8px 8px', color: theme.dim, fontSize: 12 }}>
                {items.length === 0 ? 'No posts yet.' : 'No posts with this tag.'}
              </div>
            )}
            {visibleItems.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => onSelect(item)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  width: '100%',
                  background: activeSlug === item.slug ? theme.sel : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.ink,
                  padding: '5px 8px',
                  borderRadius: 3,
                  fontSize: 12,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: theme.dim, width: 12, flexShrink: 0, marginTop: 1 }}>
                  {item.status === 'published' ? '●' : item.status === 'draft' ? '○' : '·'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title || item.slug}
                  </div>
                  <div style={{ fontSize: 10, color: theme.dim, fontFamily: MONO, marginTop: 1 }}>{item.status}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom nav */}
          <div style={{ padding: '4px 6px', borderTop: `1px solid ${theme.rule}` }}>
            <button
              type="button"
              onClick={onSettings}
              style={{
                width: '100%',
                background: view === 'settings' ? theme.sel : 'none',
                border: 'none',
                cursor: 'pointer',
                color: view === 'settings' ? theme.ink : theme.dim,
                padding: '5px 8px',
                fontFamily: 'inherit',
                fontSize: 12,
                textAlign: 'left',
                borderRadius: 3,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ color: theme.dim, width: 12 }}>⚙</span> Settings
            </button>
            {publicHomePageUrl && (
              <a
                href={publicHomePageUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  color: theme.dim,
                  padding: '5px 8px',
                  fontSize: 12,
                  textDecoration: 'none',
                  borderRadius: 3,
                }}
              >
                <span style={{ width: 12 }}>↗</span> Public site
              </a>
            )}
            <div style={{ padding: '5px 8px', fontSize: 11, color: theme.dim, fontFamily: MONO, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? theme.accent2 : theme.dim, display: 'inline-block', flexShrink: 0 }} />
              {connected ? 'connected' : 'not connected'}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function MediaPanelWrapper({ theme }: { theme: StackTheme }) {
  return (
    <div style={{ color: theme.ink }}>
      <MediaPanelConsumer />
    </div>
  )
}

// A thin wrapper so MediaPanel can receive its onInsert from context set up by App
// We use a global callback ref to avoid prop-drilling through AdminSidebar
let _mediaPanelOnInsert: ((fragment: string, blobUrl?: string, resolvedUrl?: string) => void) | null = null

function MediaPanelConsumer() {
  return (
    <MediaPanel
      onInsert={(fragment, blobUrl, resolvedUrl) => {
        _mediaPanelOnInsert?.(fragment, blobUrl, resolvedUrl)
      }}
    />
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────

interface EditorProps {
  title: string
  setTitle: (v: string) => void
  slug: string
  setSlug: (v: string) => void
  excerpt: string
  setExcerpt: (v: string) => void
  tagsInput: string
  setTagsInput: (v: string) => void
  postDate: string
  setPostDate: (v: string) => void
  mediaType: 'text/markdown' | 'text/html' | 'text/plain'
  setMediaType: (v: 'text/markdown' | 'text/html' | 'text/plain') => void
  body: string
  setBody: (v: string) => void
  status: GardenPostMeta['status']
  busy: boolean
  message: string
  error: string
  connected: boolean
  publicPostPageUrl: string | null
  onBack: () => void
  onSave: () => void
  onPublish: () => void
  onUnpublish: () => void
  onDelete: () => void
}

function AdminEditor({
  title, setTitle, slug, setSlug, excerpt, setExcerpt,
  tagsInput, setTagsInput, postDate, setPostDate,
  mediaType, setMediaType, body, setBody,
  status, busy, message, error, connected, publicPostPageUrl,
  onBack, onSave, onPublish, onUnpublish, onDelete,
}: EditorProps) {
  const theme = useStackTheme()

  const fieldStyle = {
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${theme.rule}`,
    outline: 'none',
    color: theme.ink,
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '4px 0',
    width: '100%',
  }

  const labelStyle = {
    fontSize: 10,
    color: theme.dim,
    fontFamily: MONO,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 3,
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* Main editor area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 28px', minWidth: 0 }}>
        {/* Mobile back */}
        <button
          type="button"
          className="stack-menu-btn"
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: theme.dim, padding: '0 0 12px', fontFamily: MONO,
            fontSize: 11, textAlign: 'left',
          }}
        >
          ← posts
        </button>

        {/* Title */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          style={{
            width: '100%', background: 'none', border: 'none', outline: 'none',
            fontSize: 22, fontWeight: 600, color: theme.ink, fontFamily: 'inherit',
            padding: 0, marginBottom: 14, letterSpacing: -0.3,
          }}
        />

        {/* Metadata bar */}
        <div style={{
          fontSize: 11, color: theme.dim, marginBottom: 14,
          fontFamily: MONO, borderBottom: `1px solid ${theme.rule}`, paddingBottom: 10,
          display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span>---</span>
          <span style={{ color: theme.dim }}>status: <span style={{ color: status === 'published' ? theme.accent2 : theme.ink }}>{status}</span></span>
          {slug && <span style={{ color: theme.dim }}>slug: <span style={{ color: theme.ink }}>{slug}</span></span>}
          {tagsInput && <span style={{ color: theme.dim }}>tags: <span style={{ color: theme.ink }}>{tagsInput}</span></span>}
          <span>---</span>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <MarkdownEditor
            value={body}
            onChange={setBody}
            language={mediaType === 'text/markdown' ? 'markdown' : 'plaintext'}
          />
        </div>
      </div>

      {/* Right metadata panel */}
      <div style={{
        width: 240, flexShrink: 0,
        borderLeft: `1px solid ${theme.rule}`,
        padding: '20px 18px',
        background: theme.panel,
        display: 'flex', flexDirection: 'column', gap: 14,
        overflowY: 'auto',
      }} className="stack-meta-panel">
        <div>
          <div style={labelStyle}>slug</div>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto"
            style={{ ...fieldStyle, fontFamily: MONO, fontSize: 11 }}
          />
        </div>

        <div>
          <div style={labelStyle}>excerpt</div>
          <input
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            style={fieldStyle}
          />
        </div>

        <div>
          <div style={labelStyle}>tags</div>
          <input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="tag1, tag2"
            style={fieldStyle}
          />
        </div>

        <div>
          <div style={labelStyle}>date</div>
          <input
            type="date"
            value={postDate}
            onChange={(e) => setPostDate(e.target.value)}
            style={{ ...fieldStyle, fontFamily: MONO, fontSize: 11, colorScheme: 'dark' }}
          />
        </div>

        <div>
          <div style={labelStyle}>format</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(['text/markdown', 'text/html', 'text/plain'] as const).map((v) => (
              <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: mediaType === v ? theme.ink : theme.dim }}>
                <input
                  type="radio"
                  name="mediaType"
                  value={v}
                  checked={mediaType === v}
                  onChange={() => setMediaType(v)}
                  style={{ accentColor: theme.accent }}
                />
                {v.replace('text/', '')}
              </label>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <ActionBtn theme={theme} onClick={onSave} disabled={busy} primary>
            save
          </ActionBtn>
          <ActionBtn theme={theme} onClick={onPublish} disabled={busy || !connected}>
            publish
          </ActionBtn>
          <ActionBtn theme={theme} onClick={onUnpublish} disabled={busy || !connected}>
            unpublish
          </ActionBtn>
          <ActionBtn theme={theme} onClick={onDelete} disabled={busy} danger>
            delete
          </ActionBtn>
          {publicPostPageUrl && (
            <a
              href={publicPostPageUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'block', textAlign: 'center', fontSize: 11,
                color: theme.accent, textDecoration: 'none', fontFamily: MONO,
                padding: '4px 0', borderTop: `1px solid ${theme.rule}`, marginTop: 2,
              }}
            >
              ↗ open public post
            </a>
          )}
        </div>

        {message && (
          <div style={{ fontSize: 11, color: theme.accent2, fontFamily: MONO }}>{message}</div>
        )}
        {error && (
          <div style={{ fontSize: 11, color: '#e06c75', fontFamily: MONO }}>{error}</div>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  theme, onClick, disabled, children, primary, danger,
}: {
  theme: StackTheme
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        background: primary ? theme.accent : danger ? 'none' : theme.panel2,
        color: primary ? theme.bg : danger ? '#e06c75' : theme.ink,
        border: danger ? `1px solid #e06c75` : 'none',
        padding: '7px',
        borderRadius: 3,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12,
        fontFamily: 'inherit',
        fontWeight: primary ? 600 : 400,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [path, setPath] = useState(window.location.pathname + window.location.search)
  const [urlPrefix, setUrlPrefix] = useState('')
  const [connected, setConnected] = useState(isConnected())
  const [view, setView] = useState<'posts' | 'settings'>('posts')
  const [items, setItems] = useState<GardenPostMeta[]>([])

  const [slug, setSlug] = useState<string>('')
  const [originalSlug, setOriginalSlug] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [body, setBody] = useState('')
  const [postDate, setPostDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<GardenPostMeta['status']>('draft')
  const [mediaType, setMediaType] = useState<'text/markdown' | 'text/html' | 'text/plain'>('text/markdown')
  const [originalMediaType, setOriginalMediaType] = useState<'text/markdown' | 'text/html' | 'text/plain'>('text/markdown')
  const [tagsInput, setTagsInput] = useState<string>('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [blobUrlToResolved, setBlobUrlToResolved] = useState<Map<string, string>>(new Map())
  const [sidebarTab, setSidebarTab] = useState<'posts' | 'media'>('posts')

  const [publicIndexUrl, setPublicIndexUrl] = useState<string | null>(null)
  const [wellKnownIndexUrl, setWellKnownIndexUrl] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Wire media panel insert callback
  _mediaPanelOnInsert = (fragment, blobUrl, resolvedUrl) => {
    setBody((prev) => (prev ? `${prev}\n${fragment}` : fragment))
    if (blobUrl && resolvedUrl) {
      setBlobUrlToResolved((prev) => new Map(prev).set(blobUrl, resolvedUrl))
    }
    setSidebarTab('posts')
  }

  async function refreshList(): Promise<void> {
    const all = await pullAllPostMeta()
    setItems(sortByUpdatedDescending(all))
  }

  useEffect(() => {
    let cancelled = false
    const connectedHandler = () => { if (!cancelled) setConnected(true) }
    const disconnectedHandler = () => { if (!cancelled) { setConnected(false); clearCloudSharingCache() } }
    const popStateHandler = () => { if (!cancelled) setPath(window.location.pathname + window.location.search) }
    onConnected(connectedHandler)
    onDisconnected(disconnectedHandler)
    window.addEventListener('popstate', popStateHandler)

    void fetchWellKnownIndexUrl().then((u) => { if (!cancelled) setWellKnownIndexUrl(u) })
    void pullAllPostMeta()
      .then((all) => { if (!cancelled) setItems(sortByUpdatedDescending(all)) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : String(err)) })
    void pullGardenSetting('title').then((t) => { if (!cancelled && t) document.title = t })
    void pullIndex().then((index) => { if (!cancelled && index?.urlPrefix) setUrlPrefix(index.urlPrefix) })

    return () => { cancelled = true; window.removeEventListener('popstate', popStateHandler) }
  }, [])

  useEffect(() => {
    if (!connected) { setPublicIndexUrl(null); return }
    void loadPublicIndexUrl().then(setPublicIndexUrl).catch(() => setPublicIndexUrl(null))
  }, [connected])

  function loadPost(meta: GardenPostMeta): void {
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
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : String(err)) })
  }

  function clearEditor(): void {
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
      for (const t of item.tags ?? []) set.add(t)
    }
    return [...set].sort()
  }, [items])

  const publicHomePageUrl = buildPublicHomeUrl(publicIndexUrl, urlPrefix || '', 'e2')
  const publicPostPageUrl = originalSlug
    ? buildPublicPostUrl(publicIndexUrl, urlPrefix || '', 'e2', originalSlug)
    : null

  const pathname = path.split('?')[0]
  const { render } = matchRoute(pathname, window.location.search, wellKnownIndexUrl)
  const routeResult = render() as ReturnType<typeof render>
  if (routeResult !== null) return routeResult

  async function saveDraft(): Promise<void> {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const now = new Date().toISOString()
      const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean)
      const parsed = parseMarkdownToPost(body)
      const resolvedTitle = mediaType === 'text/markdown'
        ? title.trim() || parsed.title || 'Untitled'
        : title.trim() || 'Untitled'
      const resolvedExcerpt = excerpt.trim() || parsed.excerpt
      const rawBody = mediaType === 'text/markdown' ? parsed.body : body.trim()
      let parsedBody = rawBody
      for (const [blobUrl, resolvedUrl] of blobUrlToResolved) {
        parsedBody = parsedBody.split(blobUrl).join(resolvedUrl)
      }
      const resolvedSlug = slug.trim()
        ? slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
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
        setMessage(nextStatus === 'published' ? 'Saved. Republish to update public site.' : 'Saved')
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
      if (!slug && !originalSlug) throw new Error('Select or save a post first')
      const activeSlug = originalSlug ?? slug
      if (action === 'publish') {
        await publishPost(activeSlug)
        setMessage('Published')
        setStatus('published')
        void loadPublicIndexUrl().then(setPublicIndexUrl)
      } else if (action === 'unpublish') {
        await unpublishPost(activeSlug)
        setMessage('Unpublished')
        setStatus('unpublished')
      } else if (action === 'delete') {
        if (!window.confirm('Delete this post?')) return
        await deletePost(activeSlug)
        setMessage('Deleted')
        clearEditor()
      }
      await refreshList()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const currentSlug = view === 'settings' ? null : (originalSlug ?? (slug || null))
  const viewLabel = busy ? 'BUSY' : view === 'settings' ? 'PREFS' : originalSlug ? 'NORMAL' : 'INSERT'
  const breadcrumbBase = '~/write'

  return (
    <>
      <ConnectWidget />
      <StackLayout
        currentSlug={view === 'settings' ? undefined : currentSlug ?? undefined}
        viewLabel={viewLabel}
        basePath={breadcrumbBase}
        sidebarContent={
          <AdminSidebarWithTheme
            items={items}
            allTags={allTags}
            tagFilter={tagFilter}
            setTagFilter={setTagFilter}
            activeSlug={currentSlug}
            connected={connected}
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            onNew={() => { clearEditor(); setView('posts') }}
            onSelect={(item) => { loadPost(item); setView('posts') }}
            onSettings={() => setView('settings')}
            publicHomePageUrl={publicHomePageUrl}
            view={view}
          />
        }
      >
        {view === 'settings' ? (
          <SettingsView onSave={(prefix) => setUrlPrefix(prefix)} />
        ) : (
          <AdminEditor
            title={title} setTitle={setTitle}
            slug={slug} setSlug={setSlug}
            excerpt={excerpt} setExcerpt={setExcerpt}
            tagsInput={tagsInput} setTagsInput={setTagsInput}
            postDate={postDate} setPostDate={setPostDate}
            mediaType={mediaType} setMediaType={setMediaType}
            body={body} setBody={setBody}
            status={status}
            busy={busy}
            message={message}
            error={error}
            connected={connected}
            publicPostPageUrl={publicPostPageUrl}
            onBack={clearEditor}
            onSave={() => void saveDraft()}
            onPublish={() => void runAction('publish')}
            onUnpublish={() => void runAction('unpublish')}
            onDelete={() => void runAction('delete')}
          />
        )}
      </StackLayout>
    </>
  )
}

// Thin wrapper to access theme from context (StackLayout provides it)
function AdminSidebarWithTheme(props: Omit<SidebarProps, 'theme'>) {
  const theme = useStackTheme()
  return <AdminSidebar theme={theme} {...props} />
}
