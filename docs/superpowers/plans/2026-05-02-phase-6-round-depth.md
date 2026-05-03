# Phase 6 — Round Depth (Bucket A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add depth to the post-round experience — round notes, post-save editing, an achievements trophy case, detailed stats (fairway/GIR/par-type), and a "home course" setting — without changing the scoring flow.

**Architecture:** All changes are additive on top of the existing schema. The DB already has every column we need (`rounds.notes`, `round_holes.fairway_hit`/`gir`/`putts`, `profiles.home_course_id`); this phase is mostly UI + new TanStack Query hooks + one small migration to add the home-course nav-link surface. Visual language stays Linksman editorial-bone for reflection screens, ink for live entry.

**Tech Stack:** Expo Router, TanStack Query, Supabase, NativeWind, react-native-svg, date-fns. Linksman theme primitives (`ScoreNumeral`, `Datum`, `MonoBadge`, `Topo`, `ScreenContainer`).

**User decisions baked in:**
- **Skip** handicap math + tee box selection (no easy free source for course rating/slope).
- **Keep** edit rounds, notes UI, achievements, detailed stats UI, home course.
- ~8 tasks total.

---

## File Structure

### New files
- `lib/queries/achievements.ts` — `useAchievements(userId)` returning `{ eagles, aces, albatrosses, courseBests, firstEagleAt, firstAceAt }`.
- `lib/queries/detailedStats.ts` — `useDetailedStats(userId, holeCount?)` returning `{ fairwayPct, girPct, avgPutts, byPar: { 3: {avg, best}, 4: {...}, 5: {...} } }`.
- `app/(app)/achievements.tsx` — trophy-case screen at `/achievements`.
- `app/(app)/round/[id]/edit.tsx` — edit-mode wrapper that re-uses the live scoring screen for a saved (non-draft) round.
- `components/NotesField.tsx` — single-line text input + multiline editor sheet, ≤500 chars (matches DB CHECK).
- `components/AchievementCard.tsx` — single trophy tile (icon + label + count + date of first).
- `components/StatRow.tsx` — `<StatRow label value sub />` Datum-styled row used across detailed stats.

### Modified files
- `app/(app)/round/new/score.tsx` — add NotesField below GIR/fairway chips.
- `app/(app)/round/new/summary.tsx` — show notes in summary (read-only display before save).
- `app/(app)/round/[id].tsx` — render notes block; add **Edit round** action in ••• menu (owner only) → routes to `/round/[id]/edit`.
- `app/(app)/stats.tsx` — append "Detailed stats" section using `useDetailedStats`.
- `app/(app)/(tabs)/profile.tsx` — append "Home course" link row that routes to course detail; add "Trophy case →" link.
- `app/(app)/(tabs)/settings.tsx` — add "Home course" picker row (sets `profiles.home_course_id`).
- `lib/queries/profile.ts` — add `useUpdateHomeCourse(userId)` mutation.
- `lib/queries/rounds.ts` — add `useUpdateRoundNotes(roundId)` mutation; broaden `useUpsertHoleScore` so it works on saved rounds (already does — just verified).

### New migration
- `supabase/migrations/20260508000001_phase6_profiles_home_course_fk.sql` — adds the FK constraint between `profiles.home_course_id` and `courses.id` (column exists; FK was deferred). No new columns.

---

## Task 1: Home-course FK + mutation hook

**Files:**
- Create: `supabase/migrations/20260508000001_phase6_profiles_home_course_fk.sql`
- Modify: `lib/queries/profile.ts`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260508000001_phase6_profiles_home_course_fk.sql
ALTER TABLE profiles
  ADD CONSTRAINT profiles_home_course_id_fkey
  FOREIGN KEY (home_course_id) REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_home_course_id_idx ON profiles(home_course_id);
```

- [ ] **Step 2: Apply migration**

Run: `npx supabase db push`
Expected: `Applying migration 20260508000001_phase6_profiles_home_course_fk.sql ✓`

- [ ] **Step 3: Add mutation hook**

Add to bottom of `lib/queries/profile.ts`:

```ts
export function useUpdateHomeCourse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; courseId: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ home_course_id: input.courseId })
        .eq('id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['profile', vars.userId] });
    },
  });
}
```

(Imports already present in profile.ts: `useMutation`, `useQueryClient`, `supabase`. Verify before saving.)

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260508000001_phase6_profiles_home_course_fk.sql lib/queries/profile.ts
git commit -m "Phase 6: profiles.home_course_id FK + useUpdateHomeCourse"
```

