// screens-course.jsx — Course Detail with hole-by-hole layout
// Plus Hole Entry (live during round) and Weekly Summary card and Celebration

function CourseDetailScreen({ palette }) {
  const P = palette;
  const fg = P.ink;
  const bg = P.bone;
  const c = COURSES.cypress;

  // 18 holes with par + yardage (deterministic)
  const holes = STANDARD_PARS.map((par, i) => ({
    n: i + 1, par,
    yds: par === 3 ? 145 + (i * 11) % 80 : par === 5 ? 510 + (i * 17) % 60 : 380 + (i * 13) % 50,
    hcp: 1 + ((i * 7) % 18),
  }));

  return (
    <div style={{ background: bg, color: fg, minHeight: '100%', paddingBottom: 100 }}>
      {/* Top bar */}
      <div style={{ padding: '8px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.5 }}>‹</span>
        <MonoBadge color={fg} bg="transparent" border={false}>Course · 0428</MonoBadge>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.5 }}>♡</span>
      </div>

      {/* Course portrait */}
      <div style={{ height: 200, position: 'relative', borderTop: `0.5px solid ${fg}1a`, borderBottom: `0.5px solid ${fg}1a`, background: P.ink }}>
        <Topo seed={c.seed + '-course'} width={400} height={200} rings={9}
          stroke={P.bone + '1a'} strokeBold={P.bone + '40'}
          greenColor={P.fairway + '70'} fairwayColor={P.fairway} jitter={0.20}
          showPin pinColor={P.brass}
          style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} />
        <Crosshair size={8} color={P.bone} style={{ position: 'absolute', top: 12, left: 12, opacity: 0.7 }} />
        <Crosshair size={8} color={P.bone} style={{ position: 'absolute', top: 12, right: 12, opacity: 0.7 }} />
        <Crosshair size={8} color={P.bone} style={{ position: 'absolute', bottom: 12, left: 12, opacity: 0.7 }} />
        <Crosshair size={8} color={P.bone} style={{ position: 'absolute', bottom: 12, right: 12, opacity: 0.7 }} />
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
          Pebble Beach, CA · 17-MILE DRIVE
        </div>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 36, letterSpacing: '-0.02em', marginTop: 6 }}>
          Cypress Point
        </div>

        <div style={{
          marginTop: 18, padding: '14px 0',
          borderTop: `0.5px solid ${fg}1a`, borderBottom: `0.5px solid ${fg}1a`,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
        }}>
          <Datum label="PAR" value={c.par} color={fg} />
          <Datum label="RATING" value={c.rating} color={fg} />
          <Datum label="SLOPE" value={c.slope} color={fg} />
          <Datum label="YDS" value="6,524" color={fg} align="right" />
        </div>

        {/* Hole-by-hole */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
            Hole-by-hole
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.4 }}>
            yardage · par · hcp
          </span>
        </div>

        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {holes.map((h) => (
            <HoleCard key={h.n} hole={h} palette={P} seed={c.seed + '-h' + h.n} />
          ))}
        </div>
      </div>
      <TabBar palette={P} dark={false} active="discover" />
    </div>
  );
}

