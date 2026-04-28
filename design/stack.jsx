// Direction 2: STACK
// Utilitarian, dense, sidebar + content. Power-user feel.
// Type: clean sans throughout, monospace for code & metadata.
// Navigation: persistent file-tree sidebar with sections (Inbox, Notes, Posts, Tags).
// Personality: a writer's IDE. Keyboard-first.

function StackApp({ initialView = 'index' }) {
  const [view, setView] = React.useState(initialView);
  const [noteId, setNoteId] = React.useState(window.NOTES[0].id);
  const [dark, setDark] = React.useState(true); // Stack defaults dark — terminal mood
  const [activeTag, setActiveTag] = React.useState(null);

  const note = window.NOTES.find((n) => n.id === noteId) || window.NOTES[0];
  const open = (id) => { setNoteId(id); setView('note'); };

  const theme = dark
    ? { bg: '#0e1014', panel: '#13161c', panel2: '#191d25', ink: '#dde2ec', dim: '#6b7585', faint: '#2a3140', accent: '#7aa2f7', accent2: '#9ece6a', rule: '#1d222b', sel: '#1f2a3d' }
    : { bg: '#fbfbfa', panel: '#f3f3f0', panel2: '#ebebe7', ink: '#1a1c20', dim: '#6f7480', faint: '#d8d8d2', accent: '#3b6dd9', accent2: '#3a6e1d', rule: '#e1e1dc', sel: '#dfe8f7' };

  return (
    <div style={{
      width: '100%', height: '100%', background: theme.bg, color: theme.ink,
      fontFamily: '"Inter", system-ui, sans-serif', fontSize: 13,
      display: 'flex', overflow: 'hidden',
    }}>
      <StackSidebar theme={theme} dark={dark} setDark={setDark} view={view} setView={setView}
        onOpen={open} noteId={noteId} activeTag={activeTag} setActiveTag={setActiveTag} />
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <StackBreadcrumb theme={theme} view={view} note={note} setView={setView} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {view === 'index' && <StackIndex theme={theme} onOpen={open} activeTag={activeTag} />}
          {view === 'note'  && <StackNote  theme={theme} note={note} onOpen={open} />}
          {view === 'edit'  && <StackEditor theme={theme} note={note} onDone={() => setView('note')} />}
        </div>
        <StackStatus theme={theme} view={view} note={note} />
      </div>
    </div>
  );
}

