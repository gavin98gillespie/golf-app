// screens-profile.jsx — Profile hero + stats (cream/ink editorial)

function ProfileScreen({ palette }) {
  const P = palette;
  const fg = P.ink;
  const bg = P.bone;
  const hairline = fg + '1a';

  return (
    <div style={{ background: bg, color: fg, minHeight: '100%', paddingBottom: 100 }}>
      {/* Top bar */}
      <div style={{ padding: '8px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.5 }}>‹ back</span>
        <Wordmark size={18} color={fg} />
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.5 }}>···</span>
      </div>

      {/* Hero — large numeral handicap on cream */}
      <div style={{ padding: '24px 24px 24px', position: 'relative' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.5,
        }}>Member · Mar 2025 · No. 0428</div>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 36, letterSpacing: '-0.02em', marginTop: 12 }}>
          Mara Chen
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.55, marginTop: 4 }}>
          @mara.chen · Presidio, SF
        </div>

        {/* Big handicap numeral */}
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: `0.5px solid ${hairline}`, paddingTop: 24 }}>
          <div>
            <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.2em', opacity: 0.55, textTransform: 'uppercase' }}>
              Handicap Index
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 6 }}>
              <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 96, letterSpacing: '-0.04em', lineHeight: 0.85 }}>
                8.2
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 12, color: P.fairway }}>
                ↓ 0.4
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8 }}>
            <button style={{
              background: P.ink, color: P.bone, border: 'none', padding: '10px 18px', borderRadius: 2,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>Follow</button>
          </div>
        </div>

        {/* trend chart */}
        <TrendChart palette={P} />
      </div>

      {/* Stat strip */}
      <div style={{
        margin: '16px 24px', padding: '20px 0',
        borderTop: `0.5px solid ${hairline}`, borderBottom: `0.5px solid ${hairline}`,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
      }}>
        <Stat label="ROUNDS" v="47" />
        <Stat label="BEST" v="71" sub="Pebble" />
        <Stat label="AVG" v="82.4" />
        <Stat label="STREAK" v="6" sub="weeks" />
      </div>

      {/* Achievements */}
      <div style={{ padding: '20px 24px 6px' }}>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 12 }}>
          Achievements
        </div>
        <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
          <Achievement palette={P} icon="◆" label="First Eagle" sub="MAY 2026" highlight />
          <Achievement palette={P} icon="●" label="Sub-80" sub="APR 2026" />
          <Achievement palette={P} icon="▲" label="Course Best" sub="PRESIDIO" />
        </div>
      </div>

      {/* Recent rounds */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
            Recent rounds
          </div>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.4 }}>all 47 ›</span>
        </div>
        {ROUNDS.slice(0, 3).map((r) => (
          <RoundRow key={r.id} round={r} palette={P} />
        ))}
      </div>

      <TabBar palette={P} dark={false} active="me" />
    </div>
  );
}

function Stat({ label, v, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5 }}>
        {label}
      </span>
      <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 24, letterSpacing: '-0.02em' }}>
        {v}
      </span>
      {sub && (
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.45 }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function Achievement({ palette, icon, label, sub, highlight }) {
  const P = palette;
  return (
    <div style={{
      flex: 1, padding: '14px 12px',
      border: `0.5px solid ${P.ink}1a`,
      background: highlight ? P.brass + '14' : 'transparent',
      borderRadius: 3,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 18,
        color: highlight ? P.brass : P.ink, opacity: highlight ? 1 : 0.7,
      }}>{icon}</span>
      <div>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 14, color: P.ink, lineHeight: 1.1 }}>
          {label}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.5, marginTop: 4 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function RoundRow({ round, palette }) {
  const P = palette;
  const c = COURSES[round.course];
  const totals = roundTotals(round);
  return (
    <div style={{
      padding: '14px 0',
      borderTop: `0.5px solid ${P.ink}14`,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 36, height: 36, flexShrink: 0 }}>
        <MiniTopo seed={c.seed + round.id} size={36} color={P.fairway} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 16, color: P.ink }}>
          {c.name}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.5, marginTop: 2 }}>
          {round.date}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 22, fontVariantNumeric: 'tabular-nums', color: P.ink }}>
          {totals.strokes}
        </span>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, fontVariantNumeric: 'tabular-nums',
          color: totals.delta < 0 ? P.brass : (totals.delta > 3 ? P.clay : P.ink + '88'),
        }}>
          {totals.delta === 0 ? 'E' : (totals.delta > 0 ? '+' : '−') + Math.abs(totals.delta)}
        </span>
      </div>
    </div>
  );
}

function TrendChart({ palette }) {
  const P = palette;
  const data = TREND_12W;
  const W = 354, H = 70;
  const min = Math.min(...data) - 0.3;
  const max = Math.max(...data) + 0.3;
  const xStep = W / (data.length - 1);
  const yFor = (v) => H - ((v - min) / (max - min)) * H;
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * xStep).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  return (
    <div style={{ marginTop: 24, paddingTop: 18, borderTop: `0.5px solid ${P.ink}1a` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.55 }}>
          12-week trend
        </span>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.4 }}>
          {data[0].toFixed(1)} → {last.toFixed(1)}
        </span>
      </div>
      <svg width="100%" height={H + 18} viewBox={`0 -8 ${W} ${H + 18}`} preserveAspectRatio="none">
        {/* baseline guides */}
        <line x1="0" y1={H/2} x2={W} y2={H/2} stroke={P.ink} strokeWidth="0.4" strokeDasharray="2 3" opacity="0.2" />
        <path d={path} fill="none" stroke={P.fairway} strokeWidth="1.4" />
        {data.map((v, i) => (
          <circle key={i} cx={i * xStep} cy={yFor(v)} r={i === data.length - 1 ? 3 : 1.4}
            fill={i === data.length - 1 ? P.brass : P.fairway} />
        ))}
      </svg>
    </div>
  );
}

Object.assign(window, { ProfileScreen, TrendChart, RoundRow, Stat, Achievement });