---

## Task 2: Home-course picker in Settings

**Files:**
- Modify: `app/(app)/(tabs)/settings.tsx`

- [ ] **Step 1: Add Home Course row above the Legal section**

Insert this block just before the `Legal` label `<Text>` in `settings.tsx`:

```tsx
{profileQ.data?.home_course_id ? (
  <Pressable
    onPress={() =>
      router.push({
        pathname: '/(app)/course/[id]',
        params: { id: profileQ.data!.home_course_id! },
      })
    }
    style={{
      paddingVertical: 14,
      borderBottomWidth: 0.5,
      borderBottomColor: palette.ink + '20',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}
  >
    <View>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.55,
          textTransform: 'uppercase',
        }}
      >
        HOME COURSE
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 18,
          color: palette.ink,
          marginTop: 2,
        }}
      >
        {profileQ.data?.home_course?.name ?? '—'}
      </Text>
    </View>
    <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, color: palette.ink, opacity: 0.4 }}>
      →
    </Text>
  </Pressable>
) : null}
<Pressable
  onPress={() => router.push('/(app)/round/new/picker?mode=homeCourse')}
  style={{ paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: palette.ink + '20' }}
>
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 12,
      letterSpacing: 12 * 0.12,
      color: palette.fairway,
      textTransform: 'uppercase',
    }}
  >
    {profileQ.data?.home_course_id ? 'CHANGE HOME COURSE' : 'SET HOME COURSE'}
  </Text>
</Pressable>
```

- [ ] **Step 2: Update `useMyProfile` to include home_course join**

In `lib/queries/profile.ts`, change the select on `useMyProfile` from `'*'` to `'*, home_course:courses!home_course_id(id, name)'`. Update the row type accordingly:

```ts
return data as Tables<'profiles'> & { home_course: { id: string; name: string } | null };
```

- [ ] **Step 3: Wire course picker `homeCourse` mode**

In `app/(app)/round/new/picker.tsx`, read the `mode` query param. When `mode === 'homeCourse'`, on selection call `useUpdateHomeCourse` instead of creating a draft round, then `router.back()`.

Code (add near top of component):

```ts
const params = useLocalSearchParams<{ mode?: string }>();
const isHomeCourseMode = params.mode === 'homeCourse';
const updateHomeCourse = useUpdateHomeCourse();
```

In the select-course handler, branch:

```ts
if (isHomeCourseMode) {
  await updateHomeCourse.mutateAsync({ userId: session!.user.id, courseId: course.id });
  router.back();
  return;
}
// ...existing draft-creation path
```

- [ ] **Step 4: Manual verify**

Reload app → Settings → tap **SET HOME COURSE** → pick a course → returns to Settings → "HOME COURSE" row now shows the name. Tap row → opens course detail.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\(tabs\)/settings.tsx app/\(app\)/round/new/picker.tsx lib/queries/profile.ts
git commit -m "Phase 6: home course picker in Settings"
```

---

## Task 3: Round notes UI (live entry + summary + saved)

**Files:**
- Create: `components/NotesField.tsx`
- Modify: `app/(app)/round/new/score.tsx`, `app/(app)/round/new/summary.tsx`, `app/(app)/round/[id].tsx`, `lib/queries/rounds.ts`

- [ ] **Step 1: Create NotesField component**

```tsx
// components/NotesField.tsx
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  surface?: 'ink' | 'bone';
};

const MAX = 500;

