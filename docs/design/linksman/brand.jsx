// brand.jsx — Linksman wordmark + brand brief panel
// Wordmark: condensed display serif "L" with a horizontal line cutting through (the "links" / horizon line)

function Wordmark({ size = 36, color = 'currentColor', tagline = false, style = {} }) {
  // L with a horizontal "horizon" tick that extends through the L bowl
  const h = size;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: size * 0.18, ...style }}>
      <svg width={h * 0.78} height={h} viewBox="0 0 78 100" style={{ overflow: 'visible' }}>
        {/* L stem */}
        <rect x="14" y="8" width="6" height="84" fill={color} />
        {/* L foot */}
        <rect x="14" y="86" width="58" height="6" fill={color} />
        {/* horizon tick across midline */}
        <line x1="0" y1="58" x2="78" y2="58" stroke={color} strokeWidth="1.2" />
        {/* small flag at end of horizon */}
        <path d="M72,52 L78,54 L72,56 Z" fill={color} />
      </svg>
      <span style={{
        fontFamily: '"Fraunces", "GT Super", Georgia, serif',
        fontWeight: 300,
        fontSize: size * 0.85,
        letterSpacing: '-0.02em',
        color,
        lineHeight: 1,
      }}>
        Linksman
      </span>
      {tagline && (
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: size * 0.22,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color,
          opacity: 0.6,
          marginLeft: size * 0.4,
          alignSelf: 'center',
        }}>
          EST. MMXXV
        </span>
      )}
    </div>
  );
}

function MonoBadge({ children, color = '#0E1410', bg = '#F4F0E6', border = true, style = {} }) {
  return (
    <span style={{
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10, fontWeight: 500,
      letterSpacing: '0.14em', textTransform: 'uppercase',
      color, background: bg,
      border: border ? `0.5px solid ${color}33` : 'none',
      padding: '4px 8px', borderRadius: 2,
      ...style,
    }}>{children}</span>
  );
}

// Score number — the hero numeral. Variable size, mono, tabular, tight.
function ScoreNumeral({ value, delta, size = 96, color = 'currentColor', deltaColor }) {
  const sign = delta == null ? '' : delta > 0 ? '+' : delta < 0 ? '−' : 'E';
  const dval = delta == null ? '' : delta === 0 ? '' : Math.abs(delta);
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: size * 0.12, lineHeight: 0.85 }}>
      <span style={{
        fontFamily: '"Fraunces", Georgia, serif',
        fontWeight: 300,
        fontSize: size,
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
        letterSpacing: '-0.04em',
        color,
      }}>{value}</span>
      {delta != null && (
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontWeight: 500,
          fontSize: size * 0.22,
          letterSpacing: '0.04em',
          color: deltaColor || color,
          opacity: 0.85,
        }}>{sign}{dval}</span>
      )}
    </div>
  );
}

// Mono datum — small label/value pair, broadcast-graphic style
function Datum({ label, value, color = 'currentColor', valueColor, align = 'left', style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: align === 'right' ? 'flex-end' : 'flex-start', ...style }}>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 9, fontWeight: 500,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color, opacity: 0.55, whiteSpace: 'nowrap',
      }}>{label}</span>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 13, fontWeight: 500,
        letterSpacing: '0.02em',
        fontVariantNumeric: 'tabular-nums',
        color: valueColor || color,
        whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  );
}

// Crosshair — the recurring telemetry motif (top-left corner mark)
function Crosshair({ size = 8, color = 'currentColor', style = {} }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      <line x1="0" y1={size/2} x2={size} y2={size/2} stroke={color} strokeWidth="0.7" />
      <line x1={size/2} y1="0" x2={size/2} y2={size} stroke={color} strokeWidth="0.7" />
    </svg>
  );
}

// Score color helper — semantic
function deltaColor(delta, palette) {
  if (delta <= -2) return palette.brass;       // eagle
  if (delta === -1) return palette.brass;      // birdie
  if (delta === 0) return palette.fg + '99';   // par
  if (delta === 1) return palette.fg + '66';   // bogey
  return palette.clay;                         // double+
}
function deltaLabel(delta) {
  if (delta <= -3) return 'ALB.';
  if (delta === -2) return 'EAGLE';
  if (delta === -1) return 'BIRDIE';
  if (delta === 0) return 'PAR';
  if (delta === 1) return 'BOGEY';
  if (delta === 2) return 'DBL';
  return `+${delta}`;
}

Object.assign(window, { Wordmark, MonoBadge, ScoreNumeral, Datum, Crosshair, deltaColor, deltaLabel });
