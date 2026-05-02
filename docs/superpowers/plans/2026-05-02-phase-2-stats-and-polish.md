# Phase 2 — Stats + Profile Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the profile feel like a real "golf identity." Add personal-best lookups, a score-trend visualization, best-per-par stats, a summary stats header on Profile, and a course detail screen showing your history at a course. By the end, opening Profile feels meaningful — not just a list of rounds — and tapping into a course shows your performance there over time.

**Architecture:** Pure read-side additions. No new tables, no migrations, no schema changes. All stats are derived from `rounds` + `round_holes` via SQL queries through the typed Supabase client. New stats queries live in a single module (`lib/queries/stats.ts`). New screens are additive (`app/(app)/stats.tsx`, `app/(app)/course/[id].tsx`). No changes to existing data flow.

**Tech Stack additions:**
- `react-native-svg` — for the line chart. Lightweight (already transitively present); we draw a custom polyline + dots/labels rather than pulling in Victory Native or Skia. Keeps the bundle smaller and the design exactly on-theme.

**Spec deviation:** the high-level spec called for "Victory Native or Skia" charts. We're using a hand-rolled `react-native-svg` line chart because: (1) Phase 2 needs one chart, not a charting library; (2) it's ~100 LoC, matches our theme exactly, no chart-library API to learn or fight; (3) we can swap to Victory Native later if we add more chart types in v2. If we hit something the DIY chart can't handle, we'll bring in Victory Native then.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` — Phase 0 + Phase 1 shipped, tagged `phase-1`, 26 commits on `main`.

---

## Mental model

```
PROFILE TAB                                             COURSE DETAIL
┌─────────────────────────────────┐                    ┌─────────────────────────────────┐
│ Display Name                ⚙   │                    │ ← Back                          │
│ @username                       │                    │ Pebble Beach Golf Links         │
│                                 │                    │ Pebble Beach, CA                │
│ ┌─ Stats summary ──────────┐   │                    │                                 │
│ │ 12 rounds   avg 86       │   │                    │ ┌─ Your stats here ─────────┐  │
│ │ best 79  trend +2  ↗     │   │                    │ │ Played 4 times            │  │
│ └─────────────────────────────┘   │                    │ │ Best 79  Average 84       │  │
│         [View detailed stats →] │                    │ └────────────────────────────┘  │
│                                 │                    │                                 │
│ Recent rounds                   │                    │ Your rounds here                │
│  • Pebble Beach   today    82   │                    │  • Today          82            │
│  • Lincoln Park   May 1    79   │                    │  • Two weeks ago  85            │
└─────────────────────────────────┘                    │  …                              │
                                                       └─────────────────────────────────┘

   ↓ "View detailed stats" routes to /stats:

STATS SCREEN
┌─────────────────────────────────┐
│ ← Back                          │
│ Your stats                      │
│                                 │
│ ┌─ Score trend (last 20) ────┐ │
│ │   ╱╲    ╱╲                 │ │
│ │  ╱  ╲  ╱  ╲___╱            │ │  custom SVG line chart
│ │ ╱    ╲╱                    │ │
│ └─────────────────────────────┘ │
│                                 │
│ Best per hole type              │
│  Par 3:  3                      │
│  Par 4:  4                      │
│  Par 5:  5                      │
└─────────────────────────────────┘
```

Where you can navigate to course detail:
- From a round detail screen — tap the course name → `/course/[id]`
- From course picker (later, in Phase 3) — tap a course before starting a round to preview your history

For Phase 2, we wire the round-detail → course-detail link only. Course-picker preview is fine to defer.

---

## File Structure (new files in Phase 2)

```
lib/queries/
└── stats.ts                            # All stats queries (personal best, trend, best-per-par, summary)

components/
├── ScoreTrendChart.tsx                 # Hand-rolled SVG line chart
├── StatsSummaryCard.tsx                # Stats block used on Profile (rounds count, avg, best, trend)
└── BestPerParRow.tsx                   # Single-row visualization of best-per-par-type

