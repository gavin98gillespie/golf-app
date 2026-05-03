# Phase 5 — Linksman: Visual Identity + Product Depth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the app to **Linksman** and rebuild the visual layer top-to-bottom against a new editorial-broadcast direction. Add the missing product depth: OSM course import, GPS "near me" search, hole-by-hole detail entry (putts/fairway/GIR), achievement detection (eagle / first-of-its-kind / course best), and a Course Detail screen that doesn't currently exist. By the end, the app feels like a real product worth showing off when a friend shoots a great round — not a scaffolding.

**Architecture:**
- Visual swap is non-trivial but contained: a new theme module (`theme/linksman.ts`) replaces existing tokens; new components live alongside old ones until each screen is migrated. Old components removed once the screen that used them is migrated.
- Procedural topography (deterministic SVG rendered from a per-course seed) is the visual primitive — no licensed photography. Photos are an extension point added later (`courses.cover_image_url` reserved but unused in this phase).
- Course depth: OSM seed is imported once via a Node script; "Near me" uses `expo-location`; achievement detection is client-side over the round's hole array.
- No backend schema changes beyond two additive columns (`courses.osm_id` and `courses.cover_image_url`) and one new RPC (achievement queries). RLS unchanged.

**Tech Stack additions:**
- `@expo-google-fonts/fraunces` and `@expo-google-fonts/jetbrains-mono` (replaces Inter)
- `osmtogeojson` + `node-fetch` (CLI seed script only — never ships with the app)

**Spec deviations (from the original v1 brainstorm):**
- App name changes from working title "Golf App" to **Linksman**.
- Visual direction shifts from "dark sporty" to two-world editorial-broadcast (cream/Bone for reflection screens, ink/dark for live + feed).
- Bottom tab bar becomes 4 nav tabs + a center brass-circle Play action button.
- Inter is removed entirely — replaced by Fraunces (display serif) + JetBrains Mono (telemetry).
- Procedural topo replaces any plan to use course photos in v1.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` — Phase 4 tagged `phase-4`.

**Design canonical reference:** `docs/design/linksman/` — every implementation task references files in that folder. The two screenshots in `docs/design/linksman/uploads/` are visual ground truth for live hole entry and the Eagle celebration.

---

## File Structure

```
theme/
└── linksman.ts                         # NEW — color/type tokens, semantic role helpers

tailwind.config.js                      # MODIFIED — replace existing color/font tokens with Linksman tokens

components/
├── Wordmark.tsx                        # NEW — the L+horizon+pin logo
├── Topo.tsx                            # NEW — procedural topography SVG (RN port of topo.jsx)
├── ScoreNumeral.tsx                    # NEW — hero score + delta numeral (Fraunces + Mono)
├── Datum.tsx                           # NEW — broadcast-graphic label/value pair
├── MonoBadge.tsx                       # NEW — uppercase tracked badge
├── Crosshair.tsx                       # NEW — telemetry corner mark
├── HoleGrid.tsx                        # MODIFIED → REPLACED — replaces HoleScoreGrid; delta colors
├── FeedRoundCard.tsx                   # MODIFIED → REPLACED — full RoundCard rewrite (topo bg, score hero, hole grid)
├── TabBar.tsx                          # NEW — custom tab bar with center Play button
├── WeeklySummary.tsx                   # NEW — weekly stats card on Profile
├── EagleCelebration.tsx                # NEW — full-screen takeover for eagle/albatross/first-of-kind
├── ScreenContainer.tsx                 # MODIFIED — supports both 'ink' and 'bone' surface modes

app/
├── _layout.tsx                         # MODIFIED — load Fraunces + JetBrains Mono fonts at boot
├── (app)/
│   ├── (tabs)/
│   │   ├── _layout.tsx                 # MODIFIED — use new TabBar
│   │   ├── index.tsx                   # MODIFIED — feed redesign
│   │   ├── discover.tsx                # MODIFIED — reskin
│   │   └── profile.tsx                 # MODIFIED — editorial cream redesign
│   ├── round/
│   │   ├── [id].tsx                    # MODIFIED — Round Summary cinematic redesign
│   │   └── new/
│   │       ├── score.tsx               # MODIFIED — Live Hole Entry redesign (PAR 4 hero + telemetry)
│   │       └── summary.tsx             # MODIFIED — replaced by [id].tsx flow OR refactored
│   ├── course/
│   │   └── [id].tsx                    # MODIFIED — Course Detail redesign (topo hero + history)
│   ├── settings.tsx                    # MODIFIED — reskin
│   └── stats.tsx                       # MODIFIED — reskin
└── (auth)/
    ├── welcome.tsx                     # MODIFIED — Wordmark hero, brand voice
    ├── sign-in.tsx                     # MODIFIED
    ├── sign-up.tsx                     # MODIFIED
    └── profile-setup.tsx               # MODIFIED

lib/
├── achievements.ts                     # NEW — eagle/birdie/first-of-kind/course-best detection
├── courseSeed.ts                       # NEW — deterministic seed string for a course (used by Topo)
└── queries/
    └── osmImport.ts                    # NOT shipped — see scripts/

scripts/
└── seed-osm-courses.ts                 # NEW — Node CLI to pull OSM golf courses + insert into Supabase

supabase/migrations/
└── 20260506000001_phase5_courses_osm_id_and_cover.sql   # adds courses.osm_id (unique) + courses.cover_image_url

assets/
├── fonts/                              # populated by expo-google-fonts at build time (no manual files)
└── icon-linksman.png                   # NEW — app icon (user-supplied or generated)
```

---

## Phase 5 Tasks (12 total)

1. Brand foundation — rename, fonts, theme tokens, Tailwind config, ScreenContainer dual-mode
2. Visual primitives — Wordmark, Topo, ScoreNumeral, Datum, MonoBadge, Crosshair, HoleGrid
3. Custom TabBar with center Play button
4. Auth screens reskin (Welcome, Sign in, Sign up, Profile setup)
5. Home Feed redesign with new RoundCard
6. Live Hole Entry redesign (PAR hero + telemetry + putts/fairway/GIR)
7. Round Summary cinematic redesign + EagleCelebration moment
8. Profile editorial redesign + WeeklySummary card
9. Course Detail redesign (topo hero + your history)
10. Discover + Settings + Stats reskin
11. OSM course import + GPS "Near me"
12. Achievement detection wiring + voice pass + phone test + tag

---

## Task 1: Brand foundation

**Files:**
- Create: `theme/linksman.ts`
- Modify: `tailwind.config.js`
- Modify: `app.json` (display name + bundle ID)
- Install: `@expo-google-fonts/fraunces`, `@expo-google-fonts/jetbrains-mono`
- Modify: `app/_layout.tsx` (font loading)
- Modify: `components/ScreenContainer.tsx` (dual-mode ink/bone)

The foundation has to exist before anything else can use it. Theme tokens, fonts, and the dual-surface container land first.

- [ ] **Step 1.1: Install fonts**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npx expo install @expo-google-fonts/fraunces @expo-google-fonts/jetbrains-mono
  ```

  If peer-dep complaints: append `-- --legacy-peer-deps`.

- [ ] **Step 1.2: Uninstall Inter**

  ```bash
  npm uninstall @expo-google-fonts/inter --legacy-peer-deps
  ```

- [ ] **Step 1.3: Create `theme/linksman.ts`**

  ```ts
  // Linksman theme tokens. Single source of truth for color + type roles.
  // See docs/design/linksman/brand-card.jsx for the brief.

  export const palette = {
    ink: '#0E1410',       // primary surface (live, feed dark)
    bone: '#F4F0E6',      // primary surface (editorial)
    fairway: '#2D4A36',   // grass · charts
    sage: '#9BB89A',      // achievement · birdie+ (default accent)
    brass: '#B8924A',     // alt accent (saved for high achievement)
    clay: '#B94A3B',      // bogey · alert · double+
    graphite: '#1A2520',  // surface on ink
  } as const;

  // Semantic foreground/background pairs by surface mode.
  export const surface = {
    ink: { bg: palette.ink, fg: palette.bone, surface: palette.graphite, hairline: '#F4F0E61F' },
    bone: { bg: palette.bone, fg: palette.ink, surface: '#EAE4D2', hairline: '#0E14101F' },
  } as const;

  export type SurfaceMode = keyof typeof surface;

  // Score-delta semantics. Returns hex (no opacity suffixes here — caller adds).
  export function deltaColor(delta: number): string {
    if (delta <= -2) return palette.sage;     // eagle+
    if (delta === -1) return palette.sage;    // birdie
    if (delta === 0) return palette.bone;     // par (caller may want opacity)
    if (delta === 1) return palette.bone;     // bogey
    return palette.clay;                       // double+
  }

  export function deltaLabel(delta: number): string {
    if (delta <= -3) return 'ALB.';
    if (delta === -2) return 'EAGLE';
    if (delta === -1) return 'BIRDIE';
    if (delta === 0) return 'PAR';
    if (delta === 1) return 'BOGEY';
    if (delta === 2) return 'DBL';
    return `+${delta}`;
  }

  // Type role keys — referenced by font config.
  export const fontFamily = {
    display: 'Fraunces_300Light',
    displayItalic: 'Fraunces_300Light_Italic',
    editorial: 'Fraunces_400Regular',
    mono: 'JetBrainsMono_500Medium',
    monoBold: 'JetBrainsMono_600SemiBold',
  } as const;
  ```