function HoleCard({ hole, palette, seed }) {
  const P = palette;
  return (
    <div style={{
      padding: 10, border: `0.5px solid ${P.ink}1a`, borderRadius: 3,
      display: 'flex', flexDirection: 'column', gap: 6, background: P.bone,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 22, letterSpacing: '-0.01em' }}>
          {String(hole.n).padStart(2, '0')}
        </span>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.16em', opacity: 0.5, textTransform: 'uppercase' }}>
          PAR {hole.par}
        </span>
      </div>
      <div style={{ height: 48, background: P.ink, borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
        <Topo seed={seed} width={170} height={48} rings={4}
          stroke={P.bone + '24'} strokeBold={P.bone + '50'}
          greenColor={P.fairway + '88'} jitter={0.22}
          showPin pinColor={P.brass}
          style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10,
        fontVariantNumeric: 'tabular-nums', color: P.ink + 'cc',
      }}>
        <span>{hole.yds} y</span>
        <span style={{ opacity: 0.55 }}>HCP {hole.hcp}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hole Entry — during round
// ─────────────────────────────────────────────────────────────
function HoleEntryScreen({ palette }) {
  const P = palette;
  const fg = P.bone;
  const bg = P.ink;

  return (
    <div style={{ background: bg, color: fg, height: 844, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* hero topo */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
        <Topo seed="cypress-h7" width={400} height={874} rings={6}
          stroke={fg + '1a'} strokeBold={fg + '38'}
          greenColor={P.fairway + '50'} jitter={0.22}
          showPin pinColor={P.brass} pinX={0.5} pinY={0.42}
          style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${P.ink}55 0%, ${P.ink}cc 60%, ${P.ink} 100%)` }} />

      <div style={{ position: 'relative', padding: '16px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, opacity: 0.6, whiteSpace: 'nowrap' }}>‹ exit round</span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: fg, opacity: 0.55, whiteSpace: 'nowrap' }}>ROUND</span>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 13, fontWeight: 500, color: fg, fontVariantNumeric: 'tabular-nums' }}>07/18</span>
          </div>
        </div>

        {/* hole title */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.6, whiteSpace: 'nowrap' }}>
            Hole 07 · 432 y · HCP 4
          </div>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 80, letterSpacing: '-0.04em', lineHeight: 0.85, marginTop: 6 }}>
            PAR 4
          </div>
        </div>

        {/* through-bar */}
        <div style={{
          marginTop: 22, padding: '12px 0',
          borderTop: `0.5px solid ${fg}22`, borderBottom: `0.5px solid ${fg}22`,
          display: 'flex', justifyContent: 'space-between', gap: 8,
        }}>
          <Datum label="THRU" value="6" color={fg} />
          <Datum label="STROKES" value="26" color={fg} />
          <Datum label="VS PAR" value="−1" color={fg} valueColor={P.brass} />
          <Datum label="PROJ" value="71" color={fg} valueColor={P.brass} align="right" />
        </div>

        {/* score input — large numeric stepper */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.55, whiteSpace: 'nowrap' }}>
              STROKES · HOLE 07
            </span>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.brass }}>
              ◆ Birdie
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <RoundBtn palette={P} fg={fg} char="−" />
            <span style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 96, letterSpacing: '-0.05em', lineHeight: 0.8, color: fg, fontVariantNumeric: 'tabular-nums' }}>
              3
            </span>
            <RoundBtn palette={P} fg={fg} char="+" />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['fairway', 'rough', 'sand', 'water'].map((tag, i) => (
              <span key={tag} style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                padding: '6px 10px', borderRadius: 2,
                border: `0.5px solid ${fg}33`,
                background: i === 0 ? fg + '14' : 'transparent',
                opacity: i === 0 ? 1 : 0.55,
              }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* CTA at bottom */}
        <div style={{ marginTop: 'auto' }}>
          <button style={{
            width: '100%', background: P.brass, color: P.ink, border: 'none', height: 54, borderRadius: 2,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.24em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          }}>
            <span>Hole 8 · Par 5</span>
            <span style={{ opacity: 0.6 }}>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RoundBtn({ palette, fg, char }) {
  return (
    <div style={{
      width: 54, height: 54, borderRadius: '50%',
      border: `0.5px solid ${fg}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 28,
      color: fg, opacity: 0.85,
    }}>{char}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Weekly Summary card (Sunday digest)
// ─────────────────────────────────────────────────────────────
function WeeklyScreen({ palette }) {
  const P = palette;
  const fg = P.bone;
  return (
    <div style={{ background: P.ink, color: fg, minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3 }}>
        <Topo seed="weekly-may" width={400} height={874} rings={12}
          stroke={fg + '14'} strokeBold={fg + '28'} jitter={0.18}
          style={{ width: '100%', height: '100%' }} />
      </div>
      <div style={{ position: 'relative', padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.6 }}>✕</span>
          <MonoBadge color={fg} bg="transparent" border={false}>weekly · w18</MonoBadge>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.6 }}>↗</span>
        </div>

        <div style={{ marginTop: 60 }}>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.55 }}>
            APR 27 — MAY 03 · WEEK 18
          </div>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 44, letterSpacing: '-0.02em', marginTop: 14, lineHeight: 1 }}>
            Three rounds.<br/>One eagle.
          </div>
        </div>

        {/* big stat block */}
        <div style={{
          marginTop: 36, padding: '24px 0',
          borderTop: `0.5px solid ${fg}22`, borderBottom: `0.5px solid ${fg}22`,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        }}>
          <Datum label="ROUNDS" value="3" color={fg} />
          <Datum label="AVG" value="78.7" color={fg} />
          <Datum label="BEST" value="74" color={fg} valueColor={P.brass} align="right" />
        </div>

        {/* day strip */}
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55, marginBottom: 14 }}>
            Activity
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {ME.weeks.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: '100%', height: 46,
                  background: d.r ? P.brass : fg + '10',
                  borderRadius: 1,
                }} />
                <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.5 }}>
                  {d.w[0]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* highlights */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Highlight palette={P} fg={fg} icon="◆" title="Eagle on 10" sub="BANDON DUNES · MAY 01" />
          <Highlight palette={P} fg={fg} icon="●" title="Sub-80 first time" sub="CYPRESS POINT · MAY 02" />
          <Highlight palette={P} fg={fg} icon="↓" title="Index −0.4 to 8.2" sub="TREND IMPROVING" />
        </div>
      </div>
    </div>
  );
}

