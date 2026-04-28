import { createContext, useContext, useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { navigate } from '../lib/navigate'
import { buildBackLinkUrl, buildPostLinkUrl } from '../lib/publicUrls'
import type { GardenIndex, GardenIndexEntry } from '../lib/schema'

export type StackTheme = {
  bg: string
  panel: string
  panel2: string
  ink: string
  dim: string
  faint: string
  accent: string
  accent2: string
  rule: string
  sel: string
}

export const DARK: StackTheme = {
  bg: '#0e1014',
  panel: '#13161c',
  panel2: '#191d25',
  ink: '#dde2ec',
  dim: '#6b7585',
  faint: '#2a3140',
  accent: '#7aa2f7',
  accent2: '#9ece6a',
  rule: '#1d222b',
  sel: '#1f2a3d',
}

export const LIGHT: StackTheme = {
  bg: '#fbfbfa',
  panel: '#f3f3f0',
  panel2: '#ebebe7',
  ink: '#1a1c20',
  dim: '#6f7480',
  faint: '#d8d8d2',
  accent: '#3b6dd9',
  accent2: '#3a6e1d',
  rule: '#e1e1dc',
  sel: '#dfe8f7',
}

export const StackThemeContext = createContext<StackTheme>(DARK)

export function useStackTheme(): StackTheme {
  return useContext(StackThemeContext)
}

const MONO = '"JetBrains Mono", ui-monospace, monospace'

interface Props {
  index?: GardenIndex | null
  indexUrl?: string | null
  indexBasePath?: string | null
  currentSlug?: string | null
  /** Replaces the default nav+post-list section in the sidebar */
  sidebarContent?: ReactNode
  /** Status bar left label — default "NORMAL" */
  viewLabel?: string
  /** Breadcrumb base — default "~/{siteTitle}" */
  basePath?: string
  children: ReactNode
}

export function StackLayout({
  index,
  indexUrl,
  indexBasePath,
  currentSlug = null,
  sidebarContent,
  viewLabel = 'NORMAL',
  basePath,
  children,
}: Props) {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('loam-theme') !== 'light'
    } catch {
      return true
    }
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const theme = dark ? DARK : LIGHT

  useEffect(() => {
    try {
      localStorage.setItem('loam-theme', dark ? 'dark' : 'light')
    } catch {}
  }, [dark])

  const urlEncoding = index?.urlEncoding ?? 'e2'
  const siteLabel = index?.title ?? 'garden'
  const breadcrumbBase = basePath ?? `~/${siteLabel}`
  const recentPosts = index?.posts.slice(0, 5) ?? []

  const allTags = (() => {
    if (!index) return []
    const s = new Set<string>()
    for (const p of index.posts) {
      for (const t of p.tags ?? []) s.add(t)
    }
    return [...s].sort()
  })()

  function goIndex() {
    navigate(buildBackLinkUrl(indexUrl ?? null, indexBasePath ?? null, urlEncoding))
    setSidebarOpen(false)
  }

  function goPost(post: GardenIndexEntry) {
    navigate(buildPostLinkUrl(indexUrl ?? null, indexBasePath ?? null, urlEncoding, post.slug), { entry: post })
    setSidebarOpen(false)
  }

  const isIndex = currentSlug == null

  const cssVars = {
    '--stack-bg': theme.bg,
    '--stack-panel': theme.panel,
    '--stack-panel2': theme.panel2,
    '--stack-ink': theme.ink,
    '--stack-dim': theme.dim,
    '--stack-faint': theme.faint,
    '--stack-accent': theme.accent,
    '--stack-accent2': theme.accent2,
    '--stack-rule': theme.rule,
    '--stack-sel': theme.sel,
  } as CSSProperties

  return (
    <StackThemeContext.Provider value={theme}>
      <div
        data-theme={dark ? 'dark' : 'light'}
        style={{
          ...cssVars,
          width: '100%',
          height: '100vh',
          background: theme.bg,
          color: theme.ink,
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: 13,
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {sidebarOpen && <div className="stack-overlay" onClick={() => setSidebarOpen(false)} />}

        {/* Sidebar */}
        <div
          className={`stack-sidebar${sidebarOpen ? ' open' : ''}`}
          style={{ background: theme.panel, borderRight: `1px solid ${theme.rule}` }}
        >
          {/* Header */}
          <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 3,
                background: theme.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.bg,
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              §
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: -0.1,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {siteLabel}
            </div>
            <button
              type="button"
              onClick={() => setDark(!dark)}
              style={{ background: 'none', border: 'none', color: theme.dim, cursor: 'pointer', fontSize: 12, padding: 4 }}
            >
              {dark ? '☀' : '☾'}
            </button>
          </div>

          {/* Search hint */}
          <div style={{ padding: '0 10px 8px' }}>
            <div
              style={{
                background: theme.panel2,
                padding: '5px 8px',
                borderRadius: 3,
                fontSize: 12,
                color: theme.dim,
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                fontFamily: MONO,
              }}
            >
              <span>⌘K</span>
              <span style={{ color: theme.faint }}>·</span>
              <span>find or create</span>
            </div>
          </div>

          {sidebarContent ?? (
            <>
              {/* Nav */}
              <div style={{ padding: '4px 6px' }}>
                <button
                  type="button"
                  onClick={goIndex}
                  style={{
                    width: '100%',
                    background: isIndex ? theme.sel : 'none',
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
                  <span style={{ color: theme.dim, width: 12 }}>≡</span>
                  All posts
                  <span style={{ flex: 1 }} />
                  {index && (
                    <span style={{ color: theme.dim, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>
                      {index.posts.length}
                    </span>
                  )}
                </button>
              </div>

              {recentPosts.length > 0 && (
                <SidebarSection theme={theme} title="recent">
                  {recentPosts.map((p) => (
                    <SidebarRow
                      key={p.slug}
                      theme={theme}
                      active={currentSlug === p.slug}
                      onClick={() => goPost(p)}
                      icon="·"
                      label={p.title}
                    />
                  ))}
                </SidebarSection>
              )}

              {allTags.length > 0 && (
                <SidebarSection theme={theme} title="tags">
                  {allTags.map((t) => (
                    <SidebarRow key={t} theme={theme} active={false} onClick={goIndex} icon="#" label={t} mono />
                  ))}
                </SidebarSection>
              )}
            </>
          )}

          <div style={{ flex: 1 }} />

          <div
            style={{
              padding: '10px 14px',
              borderTop: `1px solid ${theme.rule}`,
              color: theme.dim,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: MONO,
            }}
          >
            <span style={{ color: theme.accent2 }}>●</span>
            <span>main</span>
            <span style={{ flex: 1 }} />
            {index && <span>{index.posts.length} posts</span>}
          </div>
        </div>

        {/* Main */}
        <div className="stack-main" style={{ background: theme.bg }}>
          {/* Breadcrumb */}
          <div
            style={{
              padding: '8px 18px',
              borderBottom: `1px solid ${theme.rule}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: theme.dim,
              flexShrink: 0,
              fontFamily: MONO,
            }}
          >
            <button
              type="button"
              className="stack-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.dim,
                padding: '0 8px 0 0',
                fontFamily: 'inherit',
                fontSize: 14,
              }}
            >
              ☰
            </button>
            <button
              type="button"
              onClick={goIndex}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: theme.dim,
                padding: 0,
                fontFamily: 'inherit',
                fontSize: 11,
              }}
            >
              {breadcrumbBase}
            </button>
            {currentSlug && (
              <>
                <span style={{ color: theme.faint }}>/</span>
                <span style={{ color: theme.ink }}>{currentSlug}.md</span>
              </>
            )}
            <div style={{ flex: 1 }} />
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>

          {/* Status bar */}
          <div
            style={{
              borderTop: `1px solid ${theme.rule}`,
              padding: '5px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 11,
              color: theme.dim,
              fontFamily: MONO,
              background: theme.panel,
              flexShrink: 0,
            }}
          >
            <span style={{ color: theme.accent2 }}>●</span>
            <span>{viewLabel}</span>
            <span>{currentSlug ? `${currentSlug}.md` : breadcrumbBase}</span>
            <div style={{ flex: 1 }} />
            {!isIndex && (
              <>
                <span>md</span>
                <span>utf-8</span>
              </>
            )}
          </div>
        </div>
      </div>
    </StackThemeContext.Provider>
  )
}

function SidebarSection({ theme, title, children }: { theme: StackTheme; title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          padding: '4px 14px',
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: theme.dim,
          fontWeight: 600,
        }}
      >
        {title}
      </div>
      <div style={{ padding: '0 6px' }}>{children}</div>
    </div>
  )
}

function SidebarRow({
  theme,
  active,
  onClick,
  icon,
  label,
  mono,
}: {
  theme: StackTheme
  active: boolean
  onClick: () => void
  icon: string
  label: string
  mono?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        background: active ? theme.sel : 'none',
        border: 'none',
        cursor: 'pointer',
        color: theme.ink,
        padding: '4px 8px',
        borderRadius: 3,
        fontFamily: mono ? MONO : 'inherit',
        fontSize: 12,
        textAlign: 'left',
      }}
    >
      <span style={{ color: theme.dim, width: 12, flexShrink: 0, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}