- [ ] **Step 1.4: Replace `tailwind.config.js` color and font tokens**

  Read the current file first. Replace the `theme.extend.colors` block to use Linksman tokens (keeping every existing key by mapping it to a Linksman color, so existing classes don't break mid-migration):

  ```js
  // tailwind.config.js
  module.exports = {
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
    presets: [require('nativewind/preset')],
    theme: {
      extend: {
        colors: {
          // Linksman primitives
          ink: '#0E1410',
          bone: '#F4F0E6',
          fairway: '#2D4A36',
          sage: '#9BB89A',
          brass: '#B8924A',
          clay: '#B94A3B',
          graphite: '#1A2520',
          // Semantic aliases — keep old names working during migration
          'bg-base': '#0E1410',         // was #08100c
          'bg-surface': '#1A2520',      // was a slightly different graphite
          'border-subtle': '#F4F0E61F',
          'text-primary': '#F4F0E6',
          'text-secondary': '#F4F0E699',
          'accent': '#9BB89A',          // was #4ade80 (electric green)
        },
        fontFamily: {
          display: ['Fraunces_300Light'],
          'display-italic': ['Fraunces_300Light_Italic'],
          editorial: ['Fraunces_400Regular'],
          mono: ['JetBrainsMono_500Medium'],
          'mono-bold': ['JetBrainsMono_600SemiBold'],
        },
      },
    },
    plugins: [],
  };
  ```

  > Verify by skimming `app/(app)/(tabs)/index.tsx` etc. for `bg-base`, `text-primary`, `text-secondary`, `accent`, `border-subtle` — they should now render with Linksman values. Visual change is immediate.

- [ ] **Step 1.5: Load fonts in `app/_layout.tsx`**

  Read `app/_layout.tsx`. Find existing Inter font-loading (probably `useFonts` with Inter weights). Replace with:

  ```tsx
  import {
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_400Regular,
  } from '@expo-google-fonts/fraunces';
  import {
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  } from '@expo-google-fonts/jetbrains-mono';
  import { useFonts } from 'expo-font';

  // inside the layout component:
  const [fontsLoaded] = useFonts({
    Fraunces_300Light,
    Fraunces_300Light_Italic,
    Fraunces_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  if (!fontsLoaded) return null;
  ```

  Remove any Inter imports.

- [ ] **Step 1.6: Update `components/ScreenContainer.tsx` to dual-mode**

  Read it. It's currently a SafeAreaView with `bg-bg-base`. Update to take an optional `surface?: 'ink' | 'bone'` prop defaulting to `'ink'`:

  ```tsx
  import type { PropsWithChildren } from 'react';
  import { View } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';

  type Props = PropsWithChildren<{ surface?: 'ink' | 'bone' }>;

  export function ScreenContainer({ children, surface = 'ink' }: Props) {
    const bg = surface === 'bone' ? 'bg-bone' : 'bg-ink';
    return (
      <SafeAreaView className={`flex-1 ${bg}`}>
        <View className="flex-1 px-6">{children}</View>
      </SafeAreaView>
    );
  }
  ```

  Existing call sites without `surface` get ink (the same near-black they had).

- [ ] **Step 1.7: Update `app.json`**

  Change:
  - `expo.name`: `"Linksman"` (was `"golf-app"` or similar — verify by reading file)
  - `expo.scheme`: `"linksman"` (was `"golfapp"` if set, else add)
  - `expo.ios.bundleIdentifier`: keep as placeholder for now (`com.golfapp.app`) — user swaps in Phase 6 prep. Add a comment note in commit message.
  - `expo.splash.backgroundColor`: `"#0E1410"`

- [ ] **Step 1.8: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add theme/linksman.ts tailwind.config.js app.json "app/_layout.tsx" components/ScreenContainer.tsx package.json package-lock.json
  git commit -m "feat(brand): Linksman foundation — fonts, tokens, dual-surface container"
  ```

---

## Task 2: Visual primitives

**Files:**
- Create: `components/Wordmark.tsx`
- Create: `components/Topo.tsx`
- Create: `components/ScoreNumeral.tsx`
- Create: `components/Datum.tsx`
- Create: `components/MonoBadge.tsx`
- Create: `components/Crosshair.tsx`
- Replace: `components/HoleGrid.tsx` (replaces existing `HoleScoreGrid.tsx`)
- Delete (after migration in later tasks): `components/HoleScoreGrid.tsx`

Each is a faithful React-Native port of its `docs/design/linksman/*.jsx` counterpart. Use `react-native-svg` (already installed) and NativeWind for styling.

For every component below, the implementer should READ the canonical file in `docs/design/linksman/` first and treat it as the contract. The web JSX uses inline styles + serif/mono Google Fonts loaded via `<link>`; the RN port uses NativeWind classes (mapped from inline styles) + the fonts from `theme/linksman.ts` (`fontFamily.display`, `fontFamily.mono`, etc.).

- [ ] **Step 2.1: `components/Wordmark.tsx`**

  Reference: `docs/design/linksman/brand.jsx` lines 4–45.

  ```tsx
  import { Text, View } from 'react-native';
  import Svg, { Rect, Line, Path } from 'react-native-svg';

  import { fontFamily } from '@/theme/linksman';

  type Props = { size?: number; color?: string; tagline?: boolean };

  export function Wordmark({ size = 36, color = '#F4F0E6', tagline = false }: Props) {
    const h = size;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.18 }}>
        <Svg width={h * 0.78} height={h} viewBox="0 0 78 100">
          <Rect x={14} y={8} width={6} height={84} fill={color} />
          <Rect x={14} y={86} width={58} height={6} fill={color} />
          <Line x1={0} y1={58} x2={78} y2={58} stroke={color} strokeWidth={1.2} />
          <Path d="M72,52 L78,54 L72,56 Z" fill={color} />
        </Svg>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: size * 0.85,
            letterSpacing: -size * 0.85 * 0.02,
            color,
            lineHeight: size * 0.85,
          }}
        >
          Linksman
        </Text>
        {tagline ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: size * 0.22,
              letterSpacing: 1.6,
              color,
              opacity: 0.6,
              marginLeft: size * 0.4,
            }}
          >
            EST. MMXXV
          </Text>
        ) : null}
      </View>
    );
  }
  ```

- [ ] **Step 2.2: `components/Topo.tsx`**

  Reference: `docs/design/linksman/topo.jsx`. Faithful port — keep `mulberry32` rng + `hash` + `loop` + `pathFromLoop` helpers. Convert the web SVG element to `react-native-svg`. Memoize the loops via `useMemo` keyed on (seed, width, height, rings, jitter).

  ```tsx
  import { useMemo } from 'react';
  import Svg, { Path, G, Line, Circle } from 'react-native-svg';

  // mulberry32 PRNG — same as docs/design/linksman/topo.jsx
  function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(str: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function loop(
    rand: () => number,
    cx: number,
    cy: number,
    baseR: number,
    jitter: number,
    points = 64,
  ): [number, number][] {
    const phases = Array.from({ length: 5 }, () => rand() * Math.PI * 2);
    const amps = [1.0, 0.55, 0.32, 0.18, 0.1];
    const freqs = [1, 2, 3, 5, 8];
    const pts: [number, number][] = [];
    for (let i = 0; i < points; i++) {
      const t = (i / points) * Math.PI * 2;
      let n = 0;
      for (let k = 0; k < phases.length; k++) {
        n += Math.sin(t * freqs[k]! + phases[k]!) * amps[k]!;
      }
      n /= 2.15;
      const r = baseR * (1 + n * jitter);
      pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return pts;
  }
  function pathFromLoop(pts: [number, number][]): string {
    let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += `L${pts[i]![0].toFixed(1)},${pts[i]![1].toFixed(1)}`;
    }
    return d + 'Z';
  }

  type Props = {
    seed: string;
    width?: number;
    height?: number;
    rings?: number;
    stroke?: string;
    strokeBold?: string;
    greenColor?: string | null;
    jitter?: number;
    showPin?: boolean;
    pinColor?: string;
  };

  export function Topo({
    seed,
    width = 400,
    height = 240,
    rings = 8,
    stroke = 'rgba(244,240,230,0.18)',
    strokeBold = 'rgba(244,240,230,0.32)',
    greenColor = null,
    jitter = 0.18,
    showPin = false,
    pinColor = '#9BB89A',
  }: Props) {
    const data = useMemo(() => {
      const s = hashStr(seed);
      const r = rng(s);
      const cx = width * (0.35 + r() * 0.3);
      const cy = height * (0.4 + r() * 0.3);
      const baseR = Math.min(width, height) * (0.18 + r() * 0.06);
      const loops: [number, number][][] = [];
      for (let i = 0; i < rings; i++) {
        const ringR = baseR + i * (Math.min(width, height) * 0.07);
        loops.push(loop(r, cx, cy, ringR, jitter * (1 + i * 0.05), 96));
      }
      const px = cx + (r() - 0.5) * baseR * 0.3;
      const py = cy + (r() - 0.5) * baseR * 0.3;
      return { loops, px, py };
    }, [seed, width, height, rings, jitter]);

    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {data.loops.map((pts, i) => (
          <Path
            key={i}
            d={pathFromLoop(pts)}
            fill={i === 0 && greenColor ? greenColor : 'none'}
            stroke={i === 0 ? strokeBold : stroke}
            strokeWidth={i === 0 ? 1.2 : 0.7}
            opacity={i === 0 ? 0.95 : 0.6 + (i / data.loops.length) * 0.3}
          />
        ))}
        {showPin ? (
          <G>
            <Line x1={data.px} y1={data.py} x2={data.px} y2={data.py - 22} stroke={pinColor} strokeWidth={1} />
            <Path d={`M${data.px},${data.py - 22} L${data.px + 8},${data.py - 19} L${data.px},${data.py - 16} Z`} fill={pinColor} />
            <Circle cx={data.px} cy={data.py} r={1.6} fill={pinColor} />
          </G>
        ) : null}
      </Svg>
    );
  }
  ```

- [ ] **Step 2.3: `components/ScoreNumeral.tsx`**

  Reference: `docs/design/linksman/brand.jsx` lines 62–87.

  ```tsx
  import { Text, View } from 'react-native';
  import { fontFamily } from '@/theme/linksman';

  type Props = {
    value: number | string;
    delta?: number | null;
    size?: number;
    color?: string;
    deltaColor?: string;
  };

  export function ScoreNumeral({ value, delta, size = 96, color = '#F4F0E6', deltaColor }: Props) {
    const sign = delta == null ? '' : delta > 0 ? '+' : delta < 0 ? '−' : 'E';
    const dval = delta == null ? '' : delta === 0 ? '' : Math.abs(delta);
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.12 }}>
        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: size,
            letterSpacing: -size * 0.04,
            color,
            lineHeight: size * 0.9,
            fontVariant: ['tabular-nums', 'lining-nums'],
          }}
        >
          {value}
        </Text>
        {delta != null ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: size * 0.22,
              letterSpacing: size * 0.22 * 0.04,
              color: deltaColor ?? color,
              opacity: 0.85,
            }}
          >
            {sign}
            {dval}
          </Text>
        ) : null}
      </View>
    );
  }
  ```

- [ ] **Step 2.4: `components/Datum.tsx`**

  Reference: `docs/design/linksman/brand.jsx` lines 90–109.

  ```tsx
  import { Text, View } from 'react-native';
  import { fontFamily } from '@/theme/linksman';

  type Props = {
    label: string;
    value: string | number;
    color?: string;
    valueColor?: string;
    align?: 'left' | 'right';
  };

  export function Datum({ label, value, color = '#F4F0E6', valueColor, align = 'left' }: Props) {
    return (
      <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start', gap: 4 }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.18,
            color,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 13,
            letterSpacing: 13 * 0.02,
            color: valueColor ?? color,
            fontVariant: ['tabular-nums'],
          }}
        >
          {String(value)}
        </Text>
      </View>
    );
  }
  ```

- [ ] **Step 2.5: `components/MonoBadge.tsx`**

  Reference: `docs/design/linksman/brand.jsx` lines 47–59.

  ```tsx
  import type { PropsWithChildren } from 'react';
  import { Text, View } from 'react-native';
  import { fontFamily } from '@/theme/linksman';

  type Props = PropsWithChildren<{
    color?: string;
    bg?: string;
    border?: boolean;
  }>;

  export function MonoBadge({ children, color = '#0E1410', bg = '#F4F0E6', border = true }: Props) {
    return (
      <View
        style={{
          backgroundColor: bg,
          borderWidth: border ? StyleSheet.hairlineWidth : 0,
          borderColor: `${color}33`,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: 2,
          alignSelf: 'flex-start',
        }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 10,
            letterSpacing: 10 * 0.14,
            color,
            textTransform: 'uppercase',
          }}
        >
          {children}
        </Text>
      </View>
    );
  }

  // Add at top of file:
  // import { StyleSheet } from 'react-native';
  ```

- [ ] **Step 2.6: `components/Crosshair.tsx`**

  Reference: `docs/design/linksman/brand.jsx` lines 112–119.

  ```tsx
  import Svg, { Line } from 'react-native-svg';

  type Props = { size?: number; color?: string; opacity?: number };

  export function Crosshair({ size = 8, color = '#F4F0E6', opacity = 0.6 }: Props) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} opacity={opacity}>
        <Line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={color} strokeWidth={0.7} />
        <Line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={color} strokeWidth={0.7} />
      </Svg>
    );
  }
  ```

- [ ] **Step 2.7: Replace `components/HoleGrid.tsx`** (was `HoleScoreGrid.tsx`)

  Reference: `docs/design/linksman/screens-feed.jsx` lines 186–237 (`HoleGrid` function).

  Behavior: takes a `holes: { score, par, delta }[]` array. Renders two rows (1–9 / 10–18). Each cell color-coded by delta:
  - `delta <= -2`: solid sage
  - `delta === -1`: sage at 60% opacity
  - `delta === 0`: fg at 14% opacity
  - `delta === 1`: clay at 40% opacity
  - `delta >= 2`: clay at 70% opacity

  Show the score number in mono. A small dot top-right when under par.

  ```tsx
  import { Text, View } from 'react-native';
  import { palette } from '@/theme/linksman';
  import { fontFamily } from '@/theme/linksman';

  type Hole = { score: number; par: number; delta: number };
  type Props = {
    holes: Hole[];
    fg?: string;
    compact?: boolean;
  };

  export function HoleGrid({ holes, fg = palette.bone, compact = false }: Props) {
    const cellHeight = compact ? 22 : 28;
    const fontSize = compact ? 9 : 10;

    const cellColor = (delta: number): { bg: string; txt: string; underdot: boolean } => {
      if (delta <= -2) return { bg: palette.sage, txt: palette.ink, underdot: true };
      if (delta === -1) return { bg: palette.sage + '99', txt: palette.ink, underdot: true };
      if (delta === 0) return { bg: fg + '24', txt: fg, underdot: false };
      if (delta === 1) return { bg: palette.clay + '66', txt: fg, underdot: false };
      return { bg: palette.clay + 'B3', txt: palette.bone, underdot: false };
    };

    const renderCell = (h: Hole, i: number) => {
      const c = cellColor(h.delta);
      return (
        <View
          key={i}
          style={{
            flex: 1,
            height: cellHeight,
            backgroundColor: c.bg,
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            marginHorizontal: 1,
          }}
        >
          <Text
            style={{
              fontFamily: fontFamily.monoBold,
              fontSize,
              color: c.txt,
              fontVariant: ['tabular-nums'],
            }}
          >
            {h.score}
          </Text>
          {c.underdot ? (
            <View
              style={{
                position: 'absolute',
                top: 1,
                right: 2,
                width: 3,
                height: 3,
                backgroundColor: palette.sage,
                borderRadius: 1.5,
              }}
            />
          ) : null}
        </View>
      );
    };

    const front = holes.slice(0, 9);
    const back = holes.slice(9, 18);

    return (
      <View style={{ paddingHorizontal: compact ? 16 : 20, paddingVertical: compact ? 8 : 10, gap: 4 }}>
        <View style={{ flexDirection: 'row' }}>{front.map(renderCell)}</View>
        {back.length > 0 ? <View style={{ flexDirection: 'row' }}>{back.map(renderCell)}</View> : null}
        {!compact ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 8,
                letterSpacing: 8 * 0.16,
                color: fg,
                opacity: 0.4,
                textTransform: 'uppercase',
              }}
            >
              F · 1–9
            </Text>
            {back.length > 0 ? (
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 8,
                  letterSpacing: 8 * 0.16,
                  color: fg,
                  opacity: 0.4,
                  textTransform: 'uppercase',
                }}
              >
                B · 10–18
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }
  ```

- [ ] **Step 2.8: Mass-find existing `HoleScoreGrid` references**

  ```bash
  grep -rln "HoleScoreGrid" app components lib
  ```

  Don't change them yet — Tasks 5/6/7 migrate the call sites. Note the file list in commit message.

- [ ] **Step 2.9: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add components/Wordmark.tsx components/Topo.tsx components/ScoreNumeral.tsx components/Datum.tsx components/MonoBadge.tsx components/Crosshair.tsx components/HoleGrid.tsx
  git commit -m "feat(linksman): visual primitives — Wordmark, Topo, ScoreNumeral, Datum, MonoBadge, Crosshair, HoleGrid"
  ```

---

## Task 3: Custom TabBar with center Play button

**Files:**
- Create: `components/TabBar.tsx`
- Modify: `app/(app)/(tabs)/_layout.tsx`

The tab bar gets four nav tabs (Feed, Discover, Me, More) plus a center brass circle with a tee+ball glyph that opens the Start Round flow. Reference: `docs/design/linksman/screens-feed.jsx` lines 262–316.

- [ ] **Step 3.1: Create `components/TabBar.tsx`**

  ```tsx
  import { Pressable, Text, View } from 'react-native';
  import { router } from 'expo-router';
  import Svg, { Circle, Line } from 'react-native-svg';

  import { palette, fontFamily } from '@/theme/linksman';

  type TabItem = {
    name: 'index' | 'discover' | 'profile' | 'more';
    label: string;
    onPress?: () => void;
  };

  const ITEMS: TabItem[] = [
    { name: 'index', label: 'Feed' },
    { name: 'discover', label: 'Discover' },
    { name: 'profile', label: 'Me' },
    { name: 'more', label: 'More' },
  ];

  type Props = { active: TabItem['name'] };

  export function TabBar({ active }: Props) {
    return (
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 30,
          backgroundColor: palette.ink + 'EE',
          borderTopWidth: 0.5,
          borderTopColor: palette.bone + '1A',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {ITEMS.slice(0, 2).map((it) => (
          <TabCell key={it.name} item={it} active={active === it.name} />
        ))}
        <PlayButton />
        {ITEMS.slice(2).map((it) => (
          <TabCell key={it.name} item={it} active={active === it.name} />
        ))}
      </View>
    );
  }

  function TabCell({ item, active }: { item: TabItem; active: boolean }) {
    const onPress = () => {
      if (item.name === 'index') router.replace('/(app)/(tabs)');
      else if (item.name === 'discover') router.replace('/(app)/(tabs)/discover');
      else if (item.name === 'profile') router.replace('/(app)/(tabs)/profile');
      // 'more' opens settings for now
      else router.push('/(app)/settings');
    };
    return (
      <Pressable
        onPress={onPress}
        style={{ alignItems: 'center', minWidth: 54, gap: 4, opacity: active ? 1 : 0.4 }}
      >
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: palette.bone,
            opacity: active ? 1 : 0,
          }}
        />
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.16,
            color: palette.bone,
            textTransform: 'uppercase',
          }}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  }

  function PlayButton() {
    return (
      <Pressable
        onPress={() => router.push('/(app)/(tabs)/start')}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: palette.brass,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: palette.brass,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
        }}
      >
        <Svg width={22} height={22} viewBox="0 0 22 22">
          <Circle cx={11} cy={6} r={3} fill={palette.ink} />
          <Line x1={11} y1={9} x2={11} y2={16} stroke={palette.ink} strokeWidth={1.4} />
          <Line x1={7} y1={16} x2={15} y2={16} stroke={palette.ink} strokeWidth={1.4} />
        </Svg>
      </Pressable>
    );
  }
  ```

- [ ] **Step 3.2: Modify `app/(app)/(tabs)/_layout.tsx` to hide the default tab bar**

  Read the file. The `<Tabs>` from expo-router renders its own default tab bar. We replace it.

  Set `tabBar={() => null}` on `<Tabs>` and render our custom `<TabBar />` from each tab screen instead — OR set `screenOptions={{ tabBarStyle: { display: 'none' } }}` and render the custom tab bar at the layout level via absolute positioning over each screen.

  Cleanest: use the `tabBar` render prop:

  ```tsx
  import { Tabs } from 'expo-router';
  import { TabBar } from '@/components/TabBar';

  export default function TabsLayout() {
    return (
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => {
          const route = props.state.routes[props.state.index];
          return <TabBar active={(route?.name as 'index' | 'discover' | 'profile') ?? 'index'} />;
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="discover" />
        <Tabs.Screen name="start" options={{ href: null }} />
        <Tabs.Screen name="profile" />
      </Tabs>
    );
  }
  ```

  > `start` is hidden from the tab bar (`href: null`) — the Play button in the center routes to it. The new-followers green badge and `useNewFollowersCount` you wired in Phase 3b should be removed from this layout (it's now part of the `Me` cell's own logic — implement in Task 8).

- [ ] **Step 3.3: Run on device + commit**

  Reload Expo Go. Verify:
  - Custom tab bar shows: Feed · Discover · [brass circle] · Me · More
  - Tapping each tab works.
  - The brass circle pushes to the Start Round flow.

  ```bash
  npx tsc --noEmit && npm run lint
  git add components/TabBar.tsx "app/(app)/(tabs)/_layout.tsx"
  git commit -m "feat(linksman): custom tab bar with center brass Play button"
  ```

---

## Task 4: Auth screens reskin

**Files:**
- Modify: `app/(auth)/welcome.tsx`
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`
- Modify: `app/(auth)/profile-setup.tsx`

Apply the editorial cream surface (`<ScreenContainer surface="bone">`) to auth. Wordmark hero on the welcome screen. Replace any Inter typography (`font-light`, `font-semibold`) with Fraunces/JetBrains Mono via the new theme. Apply the brand voice — quiet, precise, no exclamation points.

For each file: read it, identify the typography classes and copy strings, replace. Don't change the form logic / mutation calls / validation — only the visual layer + copy.

- [ ] **Step 4.1: Read all four files first**

  ```bash
  cat "/Users/gavingillespie/Desktop/Golf App/app/(auth)/welcome.tsx" \
      "/Users/gavingillespie/Desktop/Golf App/app/(auth)/sign-in.tsx" \
      "/Users/gavingillespie/Desktop/Golf App/app/(auth)/sign-up.tsx" \
      "/Users/gavingillespie/Desktop/Golf App/app/(auth)/profile-setup.tsx"
  ```

- [ ] **Step 4.2: Update `welcome.tsx`**

  Change the surface to `bone`. Render `<Wordmark size={64} color="#0E1410" tagline />` as the hero. Replace any "Welcome to Golf App" / "Hello, Golf" copy with "Quiet. Precise. Earned." or similar.

  Two CTAs: "Sign in" and "Create account". Use a styled `<Pressable>` matching the design language — a Pressable with `border border-ink rounded-full` for the secondary CTA, `bg-ink rounded-full` with bone text for the primary.

  Text styles: use `style={{ fontFamily: fontFamily.display, fontSize: 32, letterSpacing: -0.6 }}` for hero text, `fontFamily: fontFamily.mono` for telemetry-style labels.

- [ ] **Step 4.3: Update `sign-in.tsx` and `sign-up.tsx`**

  Bone surface. Headers use Fraunces. Form inputs reskinned: `border-b border-ink/20` (no rounded boxes — editorial line inputs). Submit buttons follow the welcome pattern.

  Error text: replace existing red with `clay` color (`#B94A3B`). Keep `Alert` patterns for confirm-email pending state.

- [ ] **Step 4.4: Update `profile-setup.tsx`**

  Same treatment. The username + display-name + bio fields become editorial line-inputs. The avatar picker (if any) gets a small Wordmark or topographic placeholder.

- [ ] **Step 4.5: Verify on device**

  Reload Expo Go, run through Sign Up → Profile Setup → Sign In on a fresh test account.

- [ ] **Step 4.6: Commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add "app/(auth)"
  git commit -m "feat(linksman): auth screens reskinned to editorial bone surface"
  ```

---

## Task 5: Home Feed redesign

**Files:**
- Replace: `components/FeedRoundCard.tsx`
- Modify: `app/(app)/(tabs)/index.tsx`

The feed is the centerpiece. Reference: `docs/design/linksman/screens-feed.jsx` (entire file, but especially `FeedScreen` lines 4–58 and `RoundCard` lines 60–184).

The new RoundCard has:
1. **Topo backdrop** — Topo SVG bleeds across the top 132–168px of the card, with subtle stroke colors derived from fg.
2. **Crosshair corner marks** — top-left and top-right.
3. **Top-left**: round date in mono UPPERCASE.
4. **Top-right**: if eagle, `<MonoBadge>◆ Eagle · 10</MonoBadge>` (10 = hole number).
5. **Bottom-left of topo block**: course name in Fraunces 17, location in mono small.
6. **Bottom-right of topo block**: tee box in mono small.
7. **Score block** (below topo) — display name in mono, then `<ScoreNumeral value={total} delta={delta} size={isHero ? 76 : 60}/>`, then `par X · front Y · back Z`.
8. **Right side of score block**: stacked Datum cells for BIRD and EAGL.
9. **HoleGrid** — replaces the separator line.
10. **Italic note quote** — `“finally pin high on 16.”` in Fraunces italic.
11. **Reactions row** — flagstick icon + kudo count, message-bubble icon + comment count, "view round" mono right-aligned.

Replace the existing `components/FeedRoundCard.tsx` whole-file. Update `app/(app)/(tabs)/index.tsx` to:
- Render the new section header: `WEEK X · MAY 2026` in mono, then `Friends on the course` in Fraunces 28.
- Show a Datum at right: `ROUNDS · 14` (count of rounds visible this week — if compute is annoying, just show feed length).

- [ ] **Step 5.1: Replace `components/FeedRoundCard.tsx`** entirely. Use the canonical `screens-feed.jsx` `RoundCard` as the spec; port to RN. The web version uses inline styles; the RN version should use `style={{...}}` for component-specific styles and theme tokens for colors. Use `<Topo>`, `<Crosshair>`, `<MonoBadge>`, `<ScoreNumeral>`, `<Datum>`, `<HoleGrid>` — all from Task 2.

  Notes for the implementer:
  - The `seed` for `<Topo>` must be deterministic per round. Use `${course.id}-${round.id}` (or just `course.id` for simpler topo per course).
  - Outer card: `bg-graphite border-[0.5px] border-bone/[0.12] rounded-md overflow-hidden`.
  - The inline `like` toggle from Phase 3b stays — port it to use the flagstick icon (`Svg<Line + Path + Circle>`), not the heart emoji. See `screens-feed.jsx` `ReactBtn` lines 239–260.
  - Comment icon becomes a small message-bubble SVG (also in `ReactBtn`).
  - "view round" navigates to round detail (existing behavior).

- [ ] **Step 5.2: Modify `app/(app)/(tabs)/index.tsx`**

  Wrap content in a `<FlatList>`. The list header is:
  ```tsx
  <View>
    <View style={{ paddingTop: 8, paddingBottom: 14, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: palette.bone + '14' }}>
      <Wordmark size={22} />
      {/* search and notifications icons (small SVG, optional placeholder) */}
    </View>
    <View style={{ paddingTop: 20, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.bone, opacity: 0.5, textTransform: 'uppercase' }}>WEEK {currentWeek} · MAY 2026</Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 28, letterSpacing: -28 * 0.02, color: palette.bone, marginTop: 4 }}>Friends on the course</Text>
      </View>
      <Datum label="ROUNDS" value={feed.length} align="right" />
    </View>
  </View>
  ```
  Compute `currentWeek` via `import { getWeek } from 'date-fns'; getWeek(new Date())`.

  Keep the in-progress draft banner (Phase 1 feature). Re-style its container to use the new tokens but preserve logic.

- [ ] **Step 5.3: Verify on device + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add components/FeedRoundCard.tsx "app/(app)/(tabs)/index.tsx"
  git commit -m "feat(linksman): home feed redesign with new RoundCard"
  ```