export function NotesField({ value, onChange, onCommit, surface = 'ink' }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const fg = surface === 'ink' ? palette.bone : palette.ink;

  const save = () => {
    const trimmed = draft.slice(0, MAX);
    onChange(trimmed);
    onCommit?.(trimmed);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        style={{ paddingVertical: 14 }}
      >
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: fg,
            opacity: 0.55,
            textTransform: 'uppercase',
          }}
        >
          NOTES
        </Text>
        <Text
          style={{
            fontFamily: value ? fontFamily.displayItalic : fontFamily.mono,
            fontSize: value ? 16 : 11,
            color: fg,
            opacity: value ? 0.9 : 0.5,
            marginTop: 6,
          }}
          numberOfLines={2}
        >
          {value || 'Tap to add a note about this round'}
        </Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: palette.ink + 'EE', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: palette.bone, padding: 24, paddingBottom: 48 }}>
            <TextInput
              value={draft}
              onChangeText={(t) => setDraft(t.slice(0, MAX))}
              multiline
              autoFocus
              placeholder="How did it play?"
              placeholderTextColor={palette.ink + '66'}
              style={{
                fontFamily: fontFamily.editorial,
                fontSize: 18,
                color: palette.ink,
                minHeight: 140,
                textAlignVertical: 'top',
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 10,
                  color: palette.ink,
                  opacity: 0.5,
                }}
              >
                {draft.length}/{MAX}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 12,
                      letterSpacing: 12 * 0.16,
                      color: palette.ink,
                      opacity: 0.55,
                      textTransform: 'uppercase',
                    }}
                  >
                    CANCEL
                  </Text>
                </Pressable>
                <Pressable onPress={save}>
                  <Text
                    style={{
                      fontFamily: fontFamily.mono,
                      fontSize: 12,
                      letterSpacing: 12 * 0.16,
                      color: palette.fairway,
                      textTransform: 'uppercase',
                    }}
                  >
                    SAVE
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Add useUpdateRoundNotes hook**

Append to `lib/queries/rounds.ts`:

```ts
export function useUpdateRoundNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; notes: string }) => {
      const { error } = await supabase
        .from('rounds')
        .update({ notes: input.notes || null })
        .eq('id', input.roundId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['round', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}
```

- [ ] **Step 3: Wire NotesField into live scoring**

In `app/(app)/round/new/score.tsx`, just below the GIR/fairway chips, add:

```tsx
<View style={{ marginTop: 24, borderTopWidth: 0.5, borderTopColor: palette.bone + '22' }}>
  <NotesField
    value={round.notes ?? ''}
    onChange={(t) => updateRound.mutate({ roundId: round.id, notes: t })}
    surface="ink"
  />
</View>
```

Where `updateRound = useUpdateRoundNotes()`. Replace `round.notes` with whatever the local round variable name is in this file (verify when implementing).

- [ ] **Step 4: Show notes on round detail**

In `app/(app)/round/[id].tsx`, below the score block and above the HoleGrid, render:

```tsx
{round.notes ? (
  <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
    <Text
      style={{
        fontFamily: fontFamily.displayItalic,
        fontSize: 18,
        lineHeight: 26,
        color: palette.ink,
      }}
    >
      “{round.notes}”
    </Text>
  </View>
) : null}
```

- [ ] **Step 5: Show notes on round summary (pre-save)**

In `app/(app)/round/new/summary.tsx`, below the score hero, render the same NotesField (read+write) so the user can add a note before tapping Save.

- [ ] **Step 6: Manual verify**

Score a hole → tap NOTES → type "windy back nine" → SAVE → reload → note still there. Save round → on round detail, the italic quote appears.

- [ ] **Step 7: Commit**

```bash
git add components/NotesField.tsx lib/queries/rounds.ts app/\(app\)/round/new/score.tsx app/\(app\)/round/new/summary.tsx app/\(app\)/round/\[id\].tsx
git commit -m "Phase 6: round notes UI (live + summary + detail)"
```

---

## Task 4: Edit saved round

**Files:**
- Create: `app/(app)/round/[id]/edit.tsx`
- Modify: `app/(app)/round/[id].tsx`, `app/(app)/round/new/score.tsx`

- [ ] **Step 1: Refactor live-scoring screen to accept any roundId**

In `app/(app)/round/new/score.tsx`, the screen currently looks up the user's draft round. Add a param fallback: read `useLocalSearchParams<{ roundId?: string }>()`. If `roundId` is present, load **that** round (regardless of `is_draft`) instead of the draft.

Pseudocode change at the top of the component:

```ts
const { roundId } = useLocalSearchParams<{ roundId?: string }>();
const draftQ = useDraftRound(session?.user.id);
const explicitRoundQ = useQuery({
  queryKey: ['round', roundId],
  queryFn: async () => {
    if (!roundId) return null;
    const { data, error } = await supabase.from('rounds').select('*').eq('id', roundId).single();
    if (error) throw error;
    return data as Tables<'rounds'>;
  },
  enabled: !!roundId,
});
const round = roundId ? explicitRoundQ.data : draftQ.data;
const isEditMode = !!roundId && round && !round.is_draft;
```

The hole-score upsert mutation (`useUpsertHoleScore`) already targets `round_id`, so it works for saved rounds without change.