app/(app)/
├── stats.tsx                           # Detailed stats screen (trend chart + best-per-par)
└── course/
    └── [id].tsx                        # Course detail with your history
```

---

## Task 1: Stats queries module

**Files:**
- Create: `lib/queries/stats.ts`

This task adds the data layer. No UI yet — the next tasks consume these hooks.

- [ ] **Step 1.1: Create the file**

  Create `lib/queries/stats.ts`:

  ```ts
  import { useQuery } from '@tanstack/react-query';

  import { supabase, type Tables } from '@/lib/supabase';

  /**
   * Summary stats for a user's overall performance:
   * - rounds: total count of saved (non-draft) rounds
   * - avgScore: mean total_score across rounds (rounded)
   * - bestScore: minimum total_score
   * - bestDiff: minimum (total_score - total_par)
   * - trendDelta: avg of last 5 minus avg of prior 5 (negative = improving)
   *
   * Returns null until userId is provided. Returns zeroed shape if user has
   * no rounds (so the UI can render "—" placeholders without conditional logic).
   */
  export function useUserSummaryStats(userId: string | undefined) {
    return useQuery({
      queryKey: ['stats', 'summary', userId],
      queryFn: async () => {
        if (!userId) return null;
        const { data, error } = await supabase
          .from('rounds')
          .select('total_score, total_par, played_at')
          .eq('user_id', userId)
          .eq('is_draft', false)
          .order('played_at', { ascending: false });
        if (error) throw error;
        const rounds = data ?? [];
        if (rounds.length === 0) {
          return { rounds: 0, avgScore: null, bestScore: null, bestDiff: null, trendDelta: null };
        }
        const scores = rounds.map((r) => r.total_score);
        const diffs = rounds.map((r) => r.total_score - r.total_par);
        const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
        const last5 = scores.slice(0, 5);
        const prev5 = scores.slice(5, 10);
        const trendDelta =
          last5.length >= 3 && prev5.length >= 3 ? avg(last5) - avg(prev5) : null;
        return {
          rounds: rounds.length,
          avgScore: Math.round(avg(scores)),
          bestScore: Math.min(...scores),
          bestDiff: Math.min(...diffs),
          trendDelta,
        };
      },
      enabled: !!userId,
    });
  }

  /**
   * The user's best score on a specific course (lowest total_score).
   * Returns null if the user has never played the course.
   */
  export function usePersonalBestAtCourse(
    userId: string | undefined,
    courseId: string | undefined,
  ) {
    return useQuery({
      queryKey: ['stats', 'personal-best', userId, courseId],
      queryFn: async () => {
        if (!userId || !courseId) return null;
        const { data, error } = await supabase
          .from('rounds')
          .select('id, total_score, total_par, played_at')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('is_draft', false)
          .order('total_score', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      enabled: !!userId && !!courseId,
    });
  }

  /**
   * Score trend: an array of completed rounds (oldest → newest), capped to
   * the last `limit` rounds. Used by the trend chart.
   */
  export function useScoreTrend(userId: string | undefined, limit = 20) {
    return useQuery({
      queryKey: ['stats', 'trend', userId, limit],
      queryFn: async () => {
        if (!userId) return [];
        const { data, error } = await supabase
          .from('rounds')
          .select('id, total_score, total_par, played_at')
          .eq('user_id', userId)
          .eq('is_draft', false)
          .order('played_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        // Reverse so the oldest is at index 0, newest at the end (left → right reading).
        return (data ?? []).slice().reverse();
      },
      enabled: !!userId,
    });
  }

  export type TrendPoint = {
    id: string;
    total_score: number;
    total_par: number;
    played_at: string;
  };

  /**
   * Best score per par-type across the user's history. Returns an object
   * keyed by par (3, 4, 5, 6) → minimum score on that hole-par across all rounds.
   * Holes the user has never played at a given par return null.
   */
  export function useBestPerPar(userId: string | undefined) {
    return useQuery({
      queryKey: ['stats', 'best-per-par', userId],
      queryFn: async (): Promise<Record<number, number | null>> => {
        if (!userId) return { 3: null, 4: null, 5: null, 6: null };
        // Two-step: first get the user's round IDs (RLS keeps it scoped),
        // then get the round_holes for those rounds.
        const roundsRes = await supabase
          .from('rounds')
          .select('id')
          .eq('user_id', userId)
          .eq('is_draft', false);
        if (roundsRes.error) throw roundsRes.error;
        const roundIds = (roundsRes.data ?? []).map((r) => r.id);
        if (roundIds.length === 0) return { 3: null, 4: null, 5: null, 6: null };
        const holesRes = await supabase
          .from('round_holes')
          .select('par, score')
          .in('round_id', roundIds);
        if (holesRes.error) throw holesRes.error;
        const result: Record<number, number | null> = { 3: null, 4: null, 5: null, 6: null };
        for (const h of holesRes.data ?? []) {
          const cur = result[h.par];
          if (cur == null || h.score < cur) {
            result[h.par] = h.score;
          }
        }
        return result;
      },
      enabled: !!userId,
    });
  }

  /**
   * All of a user's saved rounds at a given course, newest first.
   * Used by the course-detail screen.
   */
  export function useUserRoundsAtCourse(
    userId: string | undefined,
    courseId: string | undefined,
  ) {
    return useQuery({
      queryKey: ['stats', 'user-rounds-at-course', userId, courseId],
      queryFn: async () => {
        if (!userId || !courseId) return [];
        const { data, error } = await supabase
          .from('rounds')
          .select('*')
          .eq('user_id', userId)
          .eq('course_id', courseId)
          .eq('is_draft', false)
          .order('played_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as Tables<'rounds'>[];
      },
      enabled: !!userId && !!courseId,
    });
  }
  ```

- [ ] **Step 1.2: Verify**

  ```bash
  npm run typecheck
  npm run lint
  ```

  Both should be clean. The `Tables<'rounds'>` and `Tables<'round_holes'>` shapes resolve from the generated types we shipped in Phase 1.

- [ ] **Step 1.3: Commit**

  ```bash
  git add -A
  git commit -m "feat: add stats queries (summary, personal best, trend, best-per-par)"
  git push origin main
  ```

---

## Task 2: Stats summary card on Profile tab

**Files:**
- Create: `components/StatsSummaryCard.tsx`
- Modify: `app/(app)/(tabs)/profile.tsx`

- [ ] **Step 2.1: Create `components/StatsSummaryCard.tsx`**

  ```tsx
  import { Pressable, Text, View } from 'react-native';
  import { router } from 'expo-router';

  type Props = {
    rounds: number;
    avgScore: number | null;
    bestScore: number | null;
    bestDiff: number | null;
    trendDelta: number | null;
  };

  function formatTrend(delta: number | null): { label: string; tone: 'good' | 'bad' | 'neutral' } {
    if (delta == null) return { label: '—', tone: 'neutral' };
    if (delta < -0.5) return { label: `↓ ${Math.abs(delta).toFixed(1)}`, tone: 'good' };
    if (delta > 0.5) return { label: `↑ ${delta.toFixed(1)}`, tone: 'bad' };
    return { label: `±${Math.abs(delta).toFixed(1)}`, tone: 'neutral' };
  }

  export function StatsSummaryCard({ rounds, avgScore, bestScore, bestDiff, trendDelta }: Props) {
    const trend = formatTrend(trendDelta);
    const trendColor =
      trend.tone === 'good' ? 'text-accent' : trend.tone === 'bad' ? 'text-red-500' : 'text-text-secondary';

    return (
      <Pressable
        onPress={() => router.push('/stats')}
        className="bg-bg-surface border border-border-subtle rounded-2xl p-4 active:opacity-70"
      >
        <View className="flex-row justify-between mb-3">
          <View className="flex-1">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Rounds</Text>
            <Text className="text-text-primary text-2xl font-light mt-1">{rounds}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Average</Text>
            <Text className="text-text-primary text-2xl font-light mt-1">
              {avgScore ?? '—'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Best</Text>
            <Text className="text-text-primary text-2xl font-light mt-1">
              {bestScore ?? '—'}
            </Text>
            {bestDiff != null ? (
              <Text className="text-text-secondary text-[10px]">
                {bestDiff >= 0 ? `+${bestDiff}` : bestDiff} vs par
              </Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row justify-between items-center pt-3 border-t border-border-subtle">
          <View className="flex-row items-baseline gap-2">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
              Trend (last 5)
            </Text>
            <Text className={`text-sm font-semibold ${trendColor}`}>{trend.label}</Text>
          </View>
          <Text className="text-accent text-xs font-semibold">View detailed stats →</Text>
        </View>
      </Pressable>
    );
  }
  ```

- [ ] **Step 2.2: Modify `app/(app)/(tabs)/profile.tsx`**

  Read the existing file. Add an import for the stats card and the summary stats query, then drop the card below the profile name header and above the "Rounds" list.

  Add to imports:

  ```tsx
  import { StatsSummaryCard } from '@/components/StatsSummaryCard';
  import { useUserSummaryStats } from '@/lib/queries/stats';
  ```

  Inside the component, add:

  ```tsx
  const statsQ = useUserSummaryStats(session?.user.id);
  ```

  In the render, after the profile name header `<View>` block and before the `<Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">Rounds (...)</Text>` line, add:

  ```tsx
  <View className="mb-6">
    <StatsSummaryCard
      rounds={statsQ.data?.rounds ?? 0}
      avgScore={statsQ.data?.avgScore ?? null}
      bestScore={statsQ.data?.bestScore ?? null}
      bestDiff={statsQ.data?.bestDiff ?? null}
      trendDelta={statsQ.data?.trendDelta ?? null}
    />
  </View>
  ```

- [ ] **Step 2.3: Verify**

  ```bash
  npm run typecheck
  npm run lint
  ```

  Both clean.

- [ ] **Step 2.4: Commit**

  ```bash
  git add -A
  git commit -m "feat: add stats summary card to Profile tab"
  git push origin main
  ```

---

## Task 3: Score trend chart + Best-per-par row + Stats screen

**Files:**
- Install: `react-native-svg`
- Create: `components/ScoreTrendChart.tsx`, `components/BestPerParRow.tsx`, `app/(app)/stats.tsx`

- [ ] **Step 3.1: Install react-native-svg**

  ```bash
  npx expo install react-native-svg
  ```

  If it falls back to peer-deps, retry with `npm install react-native-svg --save --legacy-peer-deps`.

- [ ] **Step 3.2: Create `components/ScoreTrendChart.tsx`**

  ```tsx
  import { useMemo } from 'react';
  import { Text, View } from 'react-native';
  import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

  import { colors } from '@/theme';

  type Point = { id: string; total_score: number; total_par: number; played_at: string };

  type Props = {
    points: Point[];
    width: number;
    height: number;
  };

  /**
   * Hand-rolled SVG line chart. Each point shows total_score over time.
   * The y-axis is auto-fit between the min and max scores in the dataset
   * (with 2-stroke padding on each end).
   *
   * If fewer than 2 points exist, renders an empty-state hint instead.
   */
  export function ScoreTrendChart({ points, width, height }: Props) {
    const PAD_LEFT = 28;
    const PAD_RIGHT = 12;
    const PAD_TOP = 16;
    const PAD_BOTTOM = 24;
    const innerW = width - PAD_LEFT - PAD_RIGHT;
    const innerH = height - PAD_TOP - PAD_BOTTOM;

    const layout = useMemo(() => {
      if (points.length < 2) return null;
      const scores = points.map((p) => p.total_score);
      const minScore = Math.min(...scores) - 2;
      const maxScore = Math.max(...scores) + 2;
      const span = Math.max(1, maxScore - minScore);
      const xs = points.map(
        (_, i) => PAD_LEFT + (i * innerW) / Math.max(1, points.length - 1),
      );
      const ys = points.map(
        (p) => PAD_TOP + ((maxScore - p.total_score) / span) * innerH,
      );
      const polyline = xs.map((x, i) => `${x.toFixed(1)},${ys[i]?.toFixed(1) ?? ''}`).join(' ');
      return { xs, ys, polyline, minScore, maxScore };
    }, [points, innerW, innerH]);

    if (!layout) {
      return (
        <View
          style={{ width, height }}
          className="bg-bg-surface border border-border-subtle rounded-2xl items-center justify-center"
        >
          <Text className="text-text-secondary text-sm">Score trend appears after 2+ rounds.</Text>
        </View>
      );
    }

    const { xs, ys, polyline, minScore, maxScore } = layout;

    return (
      <View
        style={{ width, height }}
        className="bg-bg-surface border border-border-subtle rounded-2xl overflow-hidden"
      >
        <Svg width={width} height={height}>
          {/* horizontal grid line at top + bottom */}
          <Line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={PAD_TOP}
            y2={PAD_TOP}
            stroke={colors.border.subtle}
            strokeWidth={1}
          />
          <Line
            x1={PAD_LEFT}
            x2={width - PAD_RIGHT}
            y1={height - PAD_BOTTOM}
            y2={height - PAD_BOTTOM}
            stroke={colors.border.subtle}
            strokeWidth={1}
          />
          {/* y-axis labels */}
          <SvgText
            x={4}
            y={PAD_TOP + 4}
            fontSize={10}
            fill={colors.text.secondary}
          >
            {maxScore}
          </SvgText>
          <SvgText
            x={4}
            y={height - PAD_BOTTOM + 4}
            fontSize={10}
            fill={colors.text.secondary}
          >
            {minScore}
          </SvgText>
          {/* polyline */}
          <Polyline
            points={polyline}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
          />
          {/* dots for each round */}
          {points.map((p, i) => {
            const cx = xs[i];
            const cy = ys[i];
            if (cx == null || cy == null) return null;
            return (
              <Circle
                key={p.id}
                cx={cx}
                cy={cy}
                r={3}
                fill={colors.accent}
                stroke={colors.bg.surface}
                strokeWidth={1}
              />
            );
          })}
        </Svg>
        <View className="absolute bottom-2 left-7 right-3 flex-row justify-between">
          <Text className="text-text-secondary text-[10px]">
            {points.length} rounds
          </Text>
          <Text className="text-text-secondary text-[10px]">latest →</Text>
        </View>
      </View>
    );
  }
  ```

- [ ] **Step 3.3: Create `components/BestPerParRow.tsx`**

  ```tsx
  import { Text, View } from 'react-native';

  type Props = {
    bestPerPar: Record<number, number | null>;
  };

  /**
   * Three side-by-side cells showing the user's best score on a Par 3/4/5.
   * (Par 6 holes exist but are extremely rare — we hide the cell unless the
   * user actually has data for one.)
   */
  export function BestPerParRow({ bestPerPar }: Props) {
    const cells: Array<{ par: number; label: string }> = [
      { par: 3, label: 'Par 3' },
      { par: 4, label: 'Par 4' },
      { par: 5, label: 'Par 5' },
    ];
    if (bestPerPar[6] != null) cells.push({ par: 6, label: 'Par 6' });

    return (
      <View className="flex-row gap-3">
        {cells.map(({ par, label }) => {
          const best = bestPerPar[par];
          const diff = best == null ? null : best - par;
          return (
            <View
              key={par}
              className="flex-1 bg-bg-surface border border-border-subtle rounded-2xl p-4"
            >
              <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
                {label}
              </Text>
              <Text className="text-text-primary text-3xl font-light mt-2">
                {best ?? '—'}
              </Text>
              {diff != null ? (
                <Text className="text-text-secondary text-[10px] mt-1">
                  {diff < 0
                    ? diff === -1
                      ? 'Birdie'
                      : diff === -2
                        ? 'Eagle'
                        : `${diff}`
                    : diff === 0
                      ? 'Par'
                      : diff === 1
                        ? 'Bogey'
                        : `+${diff}`}
                </Text>
              ) : (
                <Text className="text-text-secondary text-[10px] mt-1">No data</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  }
  ```

- [ ] **Step 3.4: Create `app/(app)/stats.tsx`**

  ```tsx
  import { useWindowDimensions } from 'react-native';
  import { Pressable, ScrollView, Text } from 'react-native';
  import { router } from 'expo-router';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { ScoreTrendChart } from '@/components/ScoreTrendChart';
  import { BestPerParRow } from '@/components/BestPerParRow';
  import { useSession } from '@/lib/hooks/useSession';
  import { useScoreTrend, useBestPerPar } from '@/lib/queries/stats';

  export default function Stats() {
    const { session } = useSession();
    const trendQ = useScoreTrend(session?.user.id, 20);
    const bestQ = useBestPerPar(session?.user.id);
    const { width } = useWindowDimensions();
    const chartWidth = width - 48; // matches ScreenContainer's px-6 padding

    return (
      <ScreenContainer>
        <Pressable onPress={() => router.back()} className="mt-4 mb-2">
          <Text className="text-text-secondary text-sm">← Back</Text>
        </Pressable>
        <Text className="text-text-primary text-3xl font-light tracking-tight mb-6">
          Your stats
        </Text>

        <ScrollView className="flex-1">
          <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">
            Score trend
          </Text>
          <ScoreTrendChart points={trendQ.data ?? []} width={chartWidth} height={180} />

          <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6 mb-2">
            Best per hole type
          </Text>
          <BestPerParRow bestPerPar={bestQ.data ?? { 3: null, 4: null, 5: null, 6: null }} />
        </ScrollView>
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 3.5: Verify**

  ```bash
  npm run typecheck
  npm run lint
  ```

  Both clean.

  Then `CI=1 npx expo start --clear --port 8090` should boot without errors. (`react-native-svg` is widely supported in Expo Go since SDK 51 — no dev client required.)

- [ ] **Step 3.6: Commit**

  ```bash
  git add -A
  git commit -m "feat: add stats screen with trend chart and best-per-par"
  git push origin main
  ```

---

## Task 4: Course detail screen + link from round detail

**Files:**
- Create: `app/(app)/course/_layout.tsx`, `app/(app)/course/[id].tsx`
- Modify: `app/(app)/round/[id].tsx` — add tappable course-name link

- [ ] **Step 4.1: Create `app/(app)/course/_layout.tsx`**

  ```tsx
  import { Stack } from 'expo-router';

  export default function CourseLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```

- [ ] **Step 4.2: Create `app/(app)/course/[id].tsx`**

  ```tsx
  import { useMemo } from 'react';
  import { FlatList, Pressable, Text, View } from 'react-native';
  import { router, useLocalSearchParams } from 'expo-router';
  import { useQuery } from '@tanstack/react-query';
  import { format } from 'date-fns';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { useSession } from '@/lib/hooks/useSession';
  import { useUserRoundsAtCourse } from '@/lib/queries/stats';
  import { supabase, type Tables } from '@/lib/supabase';

  export default function CourseDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { session } = useSession();

    const courseQ = useQuery({
      queryKey: ['course', id],
      queryFn: async () => {
        if (!id) return null;
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data as Tables<'courses'>;
      },
      enabled: !!id,
    });

    const roundsQ = useUserRoundsAtCourse(session?.user.id, id);

    const stats = useMemo(() => {
      const rounds = roundsQ.data ?? [];
      if (rounds.length === 0) return null;
      const scores = rounds.map((r) => r.total_score);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
        played: rounds.length,
        best: Math.min(...scores),
        average: Math.round(avg),
      };
    }, [roundsQ.data]);

    if (!courseQ.data) {
      return (
        <ScreenContainer>
          <Text className="text-text-secondary mt-12">Loading…</Text>
        </ScreenContainer>
      );
    }

    const subtitle = [courseQ.data.city, courseQ.data.state].filter(Boolean).join(', ');

    return (
      <ScreenContainer>
        <Pressable onPress={() => router.back()} className="mt-4 mb-2">
          <Text className="text-text-secondary text-sm">← Back</Text>
        </Pressable>
        <Text className="text-text-primary text-3xl font-light tracking-tight mt-2">
          {courseQ.data.name}
        </Text>
        <Text className="text-text-secondary text-sm mt-1 mb-6">
          {subtitle || '—'} · {courseQ.data.hole_count} holes
        </Text>

        {stats ? (
          <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-6 flex-row">
            <View className="flex-1">
              <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Played</Text>
              <Text className="text-text-primary text-2xl font-light mt-1">{stats.played}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Best</Text>
              <Text className="text-text-primary text-2xl font-light mt-1">{stats.best}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Average</Text>
              <Text className="text-text-primary text-2xl font-light mt-1">{stats.average}</Text>
            </View>
          </View>
        ) : (
          <Text className="text-text-secondary text-sm mb-6">
            You haven&apos;t scored a round here yet.
          </Text>
        )}

        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">
          Your rounds here
        </Text>
        <FlatList
          data={roundsQ.data ?? []}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => {
            const diff = item.total_score - item.total_par;
            const dateStr = format(new Date(item.played_at), 'MMM d, yyyy');
            return (
              <Pressable
                onPress={() => router.push(`/round/${item.id}`)}
                className="flex-row items-center justify-between py-3 border-b border-border-subtle active:opacity-60"
              >
                <View>
                  <Text className="text-text-primary text-sm font-semibold">{dateStr}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-text-primary text-base font-semibold">
                    {item.total_score}
                  </Text>
                  <Text className="text-accent text-xs">
                    {diff >= 0 ? `+${diff}` : diff}
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="text-text-secondary text-sm mt-2">No rounds at this course yet.</Text>
          }
        />
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 4.3: Modify `app/(app)/round/[id].tsx` to make the course name tappable**

  Read the current `app/(app)/round/[id].tsx`. Find the line that renders the course name (currently a plain `<Text>`). Wrap it in a `Pressable` that routes to `/course/<course_id>`.

  Replace this block:

  ```tsx
  <Text className="text-text-primary text-3xl font-light mt-1 mb-4">
    {roundQ.data.courses?.name ?? 'Round'}
  </Text>
  ```

  With:

  ```tsx
  <Pressable
    onPress={() =>
      roundQ.data?.course_id ? router.push(`/course/${roundQ.data.course_id}`) : undefined
    }
    className="active:opacity-70"
  >
    <Text className="text-text-primary text-3xl font-light mt-1 mb-1">
      {roundQ.data.courses?.name ?? 'Round'}
    </Text>
    <Text className="text-accent text-xs uppercase tracking-wider mb-4">View course →</Text>
  </Pressable>
  ```

  Add `Pressable` to the existing `react-native` import if it's not already there.

- [ ] **Step 4.4: Verify**

  ```bash
  npm run typecheck
  npm run lint
  ```

  Both clean.

- [ ] **Step 4.5: Commit**

  ```bash
  git add -A
  git commit -m "feat: add course detail screen with your history at the course"
  git push origin main
  ```

---

## Task 5: Personal-best callout on round summary

**Files:**
- Modify: `app/(app)/round/new/summary.tsx`

When the user finishes a round that's their new course best, surface that on the summary screen *before* they tap Save. Small but high-leverage moment.

- [ ] **Step 5.1: Modify summary.tsx**

  Read the existing summary.tsx. Add the `usePersonalBestAtCourse` query, then conditionally render a "🏆 New course best" pill if the current round's total_score is lower than the prior best (or if there's no prior best).

  Add to imports:

  ```tsx
  import { usePersonalBestAtCourse } from '@/lib/queries/stats';
  import { useSession } from '@/lib/hooks/useSession';
  ```

  Inside the component, near the top:

  ```tsx
  const { session } = useSession();
  const courseId = roundQ.data?.course_id;
  const bestQ = usePersonalBestAtCourse(session?.user.id, courseId);

  // The current round is still a draft (is_draft=true) until Save, and the
  // personal-best query filters to is_draft=false, so it won't include the
  // in-progress round. Either there's no prior best, or this round beats it.
  const isNewBest =
    bestQ.isFetched && (bestQ.data == null || totals.score < bestQ.data.total_score);
  ```

  In the render, immediately after the big score block (the `<View className="bg-bg-surface border border-border-subtle rounded-2xl p-5 mb-4">` that contains the 64pt total), add:

  ```tsx
  {isNewBest ? (
    <View className="bg-accent-soft border border-accent rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
      <Text className="text-base">🏆</Text>
      <Text className="text-accent font-semibold text-sm">
        {bestQ.data == null ? 'First round at this course!' : 'New course best'}
      </Text>
      {bestQ.data != null ? (
        <Text className="text-text-secondary text-xs">
          (was {bestQ.data.total_score})
        </Text>
      ) : null}
    </View>
  ) : null}
  ```

- [ ] **Step 5.2: Verify**

  ```bash
  npm run typecheck
  npm run lint
  ```

  Both clean.

- [ ] **Step 5.3: Commit**

  ```bash
  git add -A
  git commit -m "feat: show personal-best callout on round summary"
  git push origin main
  ```

---

## Task 6: Phase 2 verification + tag

This is a manual user-facing test, then tag the milestone.

- [ ] **Step 6.1: USER ACTION — test on phone**

  Reload the app in Expo Go.

  1. **Profile tab:** Stats summary card visible at top with rounds count, average, best score, trend (last 5). All values reflect your real saved rounds.
  2. **Tap "View detailed stats →"** → routes to `/stats`. Trend chart renders if you have ≥2 rounds. Best-per-par cells show numbers from your scoring history.
  3. **Tap a round on Profile** → opens round detail. Tap the course name → routes to course detail. Course detail shows played/best/average tiles + your rounds at this course.
  4. **Score a new round at a course you've played before, with a lower total score.** On the summary screen (before saving), the "🏆 New course best" pill appears with the prior best score.

- [ ] **Step 6.2: Run final checks**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npm run typecheck
  npm run lint
  ```

  Both clean.

- [ ] **Step 6.3: Tag**

  ```bash
  git tag -a phase-2 -m "Phase 2 complete: stats summary, trend chart, best-per-par, course detail, new-best callout"
  git push origin --tags
  ```

---

## Phase 2 Completion Criteria

Phase 2 is complete when ALL of the following are true:

1. ✅ `lib/queries/stats.ts` exists with 5 hooks (summary, personal best, trend, best-per-par, user-rounds-at-course)
2. ✅ Profile tab shows the StatsSummaryCard with real data
3. ✅ `/stats` screen renders the trend chart (≥2 rounds) and the best-per-par row
4. ✅ `/course/[id]` shows played/best/average + rounds at the course
5. ✅ Round detail's course name is a tappable link to course detail
6. ✅ Round summary shows "🏆 New course best" callout when applicable
7. ✅ `npm run typecheck` and `npm run lint` pass
8. ✅ Git tagged `phase-2`, pushed to GitHub

After Phase 2: write the Phase 3 plan (social layer — follow, mutuals, feed, likes/comments, block/report, contacts invite). That's the longest phase but the most exciting — it's where the app becomes recognizably "social golf."