---

## Task 6: Live Hole Entry redesign + detailed stats

**Files:**
- Modify: `app/(app)/round/new/score.tsx`

Reference: `docs/design/linksman/uploads/Screenshot 2026-05-02 at 7.30.49 PM.png` (PAR 4 hero) + `docs/design/linksman/screens-course.jsx` `HoleEntryScreen`.

Layout from top:
1. **Top bar** — Back chevron (left), ••• menu (right), `‹ exit round` (left, secondary).
2. **Right side, top**: `ROUND · 07/18` in mono.
3. **Hole metadata**: `HOLE 07 · 432 Y · HCP 4` in mono uppercase.
4. **PAR 4** — gigantic Fraunces, ~80pt, the visual hero.
5. **Telemetry strip** — four-cell row with Datum cells: THRU 6 · STROKES 26 · VS PAR -1 · PROJ 71.
6. **Score stepper** — small `−` and `+` Pressables flanking a large numeric score (current hole). Below, `BIRDIE` (or par/bogey label) in mono.
7. **Next-hole teaser** — sage button: `HOLE 8 · PAR 5 →`. Tapping advances.
8. **Detailed stats row** (NEW) — four chips: FAIRWAY · ROUGH · SAND · WATER. Tapping toggles `fairway_hit` (true/false) + sets a category. The `round_holes.fairway_hit` boolean column already exists. The `putts` column is shown via a small stepper at the bottom (3 puts default; +/-).
9. **GIR** — small toggle below: green-in-regulation, true/false.