- [ ] **Step 2: Change "Finish round" button text in edit mode**

When `isEditMode`, the "Finish round" button (which routes to summary) should instead say **DONE** and `router.back()` after recomputing totals. Add a small mutation:

```ts
async function recomputeTotals() {
  if (!round) return;
  const { data: holes } = await supabase
    .from('round_holes')
    .select('score, par')
    .eq('round_id', round.id);
  const total_score = (holes ?? []).reduce((s, h) => s + (h.score ?? 0), 0);
  const total_par = (holes ?? []).reduce((s, h) => s + (h.par ?? 0), 0);
  await supabase.from('rounds').update({ total_score, total_par }).eq('id', round.id);
  qc.invalidateQueries({ queryKey: ['round', round.id] });
  qc.invalidateQueries({ queryKey: ['rounds'] });
}
```

Call `recomputeTotals()` then `router.back()` on the DONE tap.

- [ ] **Step 3: Add edit-mode wrapper route**

```tsx
// app/(app)/round/[id]/edit.tsx
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function EditRoundRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/(app)/round/new/score', params: { roundId: id } }} />;
}
```

- [ ] **Step 4: Add Edit action in round-detail ••• menu**

In `app/(app)/round/[id].tsx`, inside `onTapMore`, add a button to the owner-only branch (above Delete):

```ts
{
  text: 'Edit round',
  onPress: () => router.push({ pathname: '/(app)/round/[id]/edit', params: { id: round.id } }),
},
```

- [ ] **Step 5: Manual verify**

Save a round with score 84. Tap ••• on round detail → Edit round → opens scoring screen prefilled with the existing scores. Change hole 7 from 5 to 4. Tap DONE → returns to round detail, total now 83.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/round/\[id\]/edit.tsx app/\(app\)/round/\[id\].tsx app/\(app\)/round/new/score.tsx
git commit -m "Phase 6: edit saved rounds via scoring screen"
```

---

## Task 5: Detailed stats query

**Files:**
- Create: `lib/queries/detailedStats.ts`

- [ ] **Step 1: Implement hook**

```ts
// lib/queries/detailedStats.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type ParBucket = { count: number; avg: number | null; best: number | null };
export type DetailedStats = {
  fairwayPct: number | null; // par-4/5 only, ratio of fairway_hit=true / non-null
  girPct: number | null;
  avgPutts: number | null;
  byPar: Record<3 | 4 | 5, ParBucket>;
};

const EMPTY: DetailedStats = {
  fairwayPct: null,
  girPct: null,
  avgPutts: null,
  byPar: {
    3: { count: 0, avg: null, best: null },
    4: { count: 0, avg: null, best: null },
    5: { count: 0, avg: null, best: null },
  },
};

