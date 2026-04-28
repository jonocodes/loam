// Direction 4: LOAM — the merge.
// Stack's spatial discipline (sidebar, breadcrumb, status) +
// Field's warmth (bold display, warm palette, tag pills, backlinks-as-context).
// Type: Inter for UI, EB Garamond italic accents for the wordmark + section heads,
// JetBrains Mono for metadata.
// Mobile: drawer pattern (hamburger → slide-out) on phone widths.

function LoamApp({ initialView = 'index', mobile = false, mobileDrawer = 'drawer' }) {
  // mobileDrawer: 'drawer' (slide-out) or 'tabs' (bottom tab bar)
  const [view, setView] = React.useState(initialView);
  const [noteId, setNoteId] = React.useState(window.NOTES[0].id);
  const [dark, setDark] = React.useState(false);
  const [activeTag, setActiveTag] = React.useState(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const note = window.NOTES.find((n) => n.id === noteId) || window.NOTES[0];
  const open = (id) => { setNoteId(id); setView('note'); setDrawerOpen(false); };

  const theme = dark
    ? { bg: '#161310', panel: '#1d1915', panel2: '#252019', ink: '#ede5d3', dim: '#8e8472', faint: '#3a3326', accent: '#d18a4a', accent2: '#9bb574', rule: '#2a2520', tag: '#2a2520', sel: '#2a2218' }
    : { bg: '#f8f3e6', panel: '#f1eada', panel2: '#ffffff', ink: '#1c1812', dim: '#6f6451', faint: '#d7cdb1', accent: '#b85d2a', accent2: '#5a7237', rule: '#e2d8bb', tag: '#ece2c5', sel: '#e8dcb8' };

  if (mobile) {
    return <LoamMobile theme={theme} dark={dark} setDark={setDark} view={view} setView={setView}
      noteId={noteId} note={note} onOpen={open} activeTag={activeTag} setActiveTag={setActiveTag}
      drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} drawerKind={mobileDrawer} />;
  }

  return (
    <div style={{
      width: '100%', height: '100%', background: theme.bg, color: theme.ink,
      fontFamily: '"Inter", system-ui, sans-serif', fontSize: 14,
      display: 'flex', overflow: 'hidden',
    }}>
      <LoamSidebar theme={theme} dark={dark} setDark={setDark} view={view} setView={setView}
        onOpen={open} noteId={noteId} activeTag={activeTag} setActiveTag={setActiveTag} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <LoamCrumb theme={theme} view={view} note={note} setView={setView} activeTag={activeTag} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'index' && <LoamIndex theme={theme} onOpen={open} activeTag={activeTag} setActiveTag={setActiveTag} />}
          {view === 'note'  && <LoamNote  theme={theme} note={note} onOpen={open} setActiveTag={(t) => { setActiveTag(t); setView('index'); }} />}
          {view === 'edit'  && <LoamEditor theme={theme} note={note} onDone={() => setView('note')} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────
function LoamSidebar({ theme, dark, setDark, view, setView, onOpen, noteId, activeTag, setActiveTag }) {
  const recents = window.NOTES.slice(0, 5);
  const essays  = window.NOTES.filter((n) => n.kind === 'essay');
  const notes   = window.NOTES.filter((n) => n.kind === 'note' || n.kind === 'log');

  return (
    <div style={{
      width: 248, flexShrink: 0, background: theme.panel, color: theme.ink,
      borderRight: `1px solid ${theme.rule}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '18px 18px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => { setActiveTag(null); setView('index'); }} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 9, color: theme.ink,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11, background: theme.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic', fontWeight: 500, lineHeight: 1,
          }}>l</div>
          <span style={{
            fontFamily: '"EB Garamond", Georgia, serif', fontSize: 19,
            fontStyle: 'italic', letterSpacing: -0.2, fontWeight: 500,
          }}>loam</span>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setDark(!dark)} title={dark ? 'Light' : 'Dark'} style={{
          background: 'none', border: 'none', color: theme.dim, cursor: 'pointer',
          fontSize: 14, padding: 4, lineHeight: 1,
        }}>{dark ? '☼' : '☾'}</button>
      </div>

      <div style={{ padding: '0 12px 10px' }}>
        <div style={{
          background: theme.panel2, padding: '6px 10px', borderRadius: 6,
          fontSize: 12, color: theme.dim, display: 'flex', gap: 8, alignItems: 'center',
          border: `1px solid ${theme.rule}`,
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="5" cy="5" r="3.5"/><path d="M7.5 7.5l2.5 2.5"/></svg>
          <span style={{ flex: 1 }}>Find or create…</span>
          <span style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10,
            color: theme.dim, background: theme.bg, padding: '1px 5px', borderRadius: 3,
          }}>⌘K</span>
        </div>
      </div>

      <div style={{ padding: '4px 8px' }}>
        <button onClick={() => setView('edit')} style={sidebarButton(theme, false)}>
          <span style={{ color: theme.accent, width: 14, fontSize: 14, lineHeight: 1 }}>＋</span>
          <span>Plant a note</span>
        </button>
        <button onClick={() => { setActiveTag(null); setView('index'); }}
          style={sidebarButton(theme, view === 'index' && !activeTag)}>
          <span style={{ color: theme.dim, width: 14 }}>≡</span>
          <span>All notes</span>
          <span style={{ flex: 1 }} />
          <span style={{ color: theme.dim, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{window.NOTES.length}</span>
        </button>
      </div>

      <SidebarSection theme={theme} title="recent">
        {recents.map((n) => (
          <SidebarRow key={n.id} theme={theme} active={view === 'note' && noteId === n.id}
            onClick={() => onOpen(n.id)} dot label={n.title} accent={n.kind === 'essay' ? theme.accent : theme.accent2} />
        ))}
      </SidebarSection>

      <SidebarSection theme={theme} title="essays">
        {essays.map((n) => (
          <SidebarRow key={n.id} theme={theme} active={view === 'note' && noteId === n.id}
            onClick={() => onOpen(n.id)} icon="✎" label={n.title} />
        ))}
      </SidebarSection>

      <SidebarSection theme={theme} title="notes">
        {notes.map((n) => (
          <SidebarRow key={n.id} theme={theme} active={view === 'note' && noteId === n.id}
            onClick={() => onOpen(n.id)} icon="◦" label={n.title} />
        ))}
      </SidebarSection>

      <SidebarSection theme={theme} title="tags">
        <div style={{ padding: '2px 6px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {window.TAGS.map((t) => (
            <button key={t.name} onClick={() => { setActiveTag(t.name); setView('index'); }} style={{
              background: activeTag === t.name ? theme.ink : theme.tag,
              color: activeTag === t.name ? theme.bg : theme.ink, border: 'none', cursor: 'pointer',
              fontSize: 11, fontFamily: 'inherit', padding: '3px 9px', borderRadius: 999, fontWeight: 500,
            }}>{t.name}<span style={{ opacity: .5, marginLeft: 5 }}>{t.count}</span></button>
          ))}
        </div>
      </SidebarSection>

      <div style={{ flex: 1 }} />
      <div style={{
        padding: '12px 16px', borderTop: `1px solid ${theme.rule}`, color: theme.dim,
        fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: theme.accent2 }}>●</span>
        <span>tended yesterday</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>{window.NOTES.length} notes</span>
      </div>
    </div>
  );
}

const sidebarButton = (theme, active) => ({
  display: 'flex', alignItems: 'center', gap: 9, width: '100%',
  background: active ? theme.sel : 'none', border: 'none', cursor: 'pointer',
  color: theme.ink, padding: '6px 10px', borderRadius: 5,
  fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
});

function SidebarSection({ theme, title, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        padding: '4px 18px', fontSize: 10, letterSpacing: 1.5,
        textTransform: 'uppercase', color: theme.dim, fontWeight: 600,
      }}>{title}</div>
      <div style={{ padding: '0 8px' }}>{children}</div>
    </div>
  );
}

function SidebarRow({ theme, active, onClick, icon, dot, accent, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9, width: '100%',
      background: active ? theme.sel : 'none', border: 'none', cursor: 'pointer',
      color: theme.ink, padding: '4px 10px', borderRadius: 5,
      fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
    }}>
      {dot ? (
        <span style={{ width: 6, height: 6, borderRadius: 3, background: accent || theme.accent, flexShrink: 0 }} />
      ) : (
        <span style={{ color: theme.dim, width: 14, flexShrink: 0, fontSize: 12 }}>{icon}</span>
      )}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// BREADCRUMB
// ─────────────────────────────────────────────────────────────
function LoamCrumb({ theme, view, note, setView, activeTag }) {
  return (
    <div style={{
      padding: '10px 24px', borderBottom: `1px solid ${theme.rule}`,
      display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
      color: theme.dim, flexShrink: 0,
    }}>
      <button onClick={() => setView('index')} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: theme.dim,
        padding: 0, fontFamily: 'inherit', fontSize: 12,
      }}>~/loam</button>
      {view === 'index' && activeTag && (<>
        <span style={{ color: theme.faint }}>/</span>
        <span style={{ color: theme.accent }}>#{activeTag}</span>
      </>)}
      {view !== 'index' && (<>
        <span style={{ color: theme.faint }}>/</span>
        <span style={{ color: theme.ink, fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11 }}>{note.id}.md</span>
      </>)}
      <div style={{ flex: 1 }} />
      {view === 'note' && (
        <button onClick={() => setView('edit')} style={{
          background: 'none', border: `1px solid ${theme.rule}`, color: theme.ink,
          padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
        }}>edit</button>
      )}
      {view === 'edit' && (
        <button onClick={() => setView('note')} style={{
          background: theme.accent, color: '#fff', border: 'none',
          padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
        }}>save & close</button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// INDEX — bold display + medium-density list
// ─────────────────────────────────────────────────────────────
function LoamIndex({ theme, onOpen, activeTag, setActiveTag }) {
  const filtered = activeTag ? window.NOTES.filter((n) => n.tags.includes(activeTag)) : window.NOTES;

  return (
    <div style={{ padding: '36px 40px 80px', maxWidth: 820 }}>
      {!activeTag ? (
        <div style={{ marginBottom: 36 }}>
          <h1 style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 44, fontWeight: 400, letterSpacing: -0.8, lineHeight: 1.1,
            margin: '0 0 12px', color: theme.ink,
          }}>
            Things <em style={{ color: theme.accent }}>worth keeping</em>, mostly.
          </h1>
          <p style={{ fontSize: 15, color: theme.dim, lineHeight: 1.6, margin: 0, maxWidth: 540 }}>
            A small notebook kept in the open. Some of these are essays I'm still figuring out.
            Some are notes that may stay notes forever.
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <h1 style={{
            fontFamily: '"EB Garamond", Georgia, serif',
            fontSize: 36, fontWeight: 400, letterSpacing: -0.6, margin: 0,
          }}>
            <span style={{ color: theme.accent }}>#</span>{activeTag}
            <span style={{ fontSize: 15, color: theme.dim, marginLeft: 14, fontStyle: 'normal',
              fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
              {filtered.length} notes
            </span>
          </h1>
        </div>
      )}

      <div style={{ borderTop: `1px solid ${theme.rule}` }}>
        {filtered.map((n) => (
          <button key={n.id} onClick={() => onOpen(n.id)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'none', border: 'none', padding: '20px 0',
            borderBottom: `1px solid ${theme.rule}`, cursor: 'pointer',
            fontFamily: 'inherit', color: theme.ink,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 5 }}>
              <span style={{
                fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
                color: theme.accent, fontWeight: 600, width: 56, flexShrink: 0,
              }}>{n.kind}</span>
              <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.2, flex: 1 }}>
                {n.title}
              </span>
              <span style={{ color: theme.dim, fontSize: 12, fontVariantNumeric: 'tabular-nums',
                fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                {n.editedDate}
              </span>
            </div>
            <div style={{ fontSize: 14, color: theme.dim, lineHeight: 1.55, paddingLeft: 70 }}>
              {n.excerpt}
            </div>
            <div style={{ paddingLeft: 70, marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
              {n.tags.map((t) => (
                <span key={t} onClick={(e) => { e.stopPropagation(); setActiveTag(t); }} style={{
                  fontSize: 11, color: theme.ink, background: theme.tag,
                  padding: '2px 8px', borderRadius: 999, cursor: 'pointer',
                }}>{t}</span>
              ))}
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: theme.dim,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                {n.readTime}m · {n.words}w
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NOTE — single column with right-rail context
// ─────────────────────────────────────────────────────────────
function LoamNote({ theme, note, onOpen, setActiveTag }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px',
      gap: 40, padding: '40px 40px 80px', maxWidth: 1000,
    }}>
      <article>
        <div style={{
          fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
          color: theme.accent, marginBottom: 14, fontWeight: 600,
        }}>{note.kind}</div>
        <h1 style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: 38, fontWeight: 400, letterSpacing: -0.7, lineHeight: 1.1,
          margin: '0 0 18px', color: theme.ink,
        }}>{note.title}</h1>
        <p style={{ fontSize: 17, color: theme.dim, lineHeight: 1.55, margin: '0 0 26px',
          fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic' }}>
          {note.excerpt}
        </p>
        <div style={{
          display: 'flex', gap: 14, fontSize: 11, color: theme.dim,
          paddingBottom: 22, marginBottom: 30, borderBottom: `1px solid ${theme.rule}`,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}>
          <span>{note.editedDate}</span>
          <span>·</span>
          <span>{note.words} words</span>
          <span>·</span>
          <span>{note.readTime}m</span>
          <span style={{ flex: 1 }} />
          <span>edited {note.edited}</span>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.7 }}>
          {note.body.map((b, i) => <LoamBlock key={i} block={b} theme={theme} onOpen={onOpen} />)}
        </div>

        <div style={{ marginTop: 44, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: theme.dim, marginRight: 8, letterSpacing: 1.4, textTransform: 'uppercase' }}>filed under</span>
          {note.tags.map((t) => (
            <button key={t} onClick={() => setActiveTag(t)} style={{
              fontSize: 12, color: theme.ink, background: theme.tag,
              padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
            }}>#{t}</button>
          ))}
        </div>
      </article>

      <aside style={{ position: 'sticky', top: 0, alignSelf: 'start', paddingTop: 36 }}>
        {note.backlinks && note.backlinks.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              color: theme.dim, marginBottom: 10, fontWeight: 600,
            }}>↩ mentioned in</div>
            {note.backlinks.map((id) => {
              const t = window.NOTES.find((n) => n.id === id);
              if (!t) return null;
              return (
                <button key={id} onClick={() => onOpen(id)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', padding: '8px 0',
                  borderTop: `1px solid ${theme.rule}`, cursor: 'pointer',
                  color: theme.ink, fontFamily: 'inherit',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: theme.dim, fontStyle: 'italic',
                    fontFamily: '"EB Garamond", Georgia, serif' }}>{t.kind}</div>
                </button>
              );
            })}
          </div>
        )}

        <div>
          <div style={{
            fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
            color: theme.dim, marginBottom: 10, fontWeight: 600,
          }}>nearby</div>
          {window.NOTES.filter((n) => n.id !== note.id && n.tags.some((t) => note.tags.includes(t))).slice(0, 3).map((n) => (
            <button key={n.id} onClick={() => onOpen(n.id)} style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: 'none', border: 'none', padding: '8px 0',
              borderTop: `1px solid ${theme.rule}`, cursor: 'pointer',
              color: theme.ink, fontFamily: 'inherit',
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
              <div style={{ fontSize: 11, color: theme.dim,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
                {n.tags.map((t) => `#${t}`).join(' ')}
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function LoamBlock({ block, theme, onOpen }) {
  if (block.type === 'p') return (
    <p style={{ margin: '0 0 18px' }}>
      {block.text}
      {block.link && (() => {
        const target = window.NOTES.find((n) => n.id === block.link);
        return target ? (
          <a onClick={() => onOpen(block.link)} style={{
            color: theme.accent, cursor: 'pointer', fontWeight: 500,
            borderBottom: `1px dotted ${theme.accent}`,
          }}>{target.title}</a>
        ) : null;
      })()}
    </p>
  );
  if (block.type === 'h2') return (
    <h2 style={{
      fontFamily: '"EB Garamond", Georgia, serif',
      fontSize: 24, fontWeight: 400, margin: '32px 0 14px', letterSpacing: -0.3,
    }}>{block.text}</h2>
  );
  if (block.type === 'ul') return (
    <ul style={{ margin: '0 0 18px', paddingLeft: 22, listStyle: 'none' }}>
      {block.items.map((it, i) => (
        <li key={i} style={{ margin: '0 0 7px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: -16, color: theme.accent }}>·</span>{it}
        </li>
      ))}
    </ul>
  );
  if (block.type === 'quote') return (
    <blockquote style={{
      margin: '24px 0', padding: '4px 0 4px 22px',
      borderLeft: `2px solid ${theme.accent}`,
      fontFamily: '"EB Garamond", Georgia, serif',
      fontStyle: 'italic', fontSize: 20, lineHeight: 1.5, color: theme.ink,
    }}>{block.text}</blockquote>
  );
  if (block.type === 'code') return (
    <pre style={{
      background: theme.panel, padding: '14px 16px', borderRadius: 6,
      border: `1px solid ${theme.rule}`, fontSize: 12.5, lineHeight: 1.65,
      overflow: 'auto', fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      margin: '0 0 18px',
    }}>
      <div style={{ fontSize: 10, color: theme.dim, marginBottom: 8, letterSpacing: 1.2, textTransform: 'uppercase' }}>{block.lang || 'code'}</div>
      <code style={{ color: theme.ink }}>{loamSyntax(block.text, theme)}</code>
    </pre>
  );
  return null;
}

function loamSyntax(text, theme) {
  const keywords = /\b(use|fn|let|mut|if|else|return|struct|impl|pub|as|const|true|false)\b/g;
  const out = [];
  text.split('\n').forEach((line, idx) => {
    let rest = line;
    rest = rest.replace(/("[^"]*")/g, (m) => `\u0001S${m}\u0002`);
    rest = rest.replace(/\b(\d+)\b/g, (m) => `\u0001N${m}\u0002`);
    rest = rest.replace(keywords, (m) => `\u0001K${m}\u0002`);
    rest = rest.replace(/(\/\/.*)$/g, (m) => `\u0001C${m}\u0002`);
    const tokens = rest.split(/\u0001|\u0002/).filter(Boolean);
    const parts = tokens.map((tok, j) => {
      const m = tok.match(/^([SNKC])(.*)$/s);
      if (m) {
        const color = m[1] === 'S' ? theme.accent2 : m[1] === 'K' ? theme.accent : m[1] === 'N' ? theme.accent : theme.dim;
        return <span key={`${idx}-${j}`} style={{ color, fontStyle: m[1] === 'C' ? 'italic' : 'normal' }}>{m[2]}</span>;
      }
      return <span key={`${idx}-${j}`}>{tok}</span>;
    });
    out.push(<div key={idx}>{parts.length ? parts : '\u00a0'}</div>);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// EDITOR
// ─────────────────────────────────────────────────────────────
function LoamEditor({ theme, note, onDone }) {
  const [title, setTitle] = React.useState(note.title);
  const [tags, setTags] = React.useState(note.tags.join(', '));
  const [body, setBody] = React.useState(
    note.body.map((b) => b.type === 'h2' ? `## ${b.text}` :
                        b.type === 'ul' ? b.items.map(i => `- ${i}`).join('\n') :
                        b.type === 'quote' ? `> ${b.text}` :
                        b.type === 'code' ? '```' + (b.lang || '') + '\n' + b.text + '\n```' :
                        b.text).join('\n\n')
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', height: '100%', minHeight: 0 }}>
      <div style={{ padding: '32px 40px 60px', maxWidth: 720, overflow: 'auto' }}>
        <div style={{
          fontSize: 11, color: theme.dim, marginBottom: 18,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: theme.accent }} />
          drafting · auto-saved 12s ago
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{
          width: '100%', background: 'none', border: 'none', outline: 'none',
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: 38, fontWeight: 400, letterSpacing: -0.7, color: theme.ink,
          padding: 0, marginBottom: 12,
        }} />
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, comma separated" style={{
          width: '100%', background: 'none', border: 'none', outline: 'none',
          fontSize: 13, color: theme.dim, padding: 0, marginBottom: 24, fontFamily: 'inherit',
        }} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{
          width: '100%', minHeight: 380, background: 'none', border: 'none', outline: 'none',
          resize: 'none', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.7, color: theme.ink,
        }} />
      </div>
      <div style={{
        borderLeft: `1px solid ${theme.rule}`, padding: '28px 22px',
        background: theme.panel, overflow: 'auto',
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
          color: theme.dim, marginBottom: 14, fontWeight: 600,
        }}>preview</div>
        <h2 style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: 22, fontWeight: 400, margin: '0 0 10px', letterSpacing: -0.3,
        }}>{title}</h2>
        <div style={{ fontSize: 12, color: theme.dim, lineHeight: 1.6, marginBottom: 16 }}>
          {body.split('\n\n')[0].slice(0, 200)}…
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 22 }}>
          {tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
            <span key={t} style={{
              fontSize: 11, color: theme.ink, background: theme.tag,
              padding: '2px 8px', borderRadius: 999,
            }}>{t}</span>
          ))}
        </div>
        <button onClick={onDone} style={{
          width: '100%', background: theme.accent, color: '#fff', border: 'none',
          padding: '8px', borderRadius: 6, cursor: 'pointer',
          fontSize: 12, fontFamily: 'inherit', fontWeight: 600, letterSpacing: 0.2,
        }}>publish</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE
// ─────────────────────────────────────────────────────────────
function LoamMobile({ theme, dark, setDark, view, setView, noteId, note, onOpen,
                      activeTag, setActiveTag, drawerOpen, setDrawerOpen, drawerKind }) {
  const isTabs = drawerKind === 'tabs';

  return (
    <div style={{
      width: '100%', height: '100%', background: theme.bg, color: theme.ink,
      fontFamily: '"Inter", system-ui, sans-serif', fontSize: 14,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 10px',
        borderBottom: `1px solid ${theme.rule}`, flexShrink: 0, background: theme.bg,
      }}>
        {!isTabs && (
          <button onClick={() => setDrawerOpen(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: theme.ink,
            padding: 4, display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            <span style={{ width: 16, height: 1.5, background: 'currentColor', borderRadius: 1 }} />
            <span style={{ width: 16, height: 1.5, background: 'currentColor', borderRadius: 1 }} />
            <span style={{ width: 16, height: 1.5, background: 'currentColor', borderRadius: 1 }} />
          </button>
        )}
        <button onClick={() => { setActiveTag(null); setView('index'); }} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 8, color: theme.ink,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 11, background: theme.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontFamily: '"EB Garamond", Georgia, serif',
            fontStyle: 'italic', fontSize: 13, lineHeight: 1,
          }}>l</div>
          <span style={{
            fontFamily: '"EB Garamond", Georgia, serif', fontSize: 19,
            fontStyle: 'italic', letterSpacing: -0.2,
          }}>loam</span>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setDark(!dark)} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: theme.dim,
          fontSize: 15, padding: 4,
        }}>{dark ? '☼' : '☾'}</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {view === 'index' && <LoamIndexMobile theme={theme} onOpen={onOpen} activeTag={activeTag} setActiveTag={setActiveTag} />}
        {view === 'note'  && <LoamNoteMobile  theme={theme} note={note} onOpen={onOpen} setActiveTag={(t) => { setActiveTag(t); setView('index'); }} setView={setView} />}
        {view === 'edit'  && <LoamNoteMobile  theme={theme} note={note} onOpen={onOpen} setActiveTag={(t) => { setActiveTag(t); setView('index'); }} setView={setView} />}
      </div>

      {/* Bottom tabs (alternative to drawer) */}
      {isTabs && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderTop: `1px solid ${theme.rule}`, background: theme.panel, flexShrink: 0,
        }}>
          {[
            { k: 'index', icon: '≡', label: 'All' },
            { k: 'tags',  icon: '#', label: 'Tags' },
            { k: 'new',   icon: '＋', label: 'New', highlight: true },
            { k: 'me',    icon: '◐', label: 'Me' },
          ].map((t) => (
            <button key={t.k} onClick={() => { if (t.k === 'index') { setActiveTag(null); setView('index'); } if (t.k === 'new') setView('edit'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 6px 12px', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 3,
                color: t.highlight ? theme.accent : (view === t.k ? theme.ink : theme.dim),
                fontFamily: 'inherit', fontSize: 10,
              }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Slide-out drawer */}
      {!isTabs && (
        <>
          <div onClick={() => setDrawerOpen(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
            opacity: drawerOpen ? 1 : 0, pointerEvents: drawerOpen ? 'auto' : 'none',
            transition: 'opacity .2s', zIndex: 5,
          }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 0, width: 268,
            background: theme.panel, borderRight: `1px solid ${theme.rule}`,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .22s cubic-bezier(.2,.7,.3,1)',
            zIndex: 6, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '16px 18px 8px', display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: theme.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontFamily: '"EB Garamond", Georgia, serif',
                fontStyle: 'italic', fontSize: 13, lineHeight: 1,
              }}>l</div>
              <span style={{
                fontFamily: '"EB Garamond", Georgia, serif', fontSize: 19,
                fontStyle: 'italic', letterSpacing: -0.2,
              }}>loam</span>
              <div style={{ flex: 1 }} />
              <button onClick={() => setDrawerOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: theme.dim,
                fontSize: 18, padding: 4, lineHeight: 1,
              }}>×</button>
            </div>
            <div style={{ padding: '4px 8px' }}>
              <button onClick={() => { setView('edit'); setDrawerOpen(false); }} style={sidebarButton(theme, false)}>
                <span style={{ color: theme.accent, width: 14, fontSize: 14, lineHeight: 1 }}>＋</span>
                <span>Plant a note</span>
              </button>
              <button onClick={() => { setActiveTag(null); setView('index'); setDrawerOpen(false); }}
                style={sidebarButton(theme, view === 'index' && !activeTag)}>
                <span style={{ color: theme.dim, width: 14 }}>≡</span>
                <span>All notes</span>
                <span style={{ flex: 1 }} />
                <span style={{ color: theme.dim, fontSize: 11 }}>{window.NOTES.length}</span>
              </button>
            </div>
            <SidebarSection theme={theme} title="recent">
              {window.NOTES.slice(0, 5).map((n) => (
                <SidebarRow key={n.id} theme={theme} active={view === 'note' && noteId === n.id}
                  onClick={() => onOpen(n.id)} dot accent={n.kind === 'essay' ? theme.accent : theme.accent2} label={n.title} />
              ))}
            </SidebarSection>
            <SidebarSection theme={theme} title="tags">
              <div style={{ padding: '2px 6px 0', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {window.TAGS.map((t) => (
                  <button key={t.name} onClick={() => { setActiveTag(t.name); setView('index'); setDrawerOpen(false); }} style={{
                    background: activeTag === t.name ? theme.ink : theme.tag,
                    color: activeTag === t.name ? theme.bg : theme.ink, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'inherit', padding: '3px 9px', borderRadius: 999, fontWeight: 500,
                  }}>{t.name}<span style={{ opacity: .5, marginLeft: 5 }}>{t.count}</span></button>
                ))}
              </div>
            </SidebarSection>
            <div style={{ flex: 1 }} />
            <div style={{
              padding: '12px 18px', borderTop: `1px solid ${theme.rule}`, color: theme.dim,
              fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: theme.accent2 }}>●</span>
              <span>tended yesterday</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoamIndexMobile({ theme, onOpen, activeTag, setActiveTag }) {
  const filtered = activeTag ? window.NOTES.filter((n) => n.tags.includes(activeTag)) : window.NOTES;
  return (
    <div style={{ padding: '20px 18px 30px' }}>
      {!activeTag ? (
        <h1 style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: 30, fontWeight: 400, letterSpacing: -0.6, lineHeight: 1.1,
          margin: '0 0 18px',
        }}>
          Things <em style={{ color: theme.accent }}>worth keeping</em>.
        </h1>
      ) : (
        <h1 style={{
          fontFamily: '"EB Garamond", Georgia, serif',
          fontSize: 26, fontWeight: 400, letterSpacing: -0.4, margin: '0 0 14px',
        }}>
          <span style={{ color: theme.accent }}>#</span>{activeTag}
        </h1>
      )}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16, overflow: 'auto' }}>
        <button onClick={() => setActiveTag(null)} style={{
          background: !activeTag ? theme.ink : theme.tag, color: !activeTag ? theme.bg : theme.ink,
          border: 'none', padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
          fontSize: 11, fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap',
        }}>all</button>
        {window.TAGS.slice(0, 6).map((t) => (
          <button key={t.name} onClick={() => setActiveTag(t.name)} style={{
            background: activeTag === t.name ? theme.ink : theme.tag,
            color: activeTag === t.name ? theme.bg : theme.ink,
            border: 'none', padding: '4px 11px', borderRadius: 999, cursor: 'pointer',
            fontSize: 11, fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap',
          }}>{t.name}</button>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${theme.rule}` }}>
        {filtered.map((n) => (
          <button key={n.id} onClick={() => onOpen(n.id)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            background: 'none', border: 'none', padding: '14px 0',
            borderBottom: `1px solid ${theme.rule}`, cursor: 'pointer',
            fontFamily: 'inherit', color: theme.ink,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase',
                color: theme.accent, fontWeight: 600,
              }}>{n.kind}</span>
              <span style={{ flex: 1 }} />
              <span style={{ color: theme.dim, fontSize: 11,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>{n.editedDate.replace(', 2025', '')}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.2, marginBottom: 4, lineHeight: 1.25 }}>
              {n.title}
            </div>
            <div style={{ fontSize: 13, color: theme.dim, lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {n.excerpt}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoamNoteMobile({ theme, note, onOpen, setActiveTag, setView }) {
  return (
    <div style={{ padding: '18px 20px 60px' }}>
      <button onClick={() => setView('index')} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: theme.dim,
        fontSize: 12, padding: 0, marginBottom: 18, fontFamily: 'inherit',
      }}>← all notes</button>

      <div style={{
        fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
        color: theme.accent, marginBottom: 10, fontWeight: 600,
      }}>{note.kind}</div>
      <h1 style={{
        fontFamily: '"EB Garamond", Georgia, serif',
        fontSize: 28, fontWeight: 400, letterSpacing: -0.5, lineHeight: 1.15,
        margin: '0 0 12px',
      }}>{note.title}</h1>
      <p style={{ fontSize: 15, color: theme.dim, lineHeight: 1.5, margin: '0 0 18px',
        fontFamily: '"EB Garamond", Georgia, serif', fontStyle: 'italic' }}>
        {note.excerpt}
      </p>
      <div style={{
        display: 'flex', gap: 10, fontSize: 11, color: theme.dim,
        paddingBottom: 16, marginBottom: 22, borderBottom: `1px solid ${theme.rule}`,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace', flexWrap: 'wrap',
      }}>
        <span>{note.editedDate}</span>
        <span>·</span>
        <span>{note.readTime}m</span>
        <span>·</span>
        <span>{note.words}w</span>
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.65 }}>
        {note.body.map((b, i) => <LoamBlock key={i} block={b} theme={theme} onOpen={onOpen} />)}
      </div>
      <div style={{ marginTop: 30, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {note.tags.map((t) => (
          <button key={t} onClick={() => setActiveTag(t)} style={{
            fontSize: 11, color: theme.ink, background: theme.tag,
            padding: '3px 9px', borderRadius: 999, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit',
          }}>#{t}</button>
        ))}
      </div>
      {note.backlinks && note.backlinks.length > 0 && (
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${theme.rule}` }}>
          <div style={{
            fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
            color: theme.dim, marginBottom: 8, fontWeight: 600,
          }}>↩ mentioned in</div>
          {note.backlinks.map((id) => {
            const t = window.NOTES.find((n) => n.id === id);
            if (!t) return null;
            return (
              <button key={id} onClick={() => onOpen(id)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', padding: '8px 0',
                cursor: 'pointer', color: theme.ink, fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { LoamApp });