Existing `score.tsx` already wires up score editing + auto-save via `useUpsertHoleScore` + the `round_holes` table. The redesign is mostly visual + adds the detailed-stats inputs. Don't change the cache merge / autosave logic.

- [ ] **Step 6.1: Read current `score.tsx`**

  ```bash
  cat "/Users/gavingillespie/Desktop/Golf App/app/(app)/round/new/score.tsx"
  ```

  Identify:
  - The data hooks (round, course, course_holes, round_holes, current hole index from URL params)
  - The score state setter
  - The advance-hole handler
  - The useEffect that loads hole-specific data

- [ ] **Step 6.2: Rewrite the JSX**

  Keep the existing data hooks. Replace the JSX with the layout from the screenshot. Add `putts` (default 2), `fairway_hit` (boolean | null), `gir` (boolean | null) to the upsert payload.

  Sketch:

  ```tsx
  import { Pressable, Text, View } from 'react-native';
  import { palette, fontFamily, deltaLabel } from '@/theme/linksman';
  import { Datum } from '@/components/Datum';
  import { ScoreNumeral } from '@/components/ScoreNumeral';
  import { Topo } from '@/components/Topo';

  // ...inside component, with `score`, `currentHole`, `currentPar`, `holeYardage`, `currentHcp`, `totalScore`, `totalPar`, `holesPlayed`:

  const delta = score - currentPar;
  const projected = totalScore + (totalPar - currentPar) * (totalHoles - holesPlayed) / Math.max(1, totalHoles - holesPlayed); // approx; refine

  // setFairway / setGir / setPutts state hooks similar to score state;
  // upsertHole call passes them.

  return (
    <ScreenContainer>
      {/* topo backdrop, very subtle */}
      <View style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
        <Topo seed={`${courseId}-h${currentHole}`} width={400} height={800} stroke={palette.bone + '22'} />
      </View>

      {/* exit-round + round counter */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone, opacity: 0.7 }}>‹ exit round</Text>
        </Pressable>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.18, color: palette.bone, opacity: 0.5, textTransform: 'uppercase' }}>ROUND</Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.bone }}>{currentHole}/{totalHoles}</Text>
        </View>
      </View>

      {/* hole metadata */}
      <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.18, color: palette.bone, opacity: 0.7, textTransform: 'uppercase', marginTop: 24 }}>
        HOLE {String(currentHole).padStart(2, '0')} · {holeYardage ?? '—'} Y · HCP {currentHcp ?? '—'}
      </Text>

      {/* PAR hero */}
      <Text style={{ fontFamily: fontFamily.display, fontSize: 80, letterSpacing: -80 * 0.04, color: palette.bone, marginTop: 4 }}>PAR {currentPar}</Text>

      {/* Telemetry strip */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 32 }}>
        <Datum label="THRU" value={holesPlayed} />
        <Datum label="STROKES" value={totalScore} />
        <Datum label="VS PAR" value={delta >= 0 ? `+${totalScore - totalPar}` : (totalScore - totalPar)} />
        <Datum label="PROJ" value={Math.round(projected)} />
      </View>

      {/* Score stepper */}
      <View style={{ marginTop: 64, alignItems: 'center' }}>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.18, color: palette.bone, opacity: 0.55, textTransform: 'uppercase' }}>STROKES THIS HOLE</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 32, marginTop: 12 }}>
          <Pressable onPress={() => setScore((s) => Math.max(1, s - 1))} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 0.5, borderColor: palette.bone + '40', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>−</Text>
          </Pressable>
          <ScoreNumeral value={score} size={120} color={palette.bone} />
          <Pressable onPress={() => setScore((s) => Math.min(20, s + 1))} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 0.5, borderColor: palette.bone + '40', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>+</Text>
          </Pressable>
        </View>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.18, color: palette.sage, marginTop: 8, textTransform: 'uppercase' }}>
          {deltaLabel(score - currentPar)}
        </Text>
      </View>

      {/* Detail chips: fairway / rough / sand / water */}
      <View style={{ marginTop: 24, flexDirection: 'row', gap: 8 }}>
        {(['fairway','rough','sand','water'] as const).map((cat) => {
          const active = fairwayCategory === cat;
          return (
            <Pressable
              key={cat}
              onPress={() => setFairwayCategory((c) => c === cat ? null : cat)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderWidth: active ? 1 : 0.5,
                borderColor: active ? palette.bone : palette.bone + '40',
                backgroundColor: active ? palette.bone + '10' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: palette.bone, textTransform: 'uppercase' }}>{cat}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Putts + GIR */}
      <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.18, color: palette.bone, opacity: 0.55, textTransform: 'uppercase' }}>PUTTS</Text>
          <Pressable onPress={() => setPutts((p) => Math.max(0, p - 1))}><Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: palette.bone }}>−</Text></Pressable>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: palette.bone }}>{putts}</Text>
          <Pressable onPress={() => setPutts((p) => Math.min(10, p + 1))}><Text style={{ fontFamily: fontFamily.mono, fontSize: 18, color: palette.bone }}>+</Text></Pressable>
        </View>
        <Pressable onPress={() => setGir((g) => g == null ? true : !g)}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: gir ? palette.sage : palette.bone, textTransform: 'uppercase' }}>
            GIR · {gir == null ? '—' : gir ? 'YES' : 'NO'}
          </Text>
        </Pressable>
      </View>

      {/* Next hole teaser */}
      <Pressable
        onPress={advanceHole}
        style={{ marginTop: 'auto', backgroundColor: palette.sage, paddingVertical: 16, alignItems: 'center', borderRadius: 4 }}
      >
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, letterSpacing: 13 * 0.16, color: palette.ink, textTransform: 'uppercase' }}>
          HOLE {currentHole + 1} · PAR {nextPar} →
        </Text>
      </Pressable>
    </ScreenContainer>
  );
  ```

  Wire `fairwayCategory` (string | null), `putts` (number), `gir` (boolean | null) into the upsert payload. The DB columns already exist (Phase 1 schema — `putts`, `fairway_hit`, `gir`). The new `fairway_category` would be additional — for now, map `fairwayCategory === 'fairway'` to `fairway_hit = true` and don't introduce a new column. We can add `fairway_category` in a future phase if testers want it.

