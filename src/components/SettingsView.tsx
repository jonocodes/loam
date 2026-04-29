import { useEffect, useState } from 'react'
import { rebuildIndex, saveSiteSettings } from '../lib/gardenService'
import { encodeIndexToken } from '../lib/indexToken'
import {
  checkDropboxSharingAccess,
  getGardenSettingsUrl,
  loadPublicIndexUrl,
  pullAllPostMeta,
  pullGardenSetting,
  pullIndex,
  resolvePublicFeedAtomUrl,
  resolvePublicFeedUrl,
} from '../lib/remotestorage'
import type { GardenPostMeta, PostTypeConfig } from '../lib/schema'
import { DEFAULT_POST_TYPES } from '../lib/schema'
import { useStackTheme } from './StackLayout'

const MONO = '"JetBrains Mono", ui-monospace, monospace'

interface Props {
  onSave?: (urlPrefix: string) => void
}

export function SettingsView({ onSave }: Props = {}) {
  const theme = useStackTheme()
  const [title, setTitle] = useState('')
  const [tagline, setTagline] = useState('')
  const [urlPrefix, setUrlPrefix] = useState('')
  const [urlEncoding, setUrlEncoding] = useState<'e1' | 'e2'>('e2')
  const [postTypes, setPostTypes] = useState<PostTypeConfig[]>(DEFAULT_POST_TYPES)
  const [homeSlug, setHomeSlug] = useState('')
  const [homeCandidates, setHomeCandidates] = useState<GardenPostMeta[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [publicIndexUrl, setPublicIndexUrl] = useState<string | null>(null)
  const [publicFeedUrl, setPublicFeedUrl] = useState<string | null>(null)
  const [publicFeedAtomUrl, setPublicFeedAtomUrl] = useState<string | null>(null)
  const [dropboxSharingWarning, setDropboxSharingWarning] = useState<string | null>(null)
  const gardenSettingsUrl = getGardenSettingsUrl()

  useEffect(() => {
    void Promise.all([
      pullGardenSetting('title').catch(() => null),
      pullGardenSetting('tagline').catch(() => null),
      pullIndex().catch(() => null),
      pullAllPostMeta().catch(() => [] as GardenPostMeta[]),
      loadPublicIndexUrl().catch(() => null),
      resolvePublicFeedUrl().catch(() => null),
      resolvePublicFeedAtomUrl().catch(() => null),
      checkDropboxSharingAccess().catch(() => null),
    ]).then(([t, tl, index, allMeta, indexUrl, feedUrl, atomUrl, sharingWarning]) => {
      if (t) setTitle(t)
      if (tl) setTagline(tl)
      if (index?.urlPrefix) setUrlPrefix(index.urlPrefix)
      if (index?.urlEncoding) setUrlEncoding(index.urlEncoding)
      if (index?.postTypes) setPostTypes(index.postTypes)
      if (index?.homeSlug) setHomeSlug(index.homeSlug)
      setHomeCandidates(allMeta.filter((p) => p.status !== 'deleted'))
      setPublicIndexUrl(indexUrl ?? null)
      setPublicFeedUrl(feedUrl ?? null)
      setPublicFeedAtomUrl(atomUrl ?? null)
      setDropboxSharingWarning(sharingWarning)
    })
  }, [])

  async function handleSave(): Promise<void> {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const validTypes = postTypes.filter((t) => t.name.trim())
      await saveSiteSettings(title, tagline, urlPrefix, urlEncoding, validTypes, homeSlug || undefined)
      if (title) document.title = title
      onSave?.(urlPrefix)
      setMessage('Settings saved')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleRebuild(): Promise<void> {
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await rebuildIndex()
      setMessage('Index rebuilt')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function moveType(i: number, dir: -1 | 1) {
    setPostTypes((prev) => {
      const next = [...prev]
      ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
      return next
    })
  }

  const fieldStyle = {
    background: theme.panel2,
    border: `1px solid ${theme.rule}`,
    outline: 'none',
    color: theme.ink,
    fontFamily: 'inherit',
    fontSize: 12,
    padding: '6px 10px',
    borderRadius: 3,
    width: '100%',
  }

  const labelStyle = {
    fontSize: 10,
    color: theme.dim,
    fontFamily: MONO,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
    display: 'block',
  }

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  }

  const iconBtnStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.dim,
    fontSize: 14,
    padding: '0 3px',
    lineHeight: 1,
    fontFamily: MONO,
  }

  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 560 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 24px', letterSpacing: -0.2, color: theme.ink }}>
        Settings
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={sectionStyle}>
          <span style={labelStyle}>Site title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My Garden" style={fieldStyle} />
        </div>

        <div style={sectionStyle}>
          <span style={labelStyle}>Tagline</span>
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="A short description"
            style={fieldStyle}
          />
        </div>

        <div style={sectionStyle}>
          <span style={labelStyle}>Home page</span>
          <select
            value={homeSlug}
            onChange={(e) => setHomeSlug(e.target.value)}
            style={{ ...fieldStyle, fontFamily: MONO, fontSize: 11, cursor: 'pointer' }}
          >
            <option value="">— show index —</option>
            {homeCandidates.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title || p.slug}
                {p.status !== 'published' ? ` (${p.status})` : ''}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 11, color: theme.dim, fontFamily: MONO }}>
            post to show when visitors arrive at your site
          </span>
        </div>

        <div style={sectionStyle}>
          <span style={labelStyle}>URL prefix</span>
          <input
            value={urlPrefix}
            onChange={(e) => setUrlPrefix(e.target.value)}
            placeholder="yourname"
            style={fieldStyle}
          />
          <span style={{ fontSize: 11, color: theme.dim, fontFamily: MONO }}>
            appears in public URLs: /p/<em>{urlPrefix || 'yourname'}</em>/…
          </span>
        </div>

        <div style={sectionStyle}>
          <span style={labelStyle}>URL encoding</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(
              [
                ['e2', 'e2 — Base64 URL-safe (default)'],
                ['e1', 'e1 — Plain URL encoding'],
              ] as const
            ).map(([val, label]) => (
              <label
                key={val}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: urlEncoding === val ? theme.ink : theme.dim,
                }}
              >
                <input
                  type="radio"
                  name="urlEncoding"
                  value={val}
                  checked={urlEncoding === val}
                  onChange={() => setUrlEncoding(val)}
                  style={{ accentColor: theme.accent }}
                />
                <span style={{ fontFamily: MONO }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Post types */}
        <div style={sectionStyle}>
          <span style={labelStyle}>Post types</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {postTypes.map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  value={pt.name}
                  onChange={(e) => setPostTypes((prev) => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                  placeholder="type name"
                  style={{ ...fieldStyle, flex: 1, width: 'auto', padding: '4px 8px' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: pt.isDefault ? theme.ink : theme.dim, fontFamily: MONO, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }} title="default type for new posts">
                  <input
                    type="radio"
                    name="defaultType"
                    checked={pt.isDefault}
                    onChange={() => setPostTypes((prev) => prev.map((p, j) => ({ ...p, isDefault: j === i })))}
                    style={{ accentColor: theme.accent }}
                  />
                  default
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.dim, fontFamily: MONO, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={pt.showInSidebar}
                    onChange={(e) => setPostTypes((prev) => prev.map((p, j) => j === i ? { ...p, showInSidebar: e.target.checked } : p))}
                    style={{ accentColor: theme.accent }}
                  />
                  sidebar
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: theme.dim, fontFamily: MONO, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <input
                    type="checkbox"
                    checked={pt.hideTitle}
                    onChange={(e) => setPostTypes((prev) => prev.map((p, j) => j === i ? { ...p, hideTitle: e.target.checked } : p))}
                    style={{ accentColor: theme.accent }}
                  />
                  hide title
                </label>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => moveType(i, -1)}
                  style={{ ...iconBtnStyle, opacity: i === 0 ? 0.3 : 1 }}
                >↑</button>
                <button
                  type="button"
                  disabled={i === postTypes.length - 1}
                  onClick={() => moveType(i, 1)}
                  style={{ ...iconBtnStyle, opacity: i === postTypes.length - 1 ? 0.3 : 1 }}
                >↓</button>
                <button
                  type="button"
                  onClick={() => setPostTypes((prev) => prev.filter((_, j) => j !== i))}
                  style={{ ...iconBtnStyle, color: '#e06c75' }}
                >×</button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPostTypes((prev) => [...prev, { name: '', showInSidebar: true, isDefault: false, hideTitle: false }])}
              style={{
                background: 'none',
                border: `1px dashed ${theme.rule}`,
                color: theme.dim,
                padding: '4px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                fontSize: 11,
                fontFamily: MONO,
                textAlign: 'left' as const,
              }}
            >
              + add type
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleSave()}
            style={{
              background: theme.accent,
              color: theme.bg,
              border: 'none',
              padding: '7px 16px',
              borderRadius: 3,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
              fontWeight: 600,
              opacity: busy ? 0.5 : 1,
            }}
          >
            save settings
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRebuild()}
            style={{
              background: theme.panel2,
              color: theme.ink,
              border: `1px solid ${theme.rule}`,
              padding: '7px 16px',
              borderRadius: 3,
              cursor: busy ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
              opacity: busy ? 0.5 : 1,
            }}
          >
            rebuild index
          </button>
        </div>

        {message && <div style={{ fontSize: 12, color: theme.accent2, fontFamily: MONO }}>{message}</div>}
        {error && <div style={{ fontSize: 12, color: '#e06c75', fontFamily: MONO }}>{error}</div>}
        {dropboxSharingWarning && (
          <div
            style={{
              fontSize: 11,
              color: '#e5c07b',
              fontFamily: MONO,
              background: theme.panel2,
              border: `1px solid ${theme.rule}`,
              borderRadius: 4,
              padding: '8px 10px',
            }}
          >
            {dropboxSharingWarning}
          </div>
        )}

        {/* Public site info */}
        {publicIndexUrl &&
          (() => {
            const token = encodeIndexToken(publicIndexUrl, urlEncoding)
            const siteUrl = `${window.location.origin}/p/${urlPrefix || 'garden'}/${token}`
            const maskedUrl = `${window.location.origin}/?index=${encodeURIComponent(publicIndexUrl)}`
            return (
              <div
                style={{
                  background: theme.panel2,
                  border: `1px solid ${theme.rule}`,
                  borderRadius: 4,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>your public site</div>
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      color: theme.accent,
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      wordBreak: 'break-all',
                    }}
                  >
                    {siteUrl}
                  </a>
                </div>
                <div>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>url-param version (domain masking)</div>
                  <a
                    href={maskedUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 11,
                      color: theme.dim,
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      wordBreak: 'break-all',
                      fontFamily: MONO,
                    }}
                  >
                    {maskedUrl}
                  </a>
                </div>
              </div>
            )
          })()}

        {/* Dev links */}
        {(publicIndexUrl || publicFeedUrl || publicFeedAtomUrl || gardenSettingsUrl) && (
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTop: `1px solid ${theme.rule}` }}
          >
            {[
              [publicIndexUrl, 'index.json'],
              [publicFeedUrl, 'feed.json'],
              [publicFeedAtomUrl, 'feed.atom'],
              [gardenSettingsUrl, 'garden.json'],
            ]
              .flatMap(([url, label]) => (url ? [{ url, label }] : []))
              .map(({ url, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: 11,
                    color: theme.dim,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    fontFamily: MONO,
                  }}
                >
                  {label}
                </a>
              ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            paddingTop: 12,
            borderTop: `1px solid ${theme.rule}`,
            fontSize: 11,
            color: theme.dim,
            fontFamily: MONO,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <span>
            powered by{' '}
            <a
              href="https://github.com/jonocodes/loam"
              target="_blank"
              rel="noreferrer"
              style={{ color: theme.accent, textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              loam
            </a>
          </span>
          <span>deployed {new Date(__BUILD_TIME__).toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