export function useDetailedStats(userId: string | undefined, holeCount?: number) {
  return useQuery({
    queryKey: ['stats', 'detailed', userId, holeCount],
    queryFn: async (): Promise<DetailedStats> => {
      if (!userId) return EMPTY;

      const roundsRes = await supabase
        .from('rounds')
        .select('id, hole_count, courses(hole_count)')
        .eq('user_id', userId)
        .eq('is_draft', false);
      if (roundsRes.error) throw roundsRes.error;
      const rows = roundsRes.data ?? [];
      const filtered = holeCount
        ? rows.filter(
            (r) =>
              ((r as { hole_count: number | null }).hole_count ??
                (r.courses as { hole_count: number } | null)?.hole_count ??
                18) === holeCount,
          )
        : rows;
      const ids = filtered.map((r) => r.id);
      if (ids.length === 0) return EMPTY;

      const holesRes = await supabase
        .from('round_holes')
        .select('par, score, putts, fairway_hit, gir')
        .in('round_id', ids);
      if (holesRes.error) throw holesRes.error;
      const holes = holesRes.data ?? [];

      let fwHit = 0;
      let fwTotal = 0;
      let girHit = 0;
      let girTotal = 0;
      let puttsSum = 0;
      let puttsTotal = 0;
      const byPar: DetailedStats['byPar'] = {
        3: { count: 0, avg: null, best: null },
        4: { count: 0, avg: null, best: null },
        5: { count: 0, avg: null, best: null },
      };
      const sums: Record<number, { sum: number; n: number; min: number }> = {};

      for (const h of holes) {
        if (h.par === 4 || h.par === 5) {
          if (h.fairway_hit !== null) {
            fwTotal++;
            if (h.fairway_hit) fwHit++;
          }
        }
        if (h.gir !== null) {
          girTotal++;
          if (h.gir) girHit++;
        }
        if (h.putts !== null) {
          puttsTotal++;
          puttsSum += h.putts;
        }
        if (h.par === 3 || h.par === 4 || h.par === 5) {
          const s = sums[h.par] ?? { sum: 0, n: 0, min: Infinity };
          s.sum += h.score;
          s.n += 1;
          if (h.score < s.min) s.min = h.score;
          sums[h.par] = s;
        }
      }
      for (const p of [3, 4, 5] as const) {
        const s = sums[p];
        if (s && s.n > 0) {
          byPar[p] = { count: s.n, avg: s.sum / s.n, best: s.min };
        }
      }
      return {
        fairwayPct: fwTotal ? fwHit / fwTotal : null,
        girPct: girTotal ? girHit / girTotal : null,
        avgPutts: puttsTotal ? puttsSum / puttsTotal : null,
        byPar,
      };
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/queries/detailedStats.ts
git commit -m "Phase 6: useDetailedStats hook (fairway/GIR/putts/by-par)"
```

---

## Task 6: Detailed stats UI

**Files:**
- Create: `components/StatRow.tsx`
- Modify: `app/(app)/stats.tsx`

- [ ] **Step 1: Create StatRow component**

```tsx
// components/StatRow.tsx
import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = { label: string; value: string; sub?: string };

export function StatRow({ label, value, sub }: Props) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingVertical: 14,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.ink + '20',
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 11,
          letterSpacing: 11 * 0.16,
          color: palette.ink,
          opacity: 0.7,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: palette.ink }}>
          {value}
        </Text>
        {sub ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 10,
              color: palette.ink,
              opacity: 0.5,
            }}
          >
            {sub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Append Detailed Stats section to stats screen**

In `app/(app)/stats.tsx`, import and call `useDetailedStats(viewerId, 18)`. Below the existing trend/best-per-par sections, add:

```tsx
<Text
  style={{
    fontFamily: fontFamily.mono,
    fontSize: 9,
    letterSpacing: 9 * 0.2,
    color: palette.ink,
    opacity: 0.55,
    textTransform: 'uppercase',
    marginTop: 32,
    marginBottom: 4,
  }}
>
  DETAILED STATS · 18-HOLE
</Text>
<StatRow
  label="FAIRWAYS"
  value={detailed.fairwayPct == null ? '—' : `${Math.round(detailed.fairwayPct * 100)}%`}
/>
<StatRow
  label="GREENS IN REG"
  value={detailed.girPct == null ? '—' : `${Math.round(detailed.girPct * 100)}%`}
/>
<StatRow
  label="AVG PUTTS"
  value={detailed.avgPutts == null ? '—' : detailed.avgPutts.toFixed(1)}
  sub="per hole"
/>
{([3, 4, 5] as const).map((p) => {
  const b = detailed.byPar[p];
  return (
    <StatRow
      key={p}
      label={`PAR ${p}`}
      value={b.avg == null ? '—' : b.avg.toFixed(2)}
      sub={b.best == null ? '' : `best ${b.best}`}
    />
  );
})}
```

Where `detailed = detailedStatsQ.data ?? <EMPTY shape>`. Provide a safe fallback inline when `data` is undefined.

- [ ] **Step 3: Manual verify**

Open Stats tab. With at least one 18-hole round logged with fairway/GIR/putts data, see the Fairways %, GIR %, Avg Putts, and per-par averages render. Holes without optional data are excluded from the % calc (verify by checking against your raw inputs).

- [ ] **Step 4: Commit**

```bash
git add components/StatRow.tsx app/\(app\)/stats.tsx
git commit -m "Phase 6: detailed stats section (fairway, GIR, putts, by-par)"
```

---

## Task 7: Achievements query + trophy case

**Files:**
- Create: `lib/queries/achievements.ts`, `components/AchievementCard.tsx`, `app/(app)/achievements.tsx`
- Modify: `app/(app)/(tabs)/profile.tsx`

- [ ] **Step 1: Implement achievements query**

```ts
// lib/queries/achievements.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type Achievements = {
  eagles: number;
  aces: number;
  albatrosses: number;
  courseBests: { course_id: string; course_name: string; total_score: number; round_id: string }[];
  firstEagleAt: string | null;
  firstAceAt: string | null;
};

export function useAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['achievements', userId],
    queryFn: async (): Promise<Achievements> => {
      const empty: Achievements = {
        eagles: 0,
        aces: 0,
        albatrosses: 0,
        courseBests: [],
        firstEagleAt: null,
        firstAceAt: null,
      };
      if (!userId) return empty;

      const roundsRes = await supabase
        .from('rounds')
        .select('id, course_id, total_score, played_at, courses(name)')
        .eq('user_id', userId)
        .eq('is_draft', false)
        .order('played_at', { ascending: true });
      if (roundsRes.error) throw roundsRes.error;
      const rounds = roundsRes.data ?? [];
      if (rounds.length === 0) return empty;

      const ids = rounds.map((r) => r.id);
      const holesRes = await supabase
        .from('round_holes')
        .select('par, score, round_id')
        .in('round_id', ids);
      if (holesRes.error) throw holesRes.error;
      const roundDate = new Map(rounds.map((r) => [r.id, r.played_at]));

      let eagles = 0;
      let aces = 0;
      let albatrosses = 0;
      let firstEagleAt: string | null = null;
      let firstAceAt: string | null = null;
      const sortedHoles = [...(holesRes.data ?? [])].sort((a, b) => {
        const da = roundDate.get(a.round_id) ?? '';
        const db = roundDate.get(b.round_id) ?? '';
        return da.localeCompare(db);
      });
      for (const h of sortedHoles) {
        const diff = h.score - h.par;
        const at = roundDate.get(h.round_id) ?? null;
        if (h.score === 1) {
          aces++;
          if (!firstAceAt) firstAceAt = at;
        }
        if (diff === -2) {
          eagles++;
          if (!firstEagleAt) firstEagleAt = at;
        }
        if (diff <= -3) {
          albatrosses++;
        }
      }

      const bestByCourse = new Map<
        string,
        { course_id: string; course_name: string; total_score: number; round_id: string }
      >();
      for (const r of rounds) {
        const cur = bestByCourse.get(r.course_id);
        if (!cur || r.total_score < cur.total_score) {
          bestByCourse.set(r.course_id, {
            course_id: r.course_id,
            course_name: (r.courses as { name: string } | null)?.name ?? 'Course',
            total_score: r.total_score,
            round_id: r.id,
          });
        }
      }
      return {
        eagles,
        aces,
        albatrosses,
        firstEagleAt,
        firstAceAt,
        courseBests: Array.from(bestByCourse.values()).sort((a, b) => a.total_score - b.total_score),
      };
    },
    enabled: !!userId,
  });
}
```

- [ ] **Step 2: AchievementCard component**

```tsx
// components/AchievementCard.tsx
import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = { label: string; count: number; firstAt?: string | null; symbol?: string };

export function AchievementCard({ label, count, firstAt, symbol = '◆' }: Props) {
  const muted = count === 0;
  return (
    <View
      style={{
        flex: 1,
        paddingVertical: 18,
        paddingHorizontal: 14,
        borderWidth: 0.5,
        borderColor: palette.ink + '33',
        opacity: muted ? 0.4 : 1,
      }}
    >
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 14,
          color: muted ? palette.ink : palette.brass,
        }}
      >
        {symbol}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.display,
          fontSize: 32,
          color: palette.ink,
          marginTop: 8,
        }}
      >
        {count}
      </Text>
      <Text
        style={{
          fontFamily: fontFamily.mono,
          fontSize: 9,
          letterSpacing: 9 * 0.2,
          color: palette.ink,
          opacity: 0.6,
          textTransform: 'uppercase',
          marginTop: 4,
        }}
      >
        {label}
      </Text>
      {firstAt && count > 0 ? (
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            color: palette.ink,
            opacity: 0.45,
            marginTop: 2,
          }}
        >
          first {new Date(firstAt).toLocaleDateString()}
        </Text>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 3: Trophy-case screen**

```tsx
// app/(app)/achievements.tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { AchievementCard } from '@/components/AchievementCard';
import { useAchievements } from '@/lib/queries/achievements';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function Achievements() {
  const { session } = useSession();
  const q = useAchievements(session?.user.id);
  const a = q.data;

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View
          style={{
            paddingTop: 8,
            paddingBottom: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={() => router.back()}>
            <Text
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                letterSpacing: 11 * 0.16,
                color: palette.ink,
                opacity: 0.6,
                textTransform: 'uppercase',
              }}
            >
              BACK
            </Text>
          </Pressable>
        </View>

        <Text
          style={{
            fontFamily: fontFamily.display,
            fontSize: 36,
            color: palette.ink,
            marginTop: 16,
          }}
        >
          Trophy case
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
          <AchievementCard label="EAGLES" count={a?.eagles ?? 0} firstAt={a?.firstEagleAt} />
          <AchievementCard label="ACES" count={a?.aces ?? 0} firstAt={a?.firstAceAt} />
          <AchievementCard label="ALBATROSS" count={a?.albatrosses ?? 0} />
        </View>

        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.55,
            textTransform: 'uppercase',
            marginTop: 40,
            marginBottom: 4,
          }}
        >
          Course bests
        </Text>
        {(a?.courseBests ?? []).map((cb) => (
          <Pressable
            key={cb.course_id}
            onPress={() =>
              router.push({ pathname: '/round/[id]', params: { id: cb.round_id } })
            }
            style={{
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: palette.ink + '20',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink, flex: 1 }}
            >
              {cb.course_name}
            </Text>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
              {cb.total_score}
            </Text>
          </Pressable>
        ))}
        {(a?.courseBests ?? []).length === 0 ? (
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 16,
            }}
          >
            Save your first round to unlock your trophy case.
          </Text>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 4: Add "Trophy case →" link on Profile**

In `app/(app)/(tabs)/profile.tsx`, between the `WeeklySummary` and the "Recent rounds" label, insert:

```tsx
<Pressable
  onPress={() => router.push('/(app)/achievements')}
  style={{
    marginTop: 24,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: palette.ink + '33',
  }}
>
  <Text
    style={{
      fontFamily: fontFamily.mono,
      fontSize: 12,
      letterSpacing: 12 * 0.12,
      color: palette.ink,
      textTransform: 'uppercase',
    }}
  >
    TROPHY CASE
  </Text>
  <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, color: palette.ink, opacity: 0.4 }}>
    →
  </Text>
</Pressable>
```

- [ ] **Step 5: Manual verify**

Score a par 4 and shoot 2 (eagle). Open Profile → Trophy case → "EAGLES: 1, first <today>". Course Bests row shows your latest course at the top.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/achievements.ts components/AchievementCard.tsx app/\(app\)/achievements.tsx app/\(app\)/\(tabs\)/profile.tsx
git commit -m "Phase 6: achievements trophy case (eagles, aces, albatross, course bests)"
```

---

## Task 8: Tag phase-6 + memory update

**Files:**
- Modify: `~/.claude/projects/-Users-gavingillespie-Desktop-Golf-App/memory/build_state.md`

- [ ] **Step 1: Run full app smoke test**

Steps to run on phone:
1. Add a note while scoring a round, save round, see note on round detail.
2. Tap Edit on a saved round, change a hole, see new total.
3. Set a home course in Settings, see it on the Settings page, tap to navigate to course detail.
4. Score a par 4 with 2 strokes, open Trophy case, eagle count is 1.
5. Open Stats screen, see Fairway/GIR/Putts/By-par section.

- [ ] **Step 2: Update memory build_state.md**

Set Phase 6 as shipped+tagged. Update Next phase pointer to Phase 7 (group rounds level C). Move Phase 6 plan path into the Phase plans list.

- [ ] **Step 3: Tag phase-6**

```bash
cd "/Users/gavingillespie/Desktop/Golf App"
git tag phase-6
git push origin phase-6
```

- [ ] **Step 4: Commit memory update**

```bash
cd ~/.claude/projects/-Users-gavingillespie-Desktop-Golf-App/memory
# (Edits already made by Step 2 — no separate commit; memory dir is not a repo.)
```

---

## Self-review notes

- **Spec coverage:** edit ✓ (Task 4), notes ✓ (Task 3), achievements ✓ (Task 7), detailed stats ✓ (Tasks 5+6), home course ✓ (Tasks 1+2). Skipped handicap/tee box per user.
- **Schema:** every column needed already exists; only the home-course FK is added.
- **Visual:** stays in established Linksman primitives (ScoreNumeral, Datum, MonoBadge, ScreenContainer surface=bone). No new primitives beyond StatRow + AchievementCard + NotesField.
- **Tests:** this is UI-heavy on top of a manually-tested app; verification is "run on phone, see expected result." No Jest tests added to keep the phase tight, matching project convention.