- [ ] **Step 6.3: Verify on device + commit**

  Score a few holes. Check the cache merge still works (no score-revert glitch). Tap fairway/rough/sand/water — only one stays selected. Putts stepper works. GIR cycles `— → YES → NO → —`.

  ```bash
  npx tsc --noEmit && npm run lint
  git add "app/(app)/round/new/score.tsx"
  git commit -m "feat(linksman): live hole entry redesign with PAR hero + detail chips"
  ```

---

## Task 7: Round Summary cinematic + Eagle celebration

**Files:**
- Modify: `app/(app)/round/[id].tsx`
- Create: `components/EagleCelebration.tsx`
- Modify: `app/(app)/round/new/summary.tsx` (or merge into [id].tsx)

Reference: `docs/design/linksman/screens-summary.jsx` + screenshot 2 (`uploads/Screenshot 2026-05-02 at 7.31.21 PM.png` — Eagle celebration).

The round detail screen becomes the cinematic post-18 view. Eagle celebration is a separate full-screen modal that triggers when a user logs an eagle (in score.tsx, after upsert) — first showing time and continuing thereafter. For repeat eagles, just show a small inline `<MonoBadge color={brass}>◆ EAGLE · 10</MonoBadge>` on the round summary instead of the full takeover. First-of-its-kind detection is in `lib/achievements.ts` (Task 12).

