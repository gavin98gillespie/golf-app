// screens-feed.jsx — Home feed (mutuals' rounds, Venmo-style)
// Score is the hero. Course rendered as topo. Two card variants for rhythm.

function FeedScreen({ palette, dark = true }) {
  const P = palette;
  const bg = dark ? P.ink : P.bone;
  const fg = dark ? P.bone : P.ink;
  const surface = dark ? P.graphite : '#EAE4D2';
  const hairline = dark ? P.bone + '14' : P.ink + '14';

  return (
    <div style={{ background: bg, color: fg, minHeight: '100%', paddingBottom: 100 }}>
      {/* Top bar */}
      <div style={{
        padding: '8px 20px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `0.5px solid ${hairline}`,
      }}>
        <Wordmark size={22} color={fg} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', opacity: 0.7 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke={fg} strokeWidth="1.2" />
            <line x1="12" y1="12" x2="16" y2="16" stroke={fg} strokeWidth="1.2" />
          </svg>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 2 L9 16 M2 9 L16 9" stroke={fg} strokeWidth="1.2" />
          </svg>
        </div>
      </div>

      {/* Section header */}
      <div style={{ padding: '20px 20px 10px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.2em', opacity: 0.5, textTransform: 'uppercase',
          }}>WEEK 18 · MAY 2026</div>
          <div style={{
            fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300,
            fontSize: 28, letterSpacing: '-0.02em', marginTop: 4,
          }}>Friends on the course</div>
        </div>
        <Datum label="ROUNDS" value="14" color={fg} align="right" />
      </div>

      {/* Cards */}
      <div style={{ padding: '8px 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ROUNDS.map((r, i) => (
          <RoundCard key={r.id} round={r} palette={P} dark={dark}
            variant={i === 0 ? 'hero' : i === 3 ? 'eagle' : 'standard'} />
        ))}
      </div>

      {/* Bottom tab bar */}
      <TabBar palette={P} dark={dark} active="feed" />
    </div>
  );
}