function StackSidebar({ theme, dark, setDark, view, setView, onOpen, noteId, activeTag, setActiveTag }) {
  const recents = window.NOTES.slice(0, 5);
  const essays  = window.NOTES.filter((n) => n.kind === 'essay');
  const notes   = window.NOTES.filter((n) => n.kind === 'note' || n.kind === 'log');

  return (
    <div style={{
      width: 232, flexShrink: 0, background: theme.panel, color: theme.ink,
      borderRight: `1px solid ${theme.rule}`,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '14px 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 18, height: 18, borderRadius: 3, background: theme.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.bg, fontSize: 11, fontWeight: 700,
        }}>§</div>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -0.1 }}>stack</div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setDark(!dark)} style={{
          background: 'none', border: 'none', color: theme.dim, cursor: 'pointer',
          fontSize: 12, padding: 4,
        }}>{dark ? '☀' : '☾'}</button>
      </div>

      <div style={{ padding: '0 10px 8px' }}>
        <div style={{
          background: theme.panel2, padding: '5px 8px', borderRadius: 3,
          fontSize: 12, color: theme.dim, display: 'flex', gap: 6, alignItems: 'center',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}>
          <span>⌘K</span><span style={{ color: theme.faint }}>·</span>
          <span>find or create</span>
        </div>
      </div>

      <div style={{ padding: '4px 6px' }}>
        <button onClick={() => setView('edit')} style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          color: theme.ink, padding: '5px 8px', fontFamily: 'inherit', fontSize: 12,
          textAlign: 'left', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: theme.dim, width: 12 }}>+</span> New note
        </button>
        <button onClick={() => { setActiveTag(null); setView('index'); }} style={{
          width: '100%', background: view === 'index' && !activeTag ? theme.sel : 'none',
          border: 'none', cursor: 'pointer', color: theme.ink, padding: '5px 8px',
          fontFamily: 'inherit', fontSize: 12, textAlign: 'left', borderRadius: 3,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: theme.dim, width: 12 }}>≡</span> All notes
          <span style={{ flex: 1 }} />
          <span style={{ color: theme.dim, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{window.NOTES.length}</span>
        </button>
      </div>

      <SidebarSection theme={theme} title="recents">
        {recents.map((n) => (
          <SidebarRow key={n.id} theme={theme} active={view === 'note' && noteId === n.id}
            onClick={() => onOpen(n.id)} icon="·" label={n.title} />
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
        {window.TAGS.map((t) => (
          <SidebarRow key={t.name} theme={theme} active={activeTag === t.name}
            onClick={() => { setActiveTag(t.name); setView('index'); }}
            icon="#" label={t.name} count={t.count} mono />
        ))}
      </SidebarSection>

      <div style={{ flex: 1 }} />
      <div style={{
        padding: '10px 14px', borderTop: `1px solid ${theme.rule}`, color: theme.dim,
        fontSize: 11, display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      }}>
        <span style={{ color: theme.accent2 }}>●</span>
        <span>main</span>
        <span style={{ flex: 1 }} />
        <span>{window.NOTES.length} files</span>
      </div>
    </div>
  );
}

function SidebarSection({ theme, title, children }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{
        padding: '4px 14px', fontSize: 10, letterSpacing: 1.4,
        textTransform: 'uppercase', color: theme.dim, fontWeight: 600,
      }}>{title}</div>
      <div style={{ padding: '0 6px' }}>{children}</div>
    </div>
  );
}

function SidebarRow({ theme, active, onClick, icon, label, count, mono }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
      background: active ? theme.sel : 'none', border: 'none', cursor: 'pointer',
      color: active ? theme.ink : theme.ink, padding: '4px 8px', borderRadius: 3,
      fontFamily: mono ? '"JetBrains Mono", ui-monospace, monospace' : 'inherit',
      fontSize: 12, textAlign: 'left',
    }}>
      <span style={{ color: theme.dim, width: 12, flexShrink: 0, textAlign: 'center' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {count != null && (
        <span style={{ color: theme.dim, fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{count}</span>
      )}
    </button>
  );
}

function StackBreadcrumb({ theme, view, note, setView }) {
  return (
    <div style={{
      padding: '8px 18px', borderBottom: `1px solid ${theme.rule}`,
      display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
      color: theme.dim, flexShrink: 0,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    }}>
      <button onClick={() => setView('index')} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: theme.dim,
        padding: 0, fontFamily: 'inherit', fontSize: 11,
      }}>~/notes</button>
      {view !== 'index' && (
        <>
          <span style={{ color: theme.faint }}>/</span>
          <span style={{ color: theme.ink }}>{note.id}.md</span>
        </>
      )}
      <div style={{ flex: 1 }} />
      {view === 'note' && (
        <button onClick={() => setView('edit')} style={{
          background: 'none', border: `1px solid ${theme.rule}`, color: theme.ink,
          padding: '3px 10px', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
        }}>edit</button>
      )}
    </div>
  );
}