- [ ] **Step 7.1: Modify `app/(app)/round/[id].tsx`**

  Replace the existing layout (which has owner header, Back+•••, score header, hole grid, likes/comments). Apply Linksman:
  - Topo backdrop (subtle, opacity 0.15)
  - Owner block uses small avatar + Fraunces 17 display name + mono @username (replaces existing owner header card)
  - Date line: `MAY 2, 2026` in mono uppercase (already done in Phase 3b's parseLocalDate)
  - Course name in Fraunces 32 with subtle "VIEW COURSE →" tappable link
  - Score block: a card containing `<ScoreNumeral value={total} delta={delta} size={88}/>` + `+8 · 18 holes · Par 71` mono
  - Holes card: `HOLES` label + `<HoleGrid>` + the legend (`● Birdie+ ● Par ● Bogey+`)
  - Like + comment counts row (already done — restyle with SVG icons matching the design)
  - Comments section + sticky CommentInput (Phase 3b layout — keep)

- [ ] **Step 7.2: Create `components/EagleCelebration.tsx`**

  Reference: screenshot 2.

  ```tsx
  import { Modal, Pressable, Text, View } from 'react-native';
  import { palette, fontFamily } from '@/theme/linksman';
  import { Topo } from '@/components/Topo';

  type Props = {
    visible: boolean;
    holeNumber: number;
    drive?: number;            // yards, optional
    par: number;
    lifetimeCount: number;     // including this one
    onClose: () => void;
    onSave: () => void;
  };

  export function EagleCelebration({ visible, holeNumber, drive, par, lifetimeCount, onClose, onSave }: Props) {
    const isAlbatross = par - 2 === 0; // a 1 on a par-3, etc. — the design says ALB. for delta -3
    const headline = lifetimeCount <= 1 ? 'Eagle.' : 'Eagle.';
    const subline = lifetimeCount === 1
      ? 'Your first eagle.'
      : `One putt for the ${ordinal(lifetimeCount)} eagle of your life.`;

    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: palette.ink }}>
          {/* topo radial */}
          <View style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
            <Topo seed={`eagle-${holeNumber}-${lifetimeCount}`} width={400} height={800} rings={12} stroke={palette.sage + '28'} strokeBold={palette.sage + '60'} />
          </View>

          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <View style={{ flexDirection: 'row', gap: 24, marginBottom: 16, opacity: 0.7 }}>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone }}>STROKES <Text style={{ fontFamily: fontFamily.display, fontSize: 16 }}>{par - 2}</Text></Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone }}>HOLE {holeNumber}{drive ? ` · DRIVE ${drive}y` : ''} PAR {par}</Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone }}>LIFETIME <Text style={{ fontFamily: fontFamily.display, fontSize: 16 }}>{lifetimeCount}</Text></Text>
            </View>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 96, letterSpacing: -96 * 0.04, color: palette.bone }}>{headline}</Text>
            <Text style={{ fontFamily: fontFamily.displayItalic, fontSize: 18, color: palette.bone, opacity: 0.85, marginTop: 12, textAlign: 'center', maxWidth: 280 }}>
              {subline}
            </Text>
            <Pressable onPress={onSave} style={{ marginTop: 32, backgroundColor: palette.sage, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 4 }}>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.18, color: palette.ink, textTransform: 'uppercase' }}>SAVE · CONTINUE</Text>
            </Pressable>
            <Pressable onPress={onClose} style={{ position: 'absolute', top: 24, right: 24 }}>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 16, color: palette.bone, opacity: 0.6 }}>×</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  function ordinal(n: number): string {
    if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
    switch (n % 10) {
      case 1: return `${n}st`;
      case 2: return `${n}nd`;
      case 3: return `${n}rd`;
      default: return `${n}th`;
    }
  }
  ```

- [ ] **Step 7.3: Wire EagleCelebration into score.tsx**

  After a successful hole upsert in `app/(app)/round/new/score.tsx`, if `score === par - 2` (eagle on a par 4) or better, AND it's the first eagle of the round (or ever — see Task 12 for the lifetime detection), set state `eagleVisible: true`. Modal renders. Save button advances to next hole + closes; X button just closes (still saves the score).

- [ ] **Step 7.4: Verify + commit**

  Score an eagle on a par-4 (enter 2 strokes). Verify the celebration triggers, looks right, "Save · continue" advances.

  ```bash
  npx tsc --noEmit && npm run lint
  git add "app/(app)/round/[id].tsx" components/EagleCelebration.tsx "app/(app)/round/new/score.tsx" "app/(app)/round/new/summary.tsx"
  git commit -m "feat(linksman): cinematic round summary + eagle celebration moment"
  ```

---

## Task 8: Profile editorial redesign + WeeklySummary

**Files:**
- Modify: `app/(app)/(tabs)/profile.tsx`
- Modify: `app/(app)/profile/[username].tsx`
- Create: `components/WeeklySummary.tsx`
- Modify: `app/(app)/stats.tsx`

Reference: `docs/design/linksman/screens-profile.jsx`.

The Profile tab gets the editorial cream surface (your own profile is the "reflection" world). Layout from top:
1. **Header strip** — `<Wordmark size={20} color="#0E1410" />` left, settings cog right.
2. **Hero block**:
   - `MAY 2026` in mono uppercase
   - `Display Name` in Fraunces 36
   - `@username` in mono small
3. **Handicap as hero numeral** — `<ScoreNumeral value={handicap ?? '—'} size={120} color="#0E1410" />` if available, else "Set up handicap" small CTA. Handicap math is `(avgScore - avgPar)` over last 20 rounds with sandbagging-resistant trim. For now, just average the last 10 scores' delta and round to 1 decimal.
4. **Stat row** — Rounds | Followers | Following (Pressable to lists, already done in Phase 3b).
5. **WeeklySummary card** — `<WeeklySummary userId={viewerId} />`.
6. **Recent rounds list** — using a smaller variant of `FeedRoundCard` or the existing list.
7. **VIEW DETAILED STATS →** link to `/stats`.

For the other-user profile (`app/(app)/profile/[username].tsx`), keep the dark surface (it's "broadcast" mode for someone else's profile). Apply same primitives but on `surface="ink"`.

`components/WeeklySummary.tsx`: a card showing rounds played this week, average score, week-over-week delta. Uses `parseLocalDate` from Phase 3b + `getWeek` from date-fns. Query: rounds with `played_at >= startOfWeek(today)`.

- [ ] **Step 8.1: Create `components/WeeklySummary.tsx`**

  ```tsx
  import { useQuery } from '@tanstack/react-query';
  import { Text, View } from 'react-native';
  import { startOfWeek, format, sub } from 'date-fns';

  import { supabase } from '@/lib/supabase';
  import { palette, fontFamily } from '@/theme/linksman';
  import { Datum } from '@/components/Datum';

  type Props = { userId: string };

  export function WeeklySummary({ userId }: Props) {
    const thisStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const lastStart = format(sub(startOfWeek(new Date(), { weekStartsOn: 1 }), { weeks: 1 }), 'yyyy-MM-dd');

    const q = useQuery({
      queryKey: ['weekly_summary', userId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('rounds')
          .select('total_score, total_par, played_at, courses(hole_count)')
          .eq('user_id', userId)
          .eq('is_draft', false)
          .gte('played_at', lastStart)
          .order('played_at', { ascending: false });
        if (error) throw error;
        const all = data ?? [];
        const thisWeek = all.filter((r) => r.played_at >= thisStart);
        const lastWeek = all.filter((r) => r.played_at < thisStart && r.played_at >= lastStart);
        const avg = (rs: typeof all) => rs.length === 0 ? null : rs.reduce((s, r) => s + (r.total_score - r.total_par), 0) / rs.length;
        return {
          thisCount: thisWeek.length,
          thisAvgDelta: avg(thisWeek),
          lastAvgDelta: avg(lastWeek),
        };
      },
      enabled: !!userId,
    });

    const data = q.data;
    if (!data) return null;
    const trend = data.thisAvgDelta != null && data.lastAvgDelta != null
      ? data.thisAvgDelta - data.lastAvgDelta
      : null;
    const trendLabel = trend == null ? '—' : trend < 0 ? `↓ ${Math.abs(trend).toFixed(1)}` : trend > 0 ? `↑ ${trend.toFixed(1)}` : '±0';
    const trendColor = trend == null ? palette.ink + '99' : trend < 0 ? palette.sage : palette.clay;

    return (
      <View style={{ borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: palette.ink + '33', paddingVertical: 16, marginTop: 24 }}>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginBottom: 12 }}>This week</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Datum label="ROUNDS" value={data.thisCount} color={palette.ink} />
          <Datum label="AVG VS PAR" value={data.thisAvgDelta != null ? data.thisAvgDelta.toFixed(1) : '—'} color={palette.ink} />
          <Datum label="WK/WK" value={trendLabel} color={palette.ink} valueColor={trendColor} align="right" />
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 8.2: Modify `app/(app)/(tabs)/profile.tsx`** — replace layout with editorial bone version. Keep all data hooks. Pass `surface="bone"` to ScreenContainer. Update colors and typography throughout.

- [ ] **Step 8.3: Modify `app/(app)/profile/[username].tsx`** — keep ink surface; apply primitives but stay on dark. Replace Inter classes with Fraunces/mono.

- [ ] **Step 8.4: Modify `app/(app)/stats.tsx`** — apply Linksman to the trend chart (already SVG-based) + best-per-par table. Replace text styles.

- [ ] **Step 8.5: Verify + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add "app/(app)/(tabs)/profile.tsx" "app/(app)/profile/[username].tsx" components/WeeklySummary.tsx "app/(app)/stats.tsx"
  git commit -m "feat(linksman): editorial profile + weekly summary + stats reskin"
  ```

---

## Task 9: Course Detail redesign

**Files:**
- Modify: `app/(app)/course/[id].tsx`

Reference: `docs/design/linksman/screens-course.jsx` `CourseDetailScreen`.

The course detail page becomes a real centerpiece. Layout:
1. Bone surface.
2. Topo hero — full-width 240px tall, the course's seed (`courses.osm_id` or `courses.id`).
3. Course name in Fraunces 36, location in mono small.
4. Stats row: Rounds played here · Best score · Avg score
5. Hole-by-hole grid — par per hole shown with course-record yardage if known. We have `course_holes` data already.
6. "Your rounds here" list — rebuilt from existing query.

Existing file already has a query for user rounds at this course. Keep the query, replace the layout. If `course_holes` data is missing for a course (likely since OSM only provides lat/lng), show a placeholder "Course layout not available yet" — but render the topo so the page still feels complete.

- [ ] **Step 9.1: Read current file**, identify hooks and data flow.

- [ ] **Step 9.2: Rewrite layout** with Topo + Wordmark-free header + new typography. Use `<HoleGrid>` only if there are 18 holes scored in any round to show; otherwise just the topo + your-history list.

- [ ] **Step 9.3: Verify + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add "app/(app)/course/[id].tsx"
  git commit -m "feat(linksman): course detail with topo hero + history"
  ```

---

## Task 10: Discover + Settings reskin

**Files:**
- Modify: `app/(app)/(tabs)/discover.tsx`
- Modify: `app/(app)/settings.tsx`

Lighter touch — both screens stay functional, just adopt the new theme.

- [ ] **Step 10.1: Discover** — keep search input, two sections (Players, Courses). Replace UserListItem visual to match new design (Wordmark-style avatar fallback, mono @username, sage Follow button). Apply Datum / mono labels for section headers ("PLAYERS", "COURSES"). Add a `<MiniTopo>` thumb next to each course row (optional polish).

- [ ] **Step 10.2: Settings** — Wordmark in header. Mono section labels. Bone surface (it's a "reflection" screen). Keep all functionality (sign out, delete, legal links) — restyle only.

- [ ] **Step 10.3: Verify + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add "app/(app)/(tabs)/discover.tsx" "app/(app)/settings.tsx"
  git commit -m "feat(linksman): discover + settings reskin"
  ```

---

## Task 11: OSM course import + GPS "Near me"

**Files:**
- Create: `supabase/migrations/20260506000001_phase5_courses_osm_id_and_cover.sql`
- Create: `scripts/seed-osm-courses.ts`
- Modify: `lib/queries/courses.ts` (add `useNearbyCourses`)
- Modify: `app/(app)/round/new/course.tsx` (Course picker with "near me" section)

The catalog needs depth. We import the OSM golf-course dataset once, store name + lat/lng + an `osm_id` for dedup, and use GPS for near-me ordering.

- [ ] **Step 11.1: Migration**

  ```sql
  ALTER TABLE courses
    ADD COLUMN osm_id BIGINT UNIQUE,
    ADD COLUMN cover_image_url TEXT;
  ```

- [ ] **Step 11.2: Push migration + regen types**

  ```bash
  npm run db:push && npm run db:types
  ```

- [ ] **Step 11.3: Create `scripts/seed-osm-courses.ts`**

  Pulls golf courses from Overpass API for the US (or a configurable bbox). Inserts into `courses` with `source = 'osm'`. Use `osm_id` for dedup. Run as a one-shot Node script. Use the SUPABASE_SERVICE_ROLE_KEY (read from `.env.local`) so RLS doesn't block insert.

  Skeleton:

  ```ts
  // Run with: npx ts-node scripts/seed-osm-courses.ts
  // Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env or .env.local
  import { createClient } from '@supabase/supabase-js';
  import 'dotenv/config'; // npm i dotenv -D if not present

  const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!SERVICE_ROLE) throw new Error('SUPABASE_SERVICE_ROLE_KEY required (put in .env.local)');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const OVERPASS_QUERY = `
  [out:json][timeout:120];
  (
    way["leisure"="golf_course"](24.0,-125.0,49.5,-66.0);
    relation["leisure"="golf_course"](24.0,-125.0,49.5,-66.0);
  );
  out center tags;
  `;

  async function main() {
    console.log('fetching from overpass…');
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const json = await res.json();
    const elements: any[] = json.elements ?? [];
    console.log(`got ${elements.length} elements`);

    const rows = elements
      .map((el) => {
        const tags = el.tags ?? {};
        const lat = el.center?.lat ?? el.lat;
        const lng = el.center?.lon ?? el.lon;
        const name = tags.name as string | undefined;
        if (!name || !lat || !lng) return null;
        const holes =
          tags.holes && /^\d+$/.test(tags.holes) ? parseInt(tags.holes, 10) : 18;
        return {
          osm_id: el.id,
          name: name.slice(0, 200),
          city: tags['addr:city'] ?? null,
          state: tags['addr:state'] ?? null,
          country: tags['addr:country'] ?? 'US',
          lat,
          lng,
          hole_count: [9, 18, 27, 36].includes(holes) ? holes : 18,
          source: 'osm' as const,
          verified: false,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    console.log(`inserting ${rows.length} rows…`);
    // batch in chunks of 500 to avoid request size limits
    const CHUNK = 500;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await admin.from('courses').upsert(slice, { onConflict: 'osm_id', ignoreDuplicates: true });
      if (error) {
        console.error(`chunk ${i}: ${error.message}`);
      } else {
        console.log(`upserted ${i + slice.length} / ${rows.length}`);
      }
    }
    console.log('done');
  }

  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
  ```

  Add `dotenv` to devDependencies if not present:
  ```bash
  npm install dotenv --save-dev --legacy-peer-deps
  ```

- [ ] **Step 11.4: Run the script**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npx ts-node --transpile-only scripts/seed-osm-courses.ts
  ```

  Expect ~15–20k US golf courses. Verify in Supabase: `SELECT count(*) FROM courses WHERE source = 'osm';`

  > **For the implementer:** if `ts-node` not present, install: `npm install ts-node --save-dev --legacy-peer-deps`. The SUPABASE_SERVICE_ROLE_KEY must be in `.env.local` for the script (different from the runtime EXPO_PUBLIC_* variables). User will set this manually.

- [ ] **Step 11.5: Add `useNearbyCourses` to `lib/queries/courses.ts`**

  ```ts
  import * as Location from 'expo-location';

  export function useNearbyCourses(limitMi = 25) {
    return useQuery({
      queryKey: ['nearby_courses', limitMi],
      queryFn: async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return [];
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;

        // Pull a generous bbox; sort + filter client-side.
        const dLat = limitMi / 69;
        const dLng = limitMi / (69 * Math.cos((latitude * Math.PI) / 180));
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .gte('lat', latitude - dLat).lte('lat', latitude + dLat)
          .gte('lng', longitude - dLng).lte('lng', longitude + dLng)
          .limit(50);
        if (error) throw error;

        const withDist = (data ?? []).map((c) => ({
          ...c,
          distanceMi: haversine(latitude, longitude, c.lat ?? 0, c.lng ?? 0),
        }));
        return withDist
          .filter((c) => c.distanceMi <= limitMi)
          .sort((a, b) => a.distanceMi - b.distanceMi)
          .slice(0, 30);
      },
      // refetch on focus only — GPS is expensive
      staleTime: 5 * 60 * 1000,
    });
  }

  function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // miles
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  ```

  > `expo-location` is already installed.

- [ ] **Step 11.6: Wire into course picker**

  In `app/(app)/round/new/course.tsx`, add a "Near me" section above the search results that uses `useNearbyCourses`. Show distance in mi as part of each row.

- [ ] **Step 11.7: Verify + commit**

  Test on a real device (Expo Go) — Simulator won't give a real GPS. Allow location permission. Verify nearby courses surface.

  ```bash
  npx tsc --noEmit && npm run lint
  git add supabase/migrations/20260506000001_phase5_courses_osm_id_and_cover.sql lib/database.types.ts scripts/seed-osm-courses.ts lib/queries/courses.ts "app/(app)/round/new/course.tsx" package.json package-lock.json
  git commit -m "feat(courses): OSM seed import + GPS near-me search"
  ```

---

## Task 12: Achievements + voice pass + phone test + tag

**Files:**
- Create: `lib/achievements.ts`
- Modify: various screens (voice pass — small string changes)

- [ ] **Step 12.1: Create `lib/achievements.ts`**

  ```ts
  import { supabase, type Tables } from '@/lib/supabase';

  export type Achievement =
    | { kind: 'eagle'; lifetimeCount: number; holeNumber: number; par: number }
    | { kind: 'first_eagle'; holeNumber: number; par: number }
    | { kind: 'albatross'; holeNumber: number; par: number }
    | { kind: 'first_sub_x'; threshold: number; total: number }
    | { kind: 'course_best'; courseId: string; total: number };

  export async function detectEagle(
    userId: string,
    par: number,
    score: number,
    holeNumber: number,
  ): Promise<Achievement | null> {
    const delta = score - par;
    if (delta > -2) return null;

    const { count, error } = await supabase
      .from('round_holes')
      .select('id', { count: 'exact', head: true })
      .lte('score', { /* delta -2 calc */ } as never);
    // SIMPLER: pull all eagles for the user via a join.

    const { data: eagleRows, error: e2 } = await supabase
      .from('round_holes')
      .select('score, par, rounds!inner ( user_id )')
      .filter('rounds.user_id', 'eq', userId);
    if (e2) throw e2;
    const lifetimeEagles = (eagleRows ?? []).filter((r) => (r.score - r.par) <= -2).length + 1; // +1 for current

    if (delta === -3) return { kind: 'albatross', holeNumber, par };
    if (lifetimeEagles === 1) return { kind: 'first_eagle', holeNumber, par };
    return { kind: 'eagle', lifetimeCount: lifetimeEagles, holeNumber, par };
  }
  ```

  Refine the eagle-counting query — the join syntax above isn't quite right. Use `supabase.from('rounds').select('id, round_holes(score, par)').eq('user_id', userId)` and reduce in JS.

- [ ] **Step 12.2: Wire into `score.tsx`**

  After upserting a hole score, call `detectEagle(...)`. If returns an achievement, set state to show `<EagleCelebration>`.

- [ ] **Step 12.3: Voice pass**

  Search for these strings and replace per brand voice:
  - "Welcome to Golf App" → "Quiet. Precise. Earned."
  - "🏆 New course best" → "Course best." with brass dot.
  - "Your feed is quiet." → keep (matches voice).
  - "Follow each other to see their rounds." → "Follow each other to see their rounds." (already understated — keep)
  - "Need 8 rounds" tooltip → "Need 8 rounds" (keep)
  - "Sign out" → "Sign out" (keep)
  - "Delete account" → "Delete account" (keep)
  - "Comment rejected" → "Not allowed."
  - Any "🎉" or "✓" or "❤️" emoji in text strings → replace with `◆` brass diamond or remove.

  Run: `grep -rn "🏆\|🎉\|❤️\|🤍\|💬\|◆" app components` and audit each match.

- [ ] **Step 12.4: Final phone walkthrough**

  Two test accounts mutually following. Verify everything end-to-end:
  - Welcome → sign in → feed loads with new RoundCard
  - Tap brass Play button → Course picker → Near me shows real OSM courses → start round → live hole entry shows PAR hero, telemetry, score stepper, fairway/rough/sand/water, putts/GIR
  - Score an eagle on a par-4 → celebration triggers
  - Save round → Round Summary cinematic
  - Profile (yours, bone surface): Wordmark, weekly summary, handicap numeral
  - Profile (mutual's, ink surface): same primitives
  - Course detail: topo hero
  - Discover: search + near-me
  - Like a feed card from the inline heart
  - Comment on a round (sticky input still works, swipe-to-delete still works)
  - Block + report still work
  - Settings → all legal links open, delete account works

- [ ] **Step 12.5: Tag**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  git tag -a phase-5 -m "Phase 5: Linksman — visual identity rebuild + OSM courses + achievements"
  git push origin main --tags
  ```