function RoundCard({ round, palette, dark, variant = 'standard' }) {
  const P = palette;
  const c = COURSES[round.course];
  const totals = roundTotals(round);
  const fg = dark ? P.bone : P.ink;
  const bg = dark ? P.graphite : '#EFE9D8';
  const hairline = fg + '1f';

  const isEagle = totals.eagles > 0 || variant === 'eagle';
  const isHero = variant === 'hero';

  return (
    <div style={{
      background: bg, borderRadius: 6, overflow: 'hidden', position: 'relative',
      border: `0.5px solid ${hairline}`,
    }}>
      {/* Topo background — bleed across full card top */}
      <div style={{ position: 'relative', height: isHero ? 168 : 132 }}>
        <div style={{ position: 'absolute', inset: 0, opacity: dark ? 0.85 : 0.7 }}>
          <Topo seed={c.seed + '-' + round.id} width={400} height={isHero ? 168 : 132}
            stroke={fg + '22'} strokeBold={fg + '38'}
            greenColor={isEagle ? P.brass + '40' : P.fairway + '55'}
            jitter={0.22} showPin pinColor={isEagle ? P.brass : P.fairway}
            style={{ width: '100%', height: '100%' }} />
        </div>
        {/* corner crosshairs */}
        <Crosshair size={8} color={fg} style={{ position: 'absolute', top: 10, left: 10, opacity: 0.6 }} />
        <Crosshair size={8} color={fg} style={{ position: 'absolute', top: 10, right: 10, opacity: 0.6 }} />
        {/* top metadata */}
        <div style={{ position: 'absolute', top: 14, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: fg, opacity: 0.7,
          }}>{round.date}</span>
          {isEagle && (
            <MonoBadge color={P.brass} bg="transparent" border={false}>◆ Eagle · 10</MonoBadge>
          )}
        </div>

        {/* course label bottom-left */}
        <div style={{ position: 'absolute', bottom: 12, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{
              fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300,
              fontSize: 17, letterSpacing: '-0.01em', color: fg,
            }}>{c.name}</div>
            <div style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: fg, opacity: 0.55, marginTop: 2,
            }}>{c.loc}</div>
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: fg, opacity: 0.55,
          }}>
            {round.tee.split('·')[0].trim()}
          </div>
        </div>
      </div>

      {/* Score block */}
      <div style={{
        padding: isHero ? '22px 24px 18px' : '18px 24px 14px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderTop: `0.5px solid ${hairline}`,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: fg, opacity: 0.55,
          }}>{round.display}</div>
          <ScoreNumeral
            value={totals.strokes}
            delta={totals.delta}
            size={isHero ? 76 : 60}
            color={fg}
            deltaColor={isEagle ? P.brass : (totals.delta < 0 ? P.brass : (totals.delta > 3 ? P.clay : fg + '99'))}
          />
          <div style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 10, letterSpacing: '0.04em', color: fg, opacity: 0.55,
          }}>
            par {totals.par} · front {totals.front} · back {totals.back}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end', paddingTop: 4 }}>
          <Datum label="BIRD" value={totals.birdies} color={fg} align="right" />
          <Datum label="EAGL" value={totals.eagles} color={fg} valueColor={totals.eagles > 0 ? P.brass : fg} align="right" />
        </div>
      </div>

      {/* Hole grid sparkline */}
      <HoleGrid round={round} palette={P} dark={dark} />

      {/* Note */}
      {round.note && (
        <div style={{
          padding: '14px 24px 12px',
          borderTop: `0.5px solid ${hairline}`,
          fontFamily: '"Fraunces", Georgia, serif',
          fontSize: 14, fontStyle: 'italic', fontWeight: 300,
          color: fg, opacity: 0.85, lineHeight: 1.4,
        }}>
          “{round.note}”
        </div>
      )}

      {/* Reactions */}
      <div style={{
        padding: '12px 20px 14px',
        borderTop: `0.5px solid ${hairline}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: 18 }}>
          <ReactBtn palette={P} fg={fg} icon="kudo" count={round.likes} />
          <ReactBtn palette={P} fg={fg} icon="comment" count={round.comments} />
        </div>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: fg, opacity: 0.4,
        }}>view round</span>
      </div>
    </div>
  );
}

function HoleGrid({ round, palette, dark, compact = false }) {
  const P = palette;
  const fg = dark ? P.bone : P.ink;
  // Color-code each hole by delta vs par
  const cell = (h, i) => {
    const isUnder = h.delta < 0;
    const isPar = h.delta === 0;
    const isOver = h.delta > 0;
    const bg =
      h.delta <= -2 ? P.brass :
      h.delta === -1 ? P.brass + '60' :
      h.delta === 0 ? fg + '14' :
      h.delta === 1 ? P.clay + '40' :
      P.clay + '70';
    const txt = h.delta <= -1 ? P.ink : (h.delta >= 2 ? P.bone : fg);
    return (
      <div key={i} style={{
        flex: 1, height: compact ? 22 : 28,
        background: bg,
        borderRadius: 1.5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: compact ? 9 : 10, fontWeight: 600, color: txt, lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>{h.score}</span>
        {(isUnder || h.delta <= -2) && (
          <div style={{ position: 'absolute', top: 1, right: 2, width: 3, height: 3, background: P.brass, borderRadius: '50%' }} />
        )}
      </div>
    );
  };
  return (
    <div style={{ padding: compact ? '8px 16px' : '10px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', gap: 2 }}>{round.holes.slice(0, 9).map(cell)}</div>
      <div style={{ display: 'flex', gap: 2 }}>{round.holes.slice(9).map(cell)}</div>
      {!compact && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 4,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: fg, opacity: 0.4,
        }}>
          <span>F · 1–9</span>
          <span>B · 10–18</span>
        </div>
      )}
    </div>
  );
}

function ReactBtn({ palette, fg, icon, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.75 }}>
      {icon === 'kudo' ? (
        // Flagstick icon
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="3" y1="2" x2="3" y2="12" stroke={fg} strokeWidth="1.2" />
          <path d="M3 2 L9 3.5 L3 5 Z" fill={fg} />
          <circle cx="3" cy="12" r="1" fill={fg} />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3 H12 V9 H7 L4 12 V9 H2 Z" stroke={fg} strokeWidth="1.1" />
        </svg>
      )}
      <span style={{
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11, fontVariantNumeric: 'tabular-nums', color: fg,
      }}>{count}</span>
    </div>
  );
}

function TabBar({ palette, dark, active }) {
  const P = palette;
  const fg = dark ? P.bone : P.ink;
  const bg = dark ? P.ink : P.bone;
  const items = [
    { id: 'feed', label: 'Feed' },
    { id: 'discover', label: 'Discover' },
    { id: 'play', label: '' },
    { id: 'me', label: 'Me' },
    { id: 'more', label: 'More' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: bg + 'EE',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: `0.5px solid ${fg}1a`,
      padding: '12px 24px 30px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      {items.map((it) => {
        if (it.id === 'play') {
          return (
            <button key={it.id} style={{
              width: 56, height: 56, borderRadius: '50%',
              background: P.brass, border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 16px ${P.brass}66`, padding: 0,
            }}>
              {/* tee + ball */}
              <svg width="22" height="22" viewBox="0 0 22 22">
                <circle cx="11" cy="6" r="3" fill={P.ink} />
                <line x1="11" y1="9" x2="11" y2="16" stroke={P.ink} strokeWidth="1.4" />
                <line x1="7" y1="16" x2="15" y2="16" stroke={P.ink} strokeWidth="1.4" />
              </svg>
            </button>
          );
        }
        return (
          <div key={it.id} style={{
            display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
            opacity: active === it.id ? 1 : 0.4,
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: fg, minWidth: 54,
          }}>
            <div style={{ width: 4, height: 4, background: fg, borderRadius: '50%', opacity: active === it.id ? 1 : 0 }} />
            {it.label}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { FeedScreen, RoundCard, HoleGrid, TabBar });
