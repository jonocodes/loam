// loam — Final assets for the chosen direction: 01 Slab L on paper.
// Single source of truth for the production icon, with size grid, lockups, light/dark, and exports.

const FINAL = {
  bg: 'oklch(0.96 0.012 85)',
  ink: 'oklch(0.28 0.05 45)',
  accent: 'oklch(0.62 0.10 50)',
  inkBg: 'oklch(0.22 0.04 60)', // dark variant background
  inkFg: 'oklch(0.94 0.02 80)', // dark variant foreground
}

// The canonical Slab L path — defined once, used everywhere.
const SLAB_L_D = 'M 320 200 L 470 200 L 470 700 L 760 700 L 760 830 L 320 830 Z'
const SLAB_L_FAVICON_D = 'M 280 200 L 460 200 L 460 720 L 780 720 L 780 850 L 280 850 Z'

// SVG markup as plain strings — used for export / copy-to-clipboard
function buildLightSVG(size = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <defs>
    <clipPath id="sq"><path d="M0 367.5C0 238.6 0 174.2 25.1 124.9 47.1 81.5 82.2 46.4 125.6 24.3 174.8-.8 239.3-.8 368.1-.8L655.9-.8C784.7-.8 849.2-.8 898.4 24.3 941.8 46.4 976.9 81.5 999 124.9 1024 174.2 1024 238.6 1024 367.5L1024 656.5C1024 785.4 1024 849.8 999 899.1 976.9 942.5 941.8 977.6 898.4 999.7 849.2 1024.8 784.7 1024.8 655.9 1024.8L368.1 1024.8C239.3 1024.8 174.8 1024.8 125.6 999.7 82.2 977.6 47.1 942.5 25.1 899.1 0 849.8 0 785.4 0 656.5Z"/></clipPath>
  </defs>
  <g clip-path="url(#sq)">
    <rect width="1024" height="1024" fill="${FINAL.bg}"/>
    <path d="${SLAB_L_D}" fill="${FINAL.ink}"/>
    <circle cx="690" cy="760" r="48" fill="${FINAL.accent}"/>
  </g>
</svg>`
}
function buildDarkSVG(size = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <defs>
    <clipPath id="sq2"><path d="M0 367.5C0 238.6 0 174.2 25.1 124.9 47.1 81.5 82.2 46.4 125.6 24.3 174.8-.8 239.3-.8 368.1-.8L655.9-.8C784.7-.8 849.2-.8 898.4 24.3 941.8 46.4 976.9 81.5 999 124.9 1024 174.2 1024 238.6 1024 367.5L1024 656.5C1024 785.4 1024 849.8 999 899.1 976.9 942.5 941.8 977.6 898.4 999.7 849.2 1024.8 784.7 1024.8 655.9 1024.8L368.1 1024.8C239.3 1024.8 174.8 1024.8 125.6 999.7 82.2 977.6 47.1 942.5 25.1 899.1 0 849.8 0 785.4 0 656.5Z"/></clipPath>
  </defs>
  <g clip-path="url(#sq2)">
    <rect width="1024" height="1024" fill="${FINAL.inkBg}"/>
    <path d="${SLAB_L_D}" fill="${FINAL.inkFg}"/>
    <circle cx="690" cy="760" r="48" fill="${FINAL.accent}"/>
  </g>
</svg>`
}
function buildFaviconSVG(size = 32, dark = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}">
  <circle cx="512" cy="512" r="512" fill="${dark ? FINAL.inkBg : FINAL.bg}"/>
  <path d="${SLAB_L_FAVICON_D}" fill="${dark ? FINAL.inkFg : FINAL.ink}"/>
  <circle cx="700" cy="780" r="68" fill="${FINAL.accent}"/>
