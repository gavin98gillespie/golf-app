// brand-card.jsx — Brand identity card (wordmark + palette + type + brief)

function BrandCard({ palette, accentName = 'brass' }) {
  const P = palette;
  // Accent metadata — name + role copy + token name shift with the active accent
  const ACCENTS = {
    brass:    { display: 'Brass',    role: 'achievement · birdie+', token: 'brass',    surfaceLabel: 'Ink',  surfaceHex: '#0E1410' },
    electric: { display: 'Sage',     role: 'achievement · birdie+', token: 'sage',     surfaceLabel: 'Ink',  surfaceHex: '#0E1410' },
    pure:     { display: 'Brass',    role: 'achievement · birdie+', token: 'brass',    surfaceLabel: 'Pitch',surfaceHex: '#070808' },
  };
  const A = ACCENTS[accentName] || ACCENTS.brass;
  return (
    <div style={{
      width: 880, padding: 48, background: P.bone, color: P.ink, borderRadius: 4,
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    }}>
      {/* header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `0.5px solid ${P.ink}33`, paddingBottom: 28 }}>
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.55 }}>
            BRAND · 01 · IDENTITY
          </span>
          <div style={{ marginTop: 18 }}>
            <Wordmark size={56} color={P.ink} tagline />
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.5 }}>VIBE</span>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 22, letterSpacing: '-0.01em', marginTop: 6 }}>
            Quiet. Precise. Earned.
          </div>
        </div>
      </div>

      {/* big concept */}
      <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48 }}>
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
            Concept
          </span>
          <p style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 28, letterSpacing: '-0.015em', lineHeight: 1.25, marginTop: 12, marginBottom: 0 }}>
            Modernist scorecard meets Tour broadcast. A cream-paper editorial world for the moments you reflect on. A cinematic ink-black broadcast world for the moments you live in. The hand-off between them <em>is</em> the brand.
          </p>
        </div>
        <div>
          <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
            Why "Linksman"
          </span>
          <p style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 16, lineHeight: 1.45, marginTop: 12, marginBottom: 0, opacity: 0.85 }}>
            Two syllables, membership-feel. Old word, modern delivery. Owns the heritage without being twee. The wordmark itself — an L cut by a horizon line ending in a pin — telegraphs what we do without spelling "golf".
          </p>
          <div style={{ marginTop: 22, paddingTop: 14, borderTop: `0.5px solid ${P.ink}1f`, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>Alternates</span>
            <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, opacity: 0.7, lineHeight: 1.6 }}>FAIRWAY · CADDIE · FORE · SUB&#8209;72</span>
          </div>
        </div>
      </div>

      {/* palette */}
      <div style={{ marginTop: 40 }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
          Palette
        </span>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <Swatch name={A.surfaceLabel} hex={P.ink} bg={P.ink} fg={P.bone} role="primary surface (live)" />
          <Swatch name="Bone" hex={P.bone} bg={P.bone} fg={P.ink} role="primary surface (editorial)" border />
          <Swatch name="Fairway" hex={P.fairway} bg={P.fairway} fg={P.bone} role="grass · charts" />
          <Swatch name={A.display} hex={P.brass} bg={P.brass} fg={P.ink} role={A.role} />
          <Swatch name="Clay" hex={P.clay} bg={P.clay} fg={P.bone} role="bogey · alert" />
          <Swatch name="Graphite" hex={P.graphite} bg={P.graphite} fg={P.bone} role="surface on ink" />
        </div>
      </div>

      {/* typography */}
      <div style={{ marginTop: 40 }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
          Typography
        </span>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          <TypeSpec
            label="Display"
            font="Fraunces"
            sample="71"
            sampleStyle={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 96, letterSpacing: '-0.04em', lineHeight: 0.9 }}
            note="Hero scores · big numerals. Light weight (300), tight tracking. Optical-size driven serif gives editorial weight without preciousness."
          />
          <TypeSpec
            label="Editorial"
            font="Fraunces"
            sample="Cypress Point"
            sampleStyle={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 28, letterSpacing: '-0.015em', fontStyle: 'normal' }}
            note="Course names · section titles · quoted notes (italic). Restrained. One step up from body. Never ALL CAPS."
          />
          <TypeSpec
            label="Telemetry"
            font="JetBrains Mono"
            sample="−1 · BIRDIE"
            sampleStyle={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 18, fontWeight: 500, letterSpacing: '0.04em' }}
            note="Stats · labels · timestamps. Tabular numerals. UPPERCASE with 0.18em tracking for chrome labels."
          />
        </div>
      </div>

      {/* tone */}
      <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 32 }}>
        <ToneCol label="Voice" items={[
          ['Quiet over loud', 'No exclamation points. No "Crushed it!" Confirm what happened, not how to feel about it.'],
          ['Precise units', 'Always specify yards, par, club. "Pin high on 16" beats "great shot".'],
          ['Earned compliments', 'Achievements are rare and weighted. The first eagle gets a fanfare. The second is a sentence.'],
        ]} />
        <ToneCol label="Don\u2019ts" items={[
          ['No emoji', 'Use brass diamonds (◆), monospace bullets (·), and crosshairs.'],
          ['No 3D / skeumorphism', 'No felt, no wood grain, no leather. Paper texture and ink are the only material metaphors.'],
          ['No course photos', 'Procedural topography only. Shareable, IP-clean, ownable.'],
        ]} />
      </div>

      {/* engineering brief */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: `0.5px solid ${P.ink}33` }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
          For engineering · React Native (Expo SDK 54)
        </span>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          <BriefBlock title="Tokens (NativeWind)" body={[
            `colors.ink      = ${P.ink}   colors.bone     = ${P.bone}`,
            `colors.fairway  = ${P.fairway}   colors.${A.token.padEnd(7)} = ${P.brass}`,
            `colors.clay     = ${P.clay}   colors.graphite = ${P.graphite}`,
          ]} />
          <BriefBlock title="Type" body={[
            'Replace Inter with Fraunces (display/editorial) +',
            'JetBrains Mono (telemetry).',
            'Both Google Fonts — load via expo-font.',
          ]} />
          <BriefBlock title="Topo renderer" body={[
            'react-native-svg + a seeded noise loop.',
            'Deterministic seed = `${courseSlug}-${holeNumber}`.',
            'Same input always renders the same SVG. No bitmaps.',
          ]} />
          <BriefBlock title="Surfaces" body={[
            'Editorial (cream): Profile, Course Detail, Friend list.',
            'Live (ink):  Hole entry, Round summary, Celebration.',
            'Feed: ink cards on a near-ink ground.',
          ]} />
        </div>
      </div>
    </div>
  );
}