---

## Verification matrix

| Concern | Enforced by |
|---|---|
| Topo seed is deterministic per course | Topo uses `mulberry32(hash(seed))` — same input always renders same output |
| Old screens don't break mid-migration | `tailwind.config.js` keeps existing class names mapped to Linksman tokens during the transition |
| OSM data dedups on re-run | `courses.osm_id` is UNIQUE; seed script uses `upsert(..., { onConflict: 'osm_id' })` |
| Service-role key never reaches client | Seed script reads from `.env.local` and runs as a Node CLI; never bundled into the app |
| GPS data not stored on backend | `useNearbyCourses` queries lat/lng locally and filters client-side; no per-user-location row written |
| Achievement detection is sound under network delay | `detectEagle` runs after the upsert succeeds; eagle is in the DB before the count is fetched |

## Spec-vs-plan deltas

- **Inter removed entirely.** Replaced by Fraunces + JetBrains Mono. Bundle size impact small (variable fonts).
- **OSM courses are name + lat/lng + hole_count only.** No tee-box yardages from OSM. Future: scrape course websites or accept user contribution.
- **Procedural topo is the only course imagery in this phase.** `courses.cover_image_url` reserved as the photo extension point but unused.
- **Bundle ID still `com.golfapp.app` placeholder.** Renaming to a Linksman-specific ID is the user's call and happens before EAS Build (Phase 6 prep).
- **Apple Developer enrollment is still on the user.** Required before Phase 6.
- **The "more" tab routes to Settings.** A real fifth destination (e.g., Achievements list) can come in a future phase.