</svg>`
}

// React renderers that re-use the same paths
function FinalIcon({ size = 1024, dark = false, shape = 'squircle' }) {
  const bg = dark ? FINAL.inkBg : FINAL.bg
  const fg = dark ? FINAL.inkFg : FINAL.ink
  return (
    <window.IconFrame size={size} shape={shape} bg={bg}>
      <path d={SLAB_L_D} fill={fg} />
      <circle cx="690" cy="760" r="48" fill={FINAL.accent} />
    </window.IconFrame>
  )
}
function FinalFavicon({ size = 32, dark = false }) {
  const bg = dark ? FINAL.inkBg : FINAL.bg
  const fg = dark ? FINAL.inkFg : FINAL.ink
  return (
    <window.IconFrame size={size} shape="circle" bg={bg}>
      <path d={SLAB_L_FAVICON_D} fill={fg} />
      <circle cx="700" cy="780" r="68" fill={FINAL.accent} />
    </window.IconFrame>
  )
}

// ---- Hero ----
function FinalHero() {
  return (
    <div className="stage">
      <div className="stage-header">
        <div className="stage-title">
          loam <em>· final mark</em>
        </div>
        <div className="stage-meta">01 · slab L · paper</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center' }}>
        <div
          style={{
            padding: 24,
            border: '1px dashed var(--line)',
            borderRadius: 12,
            background: 'oklch(0.985 0.006 80)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <FinalIcon size={360} />
        </div>
        <div
          style={{
            padding: 24,
            border: '1px dashed oklch(0.32 0.02 60)',
            borderRadius: 12,
            background: 'oklch(0.18 0.02 60)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <FinalIcon size={360} dark />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 4 }}>
        <Swatch color={FINAL.bg} label="paper" hex="#f3ebde" />
        <Swatch color={FINAL.ink} label="ink" hex="#4d3a2c" />
        <Swatch color={FINAL.accent} label="seed" hex="#b87a47" />
        <Swatch color={FINAL.inkBg} label="ink (dark bg)" hex="#3a2f24" />
        <Swatch color={FINAL.inkFg} label="paper (on dark)" hex="#ece4d4" />
      </div>
    </div>
  )
}
function Swatch({ color, label, hex }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <div
        style={{
          width: 32,
          height: 32,
          background: color,
          borderRadius: 4,
          border: '1px solid oklch(0.85 0.01 70 / 0.5)',
        }}
      />
      <div>
        <div
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {label}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink)' }}>{hex}</div>
      </div>
    </div>
  )
}

// ---- Wordmark lockups ----
function Wordmark({ dark = false, iconSize = 96, fontSize = 72 }) {
  const ink = dark ? FINAL.inkFg : FINAL.ink
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: iconSize * 0.18 }}>
      <FinalIcon size={iconSize} dark={dark} />
      <span
        style={{
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          fontWeight: 500,
          fontSize: fontSize,
          color: ink,
          letterSpacing: '-0.015em',
          lineHeight: 1,
        }}
      >
        loam
      </span>
    </div>
  )
}

function FinalLockups() {
  return (
    <div className="stage">
      <div className="stage-header">
        <div className="stage-title">
          Wordmark <em>· lockups</em>
        </div>
        <div className="stage-meta">Newsreader italic · loam in lowercase</div>
      </div>

      {/* light card */}
      <div
        style={{
          padding: 36,
          background: FINAL.bg,
          borderRadius: 12,
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          alignItems: 'flex-start',
        }}
      >
        <Wordmark iconSize={120} fontSize={88} />
        <Wordmark iconSize={72} fontSize={56} />
        <Wordmark iconSize={36} fontSize={28} />
      </div>

      {/* dark card */}
      <div
        style={{
          padding: 36,
          background: FINAL.inkBg,
          borderRadius: 12,
          border: '1px solid oklch(0.32 0.02 60)',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
          alignItems: 'flex-start',
        }}
      >
        <Wordmark dark iconSize={120} fontSize={88} />
        <Wordmark dark iconSize={72} fontSize={56} />
        <Wordmark dark iconSize={36} fontSize={28} />
      </div>

      <div
        style={{
          fontSize: 13,
          color: 'var(--muted)',
          lineHeight: 1.6,
          fontFamily: 'Newsreader, serif',
          fontStyle: 'italic',
          maxWidth: '60ch',
        }}
      >
        The wordmark is set in Newsreader italic, all lowercase, with the icon's height matching the x-height-plus-cap
        region of the type. Optical alignment was tuned by eye, not metrics — the gap is roughly 18% of the icon size.
      </div>
    </div>
  )
}

// ---- Export grid + downloads ----
function FinalExports() {
  const [copied, setCopied] = useState(null)

  const downloadSVG = (svg, name) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exports = [
    {
      name: 'loam-icon-1024.svg',
      label: 'App icon · 1024',
      svg: () => buildLightSVG(1024),
      preview: <FinalIcon size={120} />,
    },
    {
      name: 'loam-icon-1024-dark.svg',
      label: 'App icon · 1024 (dark)',
      svg: () => buildDarkSVG(1024),
      preview: <FinalIcon size={120} dark />,
    },
    { name: 'loam-icon-180.svg', label: 'iOS · 180', svg: () => buildLightSVG(180), preview: <FinalIcon size={92} /> },
    { name: 'loam-icon-76.svg', label: 'iPad · 76', svg: () => buildLightSVG(76), preview: <FinalIcon size={76} /> },
    {
      name: 'loam-favicon-32.svg',
      label: 'Favicon · 32',
      svg: () => buildFaviconSVG(32),
      preview: <FinalFavicon size={48} />,
    },
    {
      name: 'loam-favicon-16.svg',
      label: 'Favicon · 16',
      svg: () => buildFaviconSVG(16),
      preview: <FinalFavicon size={32} />,
    },
  ]

  return (
    <div className="stage">
      <div className="stage-header">
        <div className="stage-title">
          Exports <em>· click to download SVG</em>
        </div>
        <div className="stage-meta">all sizes from one path</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {exports.map((e) => (
          <button
            key={e.name}
            onClick={() => {
              downloadSVG(e.svg(), e.name)
              setCopied(e.name)
              setTimeout(() => setCopied(null), 1200)
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: 20,
              border: '1px solid var(--line)',
              borderRadius: 8,
              background: 'var(--paper)',
              cursor: 'pointer',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
              color: 'var(--ink)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(ev) => (ev.currentTarget.style.background = 'oklch(0.94 0.012 80)')}
            onMouseLeave={(ev) => (ev.currentTarget.style.background = 'var(--paper)')}
          >
            <div style={{ minHeight: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {e.preview}
            </div>
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: 14, fontStyle: 'italic', color: 'var(--ink)' }}>
              {e.label}
            </div>
            <div
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: 9,
                color: copied === e.name ? FINAL.accent : 'var(--muted)',
              }}
            >
              {copied === e.name ? 'downloaded ↓' : e.name}
            </div>
          </button>
        ))}
      </div>
      <div
        style={{
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'JetBrains Mono, monospace',
          lineHeight: 1.6,
          marginTop: 6,
        }}
      >
        // need PNG instead? open the SVG in your browser, right-click → Save As, or drop into any converter.
        <br />
        // for an .ico, use realfavicongenerator.net with the 32px svg.
      </div>
    </div>
  )
}

// ---- Spec sheet ----
function FinalSpec() {
  return (
    <div className="stage">
      <div className="stage-header">
        <div className="stage-title">
          Spec <em>· construction</em>
        </div>
        <div className="stage-meta">1024 grid · iOS squircle</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start' }}>
        {/* spec rendering with measurements */}
        <div style={{ position: 'relative', width: 360, height: 360 }}>
          <FinalIcon size={360} />
          {/* overlay: dimensions */}
          <svg
            viewBox="0 0 1024 1024"
            width="360"
            height="360"
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {/* L bounding box */}
            <rect
              x="320"
              y="200"
              width="440"
              height="630"
              fill="none"
              stroke={FINAL.accent}
              strokeWidth="3"
              strokeDasharray="8 6"
              opacity="0.7"
            />
            {/* dimension ticks */}
            <line x1="320" y1="180" x2="760" y2="180" stroke={FINAL.accent} strokeWidth="2" opacity="0.7" />
            <text
              x="540"
              y="170"
              textAnchor="middle"
              fontSize="22"
              fill={FINAL.accent}
              fontFamily="JetBrains Mono, monospace"
            >
              440
            </text>
            <line x1="780" y1="200" x2="780" y2="830" stroke={FINAL.accent} strokeWidth="2" opacity="0.7" />
            <text x="800" y="520" fontSize="22" fill={FINAL.accent} fontFamily="JetBrains Mono, monospace">
              630
            </text>
            {/* seed */}
            <circle
              cx="690"
              cy="760"
              r="48"
              fill="none"
              stroke={FINAL.accent}
              strokeWidth="3"
              strokeDasharray="6 4"
              opacity="0.9"
            />
            <text
              x="690"
              y="900"
              textAnchor="middle"
              fontSize="20"
              fill={FINAL.accent}
              fontFamily="JetBrains Mono, monospace"
            >
              r=48
            </text>
          </svg>
        </div>
        <div
          style={{
            fontFamily: 'Newsreader, serif',
            fontSize: 14,
            lineHeight: 1.7,
            color: 'var(--ink)',
            maxWidth: '48ch',
          }}
        >
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 6,
            }}
          >
            geometry
          </div>
          <p style={{ margin: '0 0 14px' }}>
            The L is plotted on a 1024 grid. The vertical bar runs from <span className="mono">y=200</span> to{' '}
            <span className="mono">y=830</span>; the foot extends right to <span className="mono">x=760</span>. Stem
            width is <span className="mono">150</span>; foot height is <span className="mono">130</span>.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            The seed is a circle with <span className="mono">r=48</span> placed at{' '}
            <span className="mono">(690, 760)</span> — sitting in the negative space at the corner of the foot, slightly
            off the L's terminal. It anchors the composition without crowding the letter.
          </p>
          <div
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              margin: '18px 0 6px',
            }}
          >
            scaling rules
          </div>
          <p style={{ margin: 0 }}>
            At <span className="mono">≤ 32px</span> the icon switches to the favicon variant: a thicker L on a circular
            ground, with the seed enlarged to <span className="mono">r=68</span> and shifted to{' '}
            <span className="mono">(700, 780)</span> for visual balance at small sizes.
          </p>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, {
  FinalHero,
  FinalLockups,
  FinalExports,
  FinalSpec,
  FinalIcon,
  FinalFavicon,
})