function Swatch({ name, hex, bg, fg, role, border }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        height: 86, background: bg, borderRadius: 2,
        border: border ? '0.5px solid rgba(0,0,0,0.12)' : 'none',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute', bottom: 8, left: 10,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: fg, opacity: 0.7,
        }}>{hex}</span>
      </div>
      <div>
        <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 16 }}>{name}</div>
        <div style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.55, marginTop: 2 }}>
          {role}
        </div>
      </div>
    </div>
  );
}

function TypeSpec({ label, font, sample, sampleStyle, note }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>
          {label}
        </span>
        <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.14em', opacity: 0.4 }}>
          {font}
        </span>
      </div>
      <div style={{ ...sampleStyle, padding: '12px 0', borderTop: '0.5px solid rgba(0,0,0,0.12)', borderBottom: '0.5px solid rgba(0,0,0,0.12)' }}>
        {sample}
      </div>
      <p style={{ fontFamily: 'ui-sans-serif, system-ui', fontSize: 12, lineHeight: 1.5, opacity: 0.7, margin: 0 }}>
        {note}
      </p>
    </div>
  );
}

function ToneCol({ label, items }) {
  return (
    <div>
      <span style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.55 }}>
        {label}
      </span>
      <div style={{ marginTop: 10 }}>
        {items.map(([t, b], i) => (
          <div key={i} style={{ padding: '12px 0', borderTop: '0.5px solid rgba(0,0,0,0.12)' }}>
            <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 16 }}>{t}</div>
            <div style={{ fontFamily: 'ui-sans-serif, system-ui', fontSize: 12, lineHeight: 1.5, opacity: 0.7, marginTop: 4 }}>{b}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefBlock({ title, body }) {
  return (
    <div>
      <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontWeight: 300, fontSize: 16, marginBottom: 8 }}>
        {title}
      </div>
      {body.map((b, i) => (
        <div key={i} style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 11, lineHeight: 1.7, opacity: 0.75 }}>
          {b}
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { BrandCard });