function StackIndex({ theme, onOpen, activeTag }) {
  const filtered = activeTag ? window.NOTES.filter((n) => n.tags.includes(activeTag)) : window.NOTES;

  return (
    <div style={{ padding: '20px 28px 60px' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: -0.2 }}>
          {activeTag ? `#${activeTag}` : 'All notes'}
        </h1>
        <span style={{ color: theme.dim, fontSize: 12, fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
          {filtered.length} files
        </span>
      </div>

      <div style={{ borderTop: `1px solid ${theme.rule}` }}>
        {filtered.map((n) => (
          <button key={n.id} onClick={() => onOpen(n.id)} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 70px 90px', gap: 16,
            alignItems: 'baseline', width: '100%', padding: '10px 4px',
            background: 'none', border: 'none', cursor: 'pointer', color: theme.ink,
            borderBottom: `1px solid ${theme.rule}`, fontFamily: 'inherit', textAlign: 'left',
          }}>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, color: theme.dim }}>
              {n.editedDate.replace(',', '').replace(' 2025', '')}
            </span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{n.title}</div>
              <div style={{
                fontSize: 12, color: theme.dim, lineHeight: 1.45,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
              }}>{n.excerpt}</div>
            </div>
            <span style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11,
              color: theme.dim, textAlign: 'right',
            }}>{n.words}w</span>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {n.tags.slice(0, 2).map((t) => (
                <span key={t} style={{
                  fontSize: 10, color: theme.dim,
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                }}>#{t}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StackNote({ theme, note, onOpen }) {
  return (
    <div style={{ padding: '24px 32px 80px', maxWidth: 760 }}>
      <h1 style={{ fontSize: 26, margin: '0 0 8px', fontWeight: 600, letterSpacing: -0.4, lineHeight: 1.2 }}>
        {note.title}
      </h1>
      <div style={{
        display: 'flex', gap: 12, fontSize: 11, color: theme.dim,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        paddingBottom: 18, marginBottom: 24, borderBottom: `1px solid ${theme.rule}`,
      }}>
        <span>{note.editedDate}</span>
        <span>·</span>
        <span>{note.words} words</span>
        <span>·</span>
        <span>{note.readTime}m read</span>
        <span>·</span>
        <span>edited {note.edited}</span>
        <span style={{ flex: 1 }} />
        {note.tags.map((t) => <span key={t}>#{t}</span>)}
      </div>

      <div style={{ fontSize: 14, lineHeight: 1.7 }}>
        {note.body.map((b, i) => <StackBlock key={i} block={b} theme={theme} onOpen={onOpen} />)}
      </div>

      {note.backlinks && note.backlinks.length > 0 && (
        <div style={{ marginTop: 48, padding: '16px 0 0', borderTop: `1px solid ${theme.rule}` }}>
          <div style={{
            fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
            color: theme.dim, marginBottom: 10, fontWeight: 600,
          }}>backlinks · {note.backlinks.length}</div>
          {note.backlinks.map((id) => {
            const t = window.NOTES.find((n) => n.id === id);
            if (!t) return null;
            return (
              <button key={id} onClick={() => onOpen(id)} style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
                color: theme.accent, fontFamily: 'inherit', fontSize: 13,
              }}>← {t.title}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StackBlock({ block, theme, onOpen }) {
  if (block.type === 'p') return (
    <p style={{ margin: '0 0 16px' }}>
      {block.text}
      {block.link && (() => {
        const target = window.NOTES.find((n) => n.id === block.link);
        return target ? (
          <a onClick={() => onOpen(block.link)} style={{
            color: theme.accent, cursor: 'pointer',
            background: theme.sel, padding: '1px 5px', borderRadius: 2,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12,
          }}>[[{target.title}]]</a>
        ) : null;
      })()}
    </p>
  );
  if (block.type === 'h2') return (
    <h2 style={{ fontSize: 16, fontWeight: 600, margin: '28px 0 12px', letterSpacing: -0.2 }}>
      <span style={{ color: theme.dim, marginRight: 8, fontWeight: 400 }}>##</span>{block.text}
    </h2>
  );
  if (block.type === 'ul') return (
    <ul style={{ margin: '0 0 16px', paddingLeft: 18 }}>
      {block.items.map((it, i) => <li key={i} style={{ margin: '0 0 5px' }}>{it}</li>)}
    </ul>
  );
  if (block.type === 'quote') return (
    <blockquote style={{
      margin: '20px 0', padding: '8px 16px',
      borderLeft: `3px solid ${theme.accent}`, background: theme.panel,
      fontSize: 13, color: theme.ink, lineHeight: 1.6,
    }}>{block.text}</blockquote>
  );
  if (block.type === 'code') return (
    <pre style={{
      background: theme.panel, padding: '14px 16px', borderRadius: 4,
      border: `1px solid ${theme.rule}`, fontSize: 12, lineHeight: 1.6,
      overflow: 'auto', fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      margin: '0 0 16px',
    }}>
      <div style={{
        fontSize: 10, color: theme.dim, marginBottom: 8,
        textTransform: 'uppercase', letterSpacing: 1.2,
      }}>{block.lang || 'code'}</div>
      <code style={{ color: theme.ink }}>{syntaxHighlight(block.text, block.lang, theme)}</code>
    </pre>
  );
  return null;
}

// Tiny tokenizer for the demo. Highlights a few keywords + strings + comments
// so the syntax-highlighting bullet is visibly real on the prototype.
function syntaxHighlight(text, lang, theme) {
  const keywords = /\b(use|fn|let|mut|if|else|return|struct|impl|pub|as|const|true|false)\b/g;
  const out = [];
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    const parts = [];
    let rest = line;
    // strings
    rest = rest.replace(/("[^"]*")/g, (m) => `\u0001S${m}\u0002`);
    // numbers
    rest = rest.replace(/\b(\d+)\b/g, (m) => `\u0001N${m}\u0002`);
    // keywords
    rest = rest.replace(keywords, (m) => `\u0001K${m}\u0002`);
    // comments (line)
    rest = rest.replace(/(\/\/.*)$/g, (m) => `\u0001C${m}\u0002`);

    const tokens = rest.split(/\u0001|\u0002/).filter(Boolean);
    tokens.forEach((tok, j) => {
      const m = tok.match(/^([SNKC])(.*)$/s);
      if (m) {
        const color = m[1] === 'S' ? theme.accent2 : m[1] === 'K' ? theme.accent : m[1] === 'N' ? theme.accent : theme.dim;
        parts.push(<span key={`${idx}-${j}`} style={{ color, fontStyle: m[1] === 'C' ? 'italic' : 'normal' }}>{m[2]}</span>);
      } else {
        parts.push(<span key={`${idx}-${j}`}>{tok}</span>);
      }
    });
    out.push(<div key={idx}>{parts.length ? parts : '\u00a0'}</div>);
  });
  return out;
}

function StackEditor({ theme, note, onDone }) {
  const [title, setTitle] = React.useState(note.title);
  const [body, setBody] = React.useState(
    note.body.map((b) => b.type === 'h2' ? `## ${b.text}` :
                        b.type === 'ul' ? b.items.map(i => `- ${i}`).join('\n') :
                        b.type === 'quote' ? `> ${b.text}` :
                        b.type === 'code' ? '```' + (b.lang || '') + '\n' + b.text + '\n```' :
                        b.text).join('\n\n')
  );

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column' }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{
          width: '100%', background: 'none', border: 'none', outline: 'none',
          fontSize: 20, fontWeight: 600, color: theme.ink, fontFamily: 'inherit',
          padding: 0, marginBottom: 16, letterSpacing: -0.3,
        }} />
        <div style={{
          fontSize: 11, color: theme.dim, marginBottom: 14,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}>--- &nbsp; tags: {note.tags.map((t) => `#${t}`).join(' ')} &nbsp; ---</div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} style={{
          flex: 1, width: '100%', background: 'none', border: 'none', outline: 'none',
          resize: 'none', fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 13, lineHeight: 1.65, color: theme.ink,
        }} />
      </div>
      <div style={{
        width: 240, borderLeft: `1px solid ${theme.rule}`, padding: '20px 18px',
        background: theme.panel,
      }}>
        <div style={{
          fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase',
          color: theme.dim, marginBottom: 12, fontWeight: 600,
        }}>preview</div>
        <h2 style={{ fontSize: 16, margin: '0 0 8px', fontWeight: 600 }}>{title}</h2>
        <div style={{ fontSize: 12, color: theme.dim, lineHeight: 1.55 }}>
          {body.split('\n\n')[0].slice(0, 180)}...
        </div>
        <button onClick={onDone} style={{
          marginTop: 24, width: '100%', background: theme.accent, color: theme.bg,
          border: 'none', padding: '7px', borderRadius: 3, cursor: 'pointer',
          fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
        }}>save & close</button>
      </div>
    </div>
  );
}

function StackStatus({ theme, view, note }) {
  return (
    <div style={{
      borderTop: `1px solid ${theme.rule}`, padding: '5px 14px',
      display: 'flex', alignItems: 'center', gap: 14, fontSize: 11,
      color: theme.dim, fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      background: theme.panel, flexShrink: 0,
    }}>
      <span style={{ color: theme.accent2 }}>●</span>
      <span>{view === 'edit' ? 'INSERT' : 'NORMAL'}</span>
      <span>{view !== 'index' ? `${note.id}.md` : '~/notes'}</span>
      <div style={{ flex: 1 }} />
      {view !== 'index' && <><span>{note.words}w</span><span>md</span><span>utf-8</span></>}
    </div>
  );
}

Object.assign(window, { StackApp });
