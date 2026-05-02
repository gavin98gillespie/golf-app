// screens-summary.jsx — Round Summary (cinematic ink — the post-18 moment)

function SummaryScreen({ palette }) {
  const P = palette;
  const round = ROUNDS[0]; // best round
  const c = COURSES[round.course];
  const totals = roundTotals(round);
  const fg = P.bone;

  return (
    <div style={{ background: P.ink, color: fg, minHeight: '100%', position: 'relative', overflow: 'hidden', paddingBottom: 80 }}>
      {/* ambient topo wash full-bleed */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
        <Topo seed={c.seed + '-hero'} width={400} height={874} rings={14}
          stroke={P.bone + '12'} strokeBold={P.bone + '24'}
          jitter={0.16} style={{ width: '100%', height: '100%' }} />
      </div>
      {/* dark gradient lift */}
      <div style={{ position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, ${P.ink}00 0%, ${P.ink}cc 40%, ${P.ink} 100%)` }} />

      <div style={{ position: 'relative', padding: '20px 24px 0' }}>
        {/* nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.6 }}>✕</span>
          <MonoBadge color={fg} bg="transparent" border={false}>round complete</MonoBadge>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.6 }}>↗</span>
        </div>

        {/* date / course mark */}
        <div style={{ marginTop: 50, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.55 }}>
            02·MAY·2026 · 4:12 PM
          </div>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 28, letterSpacing: '-0.02em' }}>
            Cypress Point
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.5 }}>
            Pebble Beach, CA · Blue · 6,524 yds
          </div>
        </div>

        {/* hero score */}
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.2em', opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              SCORE · NET
            </div>
            <ScoreNumeral value={totals.strokes} delta={totals.delta} size={140} color={fg} deltaColor={P.brass} />
          </div>
        </div>
        <div style={{
          marginTop: 6, paddingTop: 16,
          borderTop: `0.5px solid ${fg}22`,
          display: 'flex', justifyContent: 'space-between',
        }}>
          <Datum label="FRONT" value={totals.front} color={fg} />
          <Datum label="BACK" value={totals.back} color={fg} />
          <Datum label="BIRDIES" value={totals.birdies} color={fg} valueColor={P.brass} />
          <Datum label="EAGLES" value={totals.eagles} color={fg} valueColor={totals.eagles ? P.brass : fg} />
          <Datum label="GIR" value="14" color={fg} align="right" />
        </div>

        {/* moment */}
        <div style={{
          marginTop: 28, padding: '20px 20px',
          background: P.brass + '12',
          border: `0.5px solid ${P.brass}55`,
          borderRadius: 4, position: 'relative',
        }}>
          <Crosshair size={6} color={P.brass} style={{ position: 'absolute', top: 8, left: 8 }} />
          <Crosshair size={6} color={P.brass} style={{ position: 'absolute', top: 8, right: 8 }} />
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.brass }}>
            ◆ Moment of the round
          </div>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 22, letterSpacing: '-0.01em', marginTop: 8, lineHeight: 1.25 }}>
            Hole 16 · 218 yds · Par 3
          </div>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, marginTop: 4, opacity: 0.7, color: fg }}>
            <span style={{ color: P.brass }}>BIRDIE</span> · 2 strokes · pin high
          </div>
        </div>

        {/* hole grid */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 10 }}>
            Scorecard
          </div>
          <HoleGrid round={round} palette={P} dark={true} />
        </div>

        {/* score legend */}
        <div style={{
          marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap',
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.6,
        }}>
          <Legend dot={P.brass} label="Birdie" />
          <Legend dot={fg + '14'} label="Par" />
          <Legend dot={P.clay + '40'} label="Bogey" />
          <Legend dot={P.clay + '70'} label="Double+" />
        </div>

        {/* CTAs */}
        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button style={{
            background: P.bone, color: P.ink, border: 'none', height: 50, borderRadius: 2,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>Post to feed</button>
          <button style={{
            background: 'transparent', color: fg, border: `0.5px solid ${fg}55`, height: 50, borderRadius: 2,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, fontWeight: 500,
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>Save private</button>
        </div>
      </div>
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, background: dot, borderRadius: 1 }} />
      <span>{label}</span>
    </div>
  );
}

Object.assign(window, { SummaryScreen });