function Highlight({ palette, fg, icon, title, sub }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 0',
      borderTop: `0.5px solid ${fg}1a`,
    }}>
      <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 18, color: palette.brass }}>
        {icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 18, color: fg, letterSpacing: '-0.01em' }}>
          {title}
        </div>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: fg, opacity: 0.5, marginTop: 4 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Celebration screen — eagle moment
// ─────────────────────────────────────────────────────────────
function CelebrationScreen({ palette }) {
  const P = palette;
  const fg = P.bone;
  return (
    <div style={{ background: P.ink, color: fg, height: 844, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* expanding rings */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} style={{
            position: 'absolute', top: -150, left: -150,
            width: 300 + i * 120, height: 300 + i * 120,
            marginLeft: -i * 60, marginTop: -i * 60,
            border: `0.5px solid ${P.brass}${Math.floor((1 - i * 0.18) * 80).toString(16).padStart(2, '0')}`,
            borderRadius: '50%',
          }} />
        ))}
      </div>
      {/* topo wash */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
        <Topo seed="eagle-moment" width={400} height={874} rings={8}
          stroke={P.brass + '40'} strokeBold={P.brass + '70'} jitter={0.20}
          style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{ position: 'relative', padding: '20px 24px 40px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.5 }}>✕</span>
        </div>

        {/* center stack */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', paddingTop: 20, paddingBottom: 30 }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase', color: P.brass }}>
            ◆ ◆ ◆
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.7 }}>
            Hole 10 · Par 4
          </span>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 88, letterSpacing: '-0.04em', color: P.brass, lineHeight: 0.9, marginTop: 4 }}>
            Eagle.
          </div>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 17, opacity: 0.85, maxWidth: 300, lineHeight: 1.35, marginTop: 6 }}>
            Drove the green at 287 yards.<br/>
            One putt for the second eagle of your life.
          </div>
        </div>

        {/* stat strip */}
        <div style={{
          padding: '18px 0',
          borderTop: `0.5px solid ${P.brass}55`, borderBottom: `0.5px solid ${P.brass}55`,
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <Datum label="STROKES" value="2" color={fg} valueColor={P.brass} />
          <Datum label="DRIVE" value="287y" color={fg} />
          <Datum label="LIFETIME" value="2" color={fg} align="right" />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{
            flex: 1, background: P.brass, color: P.ink, border: 'none', height: 50, borderRadius: 2,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>Save · Continue</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CourseDetailScreen, HoleEntryScreen, WeeklyScreen, CelebrationScreen, HoleCard });
