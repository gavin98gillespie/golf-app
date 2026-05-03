# Phase 7 — Group Rounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Real-time multiplayer group rounds — each player scores their own slice live, round shared on every participant's mutuals' feeds. ~12 tasks, 4 weeks.

**Spec:** `docs/superpowers/specs/2026-05-03-phase-7-group-rounds-design.md`

**Tech stack:** Expo SDK 54, expo-router, Supabase (Postgres + RLS + Realtime + RPC), TanStack Query, Linksman theme.

**Conventions:**
- Work directly on `main`. No worktrees. Commit when done.
- `npm install --legacy-peer-deps` for any new dep.
- Generated `lib/database.types.ts` is gitignored from ESLint; regenerate with `npm run db:types` after migrations.
- One subagent per task. After all 12, full phone test → `git tag phase-7 && git push origin main phase-7`.

---

## Task 1: Schema migrations (M1+M2+M3)

**Files:**
- Create: `supabase/migrations/20260509000001_phase7_rounds_group_columns.sql`
- Create: `supabase/migrations/20260509000002_phase7_round_players.sql`
- Create: `supabase/migrations/20260509000003_phase7_round_holes_player_id.sql`

- [ ] **Step 1: M1 — rounds extensions**

```sql
-- 20260509000001_phase7_rounds_group_columns.sql
ALTER TABLE rounds ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN live_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN join_code TEXT UNIQUE;
ALTER TABLE rounds ADD COLUMN invites_locked_at TIMESTAMPTZ;

CREATE INDEX rounds_join_code_idx ON rounds(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX rounds_is_group_idx ON rounds(is_group) WHERE is_group = true;
```

- [ ] **Step 2: M2 — round_players**

```sql
-- 20260509000002_phase7_round_players.sql
CREATE TABLE round_players (
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tee_box      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('invited','joined','withdrawn','finished')),
  notes        TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  joined_at    TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  invited_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (round_id, user_id)
);

CREATE INDEX round_players_user_status_idx ON round_players(user_id, status);
CREATE INDEX round_players_round_idx ON round_players(round_id);
```

- [ ] **Step 3: M3 — round_holes.player_id + backfill**

```sql
-- 20260509000003_phase7_round_holes_player_id.sql
ALTER TABLE round_holes ADD COLUMN player_id UUID REFERENCES profiles(id);
UPDATE round_holes rh SET player_id = r.user_id FROM rounds r WHERE rh.round_id = r.id;
ALTER TABLE round_holes ALTER COLUMN player_id SET NOT NULL;

-- Replace old (round_id, hole_number) unique with per-player constraint
ALTER TABLE round_holes DROP CONSTRAINT IF EXISTS round_holes_round_id_hole_number_key;
ALTER TABLE round_holes ADD CONSTRAINT round_holes_unique_player_hole UNIQUE (round_id, player_id, hole_number);

-- Also backfill round_players with one row per existing solo round
INSERT INTO round_players (round_id, user_id, tee_box, status, joined_at)
SELECT id, user_id, tee_box, 'finished', COALESCE(played_at::timestamptz, created_at)
FROM rounds
WHERE id NOT IN (SELECT round_id FROM round_players);
```

- [ ] **Step 4: Apply**

Run:
```bash
npx supabase db push
```

Expected: 3 migrations applied cleanly. If the `round_holes_round_id_hole_number_key` constraint name differs in production, capture the actual name with `\d round_holes` in psql first; the migration uses IF EXISTS so a name mismatch fails silently — verify post-apply that the new unique constraint exists.

- [ ] **Step 5: Regenerate types**

```bash
npm run db:types
```

Verify `lib/database.types.ts` now includes `round_players` row type and `rounds` has the new columns.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/ lib/database.types.ts
git commit -m "Phase 7 task 1: schema (rounds group cols + round_players + round_holes.player_id)"
```

---

## Task 2: RLS expansion (M4 + helpers)

**Files:**
- Create: `supabase/migrations/20260509000004_phase7_rls_group_rounds.sql`

- [ ] **Step 1: Helpers**

```sql
-- 20260509000004_phase7_rls_group_rounds.sql

-- Returns true if viewer is in the round (joined or finished)
CREATE OR REPLACE FUNCTION is_in_round(p_round_id UUID, p_viewer UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM round_players
    WHERE round_id = p_round_id
      AND user_id = p_viewer
      AND status IN ('joined','finished')
  );
$$;

-- Returns true if viewer is mutual with any joined/finished player in the round
CREATE OR REPLACE FUNCTION is_mutual_of_any_round_player(p_round_id UUID, p_viewer UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM round_players rp
    WHERE rp.round_id = p_round_id
      AND rp.status IN ('joined','finished')
      AND rp.user_id <> p_viewer
      AND are_mutuals(rp.user_id, p_viewer)
      AND NOT is_blocked(rp.user_id, p_viewer)
  );
$$;
```

- [ ] **Step 2: Update rounds SELECT policy**

```sql
DROP POLICY IF EXISTS "rounds_select_owner_mutuals_or_public" ON rounds;
CREATE POLICY "rounds_select_owner_mutuals_or_public"
  ON rounds FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      NOT is_blocked(user_id, auth.uid())
      AND (
        are_mutuals(user_id, auth.uid())
        OR is_in_round(id, auth.uid())
        OR is_mutual_of_any_round_player(id, auth.uid())
      )
    )
  );
```

(Look up the actual existing policy name with `\dp rounds` first; replace `rounds_select_owner_mutuals_or_public` if different. The migration must DROP the existing policy by its real name.)

- [ ] **Step 3: round_players policies**

```sql
ALTER TABLE round_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "round_players_select"
  ON round_players FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_in_round(round_id, auth.uid())
    OR is_mutual_of_any_round_player(round_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id AND r.user_id = auth.uid()
    )
  );

-- Host can insert invited rows for mutuals
CREATE POLICY "round_players_insert_host"
  ON round_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id
        AND r.user_id = auth.uid()
        AND r.invites_locked_at IS NULL
    )
    AND status = 'invited'
    AND are_mutuals(auth.uid(), user_id)
  );

-- Host can insert their own joined row (for the auto-insert on round creation)
CREATE POLICY "round_players_insert_self_host"
  ON round_players FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_players.round_id AND r.user_id = auth.uid()
    )
    AND status = 'joined'
  );

-- Player can transition own row (accept invite, withdraw, finish)
CREATE POLICY "round_players_update_self"
  ON round_players FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Host can update anyone's status to 'finished' (force-end power)
CREATE POLICY "round_players_update_host_finish"
  ON round_players FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM rounds r WHERE r.id = round_id AND r.user_id = auth.uid())
  )
  WITH CHECK (status = 'finished');

-- Player can delete own row only when status='invited' (decline invite)
CREATE POLICY "round_players_delete_self_decline"
  ON round_players FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'invited');
```

- [ ] **Step 4: round_holes policy update**

The existing INSERT/UPDATE policy keys off `round.user_id`. Update to allow any joined player to write their own scores.

```sql
DROP POLICY IF EXISTS "round_holes_insert_via_round" ON round_holes;
DROP POLICY IF EXISTS "round_holes_update_via_round" ON round_holes;

CREATE POLICY "round_holes_insert_self_player"
  ON round_holes FOR INSERT TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM round_players rp
      WHERE rp.round_id = round_holes.round_id
        AND rp.user_id = auth.uid()
        AND rp.status IN ('joined','finished')
    )
  );

CREATE POLICY "round_holes_update_self_player"
  ON round_holes FOR UPDATE TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());
```

(Verify the existing policy names with `\dp round_holes` before applying. Adjust DROP names accordingly.)

- [ ] **Step 5: Apply**

```bash
npx supabase db push
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260509000004_phase7_rls_group_rounds.sql
git commit -m "Phase 7 task 2: RLS for round_players + group-round visibility helpers"
```

---

## Task 3: Server RPCs (redeem_join_code + force_end_round)

**Files:**
- Create: `supabase/migrations/20260509000005_phase7_rpcs.sql`

- [ ] **Step 1: redeem_join_code**

```sql
-- 20260509000005_phase7_rpcs.sql

CREATE OR REPLACE FUNCTION redeem_join_code(p_code TEXT, p_tee_box TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_round_id UUID;
  v_host_id UUID;
  v_viewer UUID := auth.uid();
BEGIN
  IF v_viewer IS NULL THEN
    RAISE EXCEPTION 'must be authenticated';
  END IF;

  SELECT id, user_id INTO v_round_id, v_host_id FROM rounds WHERE join_code = p_code AND is_group = true;
  IF v_round_id IS NULL THEN
    RAISE EXCEPTION 'invalid join code';
  END IF;

  IF is_blocked(v_host_id, v_viewer) THEN
    RAISE EXCEPTION 'cannot join this round';
  END IF;

  -- Idempotent: if already in round, just return id
  IF EXISTS (SELECT 1 FROM round_players WHERE round_id = v_round_id AND user_id = v_viewer) THEN
    UPDATE round_players SET status = 'joined', joined_at = COALESCE(joined_at, now()), tee_box = p_tee_box
    WHERE round_id = v_round_id AND user_id = v_viewer AND status IN ('invited','withdrawn');
    RETURN v_round_id;
  END IF;

  INSERT INTO round_players(round_id, user_id, tee_box, status, joined_at)
  VALUES (v_round_id, v_viewer, p_tee_box, 'joined', now());

  RETURN v_round_id;
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_join_code(TEXT, TEXT) TO authenticated;
```

- [ ] **Step 2: force_end_round**

```sql
CREATE OR REPLACE FUNCTION force_end_round(p_round_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_host_id UUID;
BEGIN
  SELECT user_id INTO v_host_id FROM rounds WHERE id = p_round_id;
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'round not found';
  END IF;
  IF v_host_id <> auth.uid() THEN
    RAISE EXCEPTION 'only host can force-end';
  END IF;

  UPDATE round_players
  SET status = 'finished', finished_at = COALESCE(finished_at, now())
  WHERE round_id = p_round_id AND status = 'joined';
END;
$$;

GRANT EXECUTE ON FUNCTION force_end_round(UUID) TO authenticated;
```

- [ ] **Step 3: generate_join_code helper (used by client when creating group round)**

```sql
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    -- avoid 0/O, 1/I confusion
    v_code := replace(replace(replace(replace(v_code, '0','2'), 'O','3'), '1','4'), 'I','5');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rounds WHERE join_code = v_code);
    v_attempts := v_attempts + 1;
    IF v_attempts > 12 THEN
      RAISE EXCEPTION 'could not generate unique code';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_join_code() TO authenticated;
```

- [ ] **Step 4: Apply + types**

```bash
npx supabase db push
npm run db:types
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260509000005_phase7_rpcs.sql lib/database.types.ts
git commit -m "Phase 7 task 3: RPCs (redeem_join_code, force_end_round, generate_join_code)"
```

---

## Task 4: Client query hooks

**Files:**
- Create: `lib/queries/groupRounds.ts`
- Create: `lib/queries/invites.ts`
- Modify: `lib/queries/rounds.ts` (extend `useUpsertHoleScore` to require `player_id`)

- [ ] **Step 1: Extend `useUpsertHoleScore` to take player_id**

In `lib/queries/rounds.ts`, the existing `useUpsertHoleScore` upserts a `Inserts<'round_holes'>` row. Now `player_id` is NOT NULL. Update callers (the score screen) to pass `player_id: session.user.id`. Update the upsert `onConflict` from `'round_id,hole_number'` to `'round_id,player_id,hole_number'`.

- [ ] **Step 2: Create `lib/queries/groupRounds.ts`**

```ts
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, type Tables, type Inserts } from '@/lib/supabase';

export type GroupRound = {
  round: Tables<'rounds'>;
  players: Tables<'round_players'>[];
  holes: Tables<'round_holes'>[];
};

export function useCreateGroupRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      hostId: string;
      course_id: string;
      tee_box: string;
      hole_count: number;
      live_visible: boolean;
      played_at: string;
    }) => {
      // Generate join_code via RPC
      const { data: code, error: codeErr } = await supabase.rpc('generate_join_code');
      if (codeErr) throw codeErr;

      // Insert round
      const { data: round, error: rErr } = await supabase
        .from('rounds')
        .insert({
          user_id: input.hostId,
          course_id: input.course_id,
          tee_box: input.tee_box,
          hole_count: input.hole_count,
          played_at: input.played_at,
          is_group: true,
          live_visible: input.live_visible,
          join_code: code,
          is_draft: true,
          total_score: 0,
          total_par: 0,
        })
        .select()
        .single();
      if (rErr) throw rErr;

      // Insert host as joined player
      const { error: pErr } = await supabase.from('round_players').insert({
        round_id: round.id,
        user_id: input.hostId,
        tee_box: input.tee_box,
        status: 'joined',
        joined_at: new Date().toISOString(),
      } as Inserts<'round_players'>);
      if (pErr) throw pErr;

      return round as Tables<'rounds'>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export function useGroupRound(roundId: string | undefined) {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['groupRound', roundId],
    queryFn: async (): Promise<GroupRound | null> => {
      if (!roundId) return null;
      const [roundRes, playersRes, holesRes] = await Promise.all([
        supabase.from('rounds').select('*').eq('id', roundId).single(),
        supabase.from('round_players').select('*').eq('round_id', roundId),
        supabase.from('round_holes').select('*').eq('round_id', roundId),
      ]);
      if (roundRes.error) throw roundRes.error;
      if (playersRes.error) throw playersRes.error;
      if (holesRes.error) throw holesRes.error;
      return {
        round: roundRes.data as Tables<'rounds'>,
        players: (playersRes.data ?? []) as Tables<'round_players'>[],
        holes: (holesRes.data ?? []) as Tables<'round_holes'>[],
      };
    },
    enabled: !!roundId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!roundId) return;
    const channel = supabase
      .channel(`round:${roundId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_players', filter: `round_id=eq.${roundId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['groupRound', roundId] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'round_holes', filter: `round_id=eq.${roundId}` },
        () => {
          void qc.invalidateQueries({ queryKey: ['groupRound', roundId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roundId, qc]);

  return q;
}

export function useInviteToRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string; teeBox: string; invitedBy: string }) => {
      const { error } = await supabase.from('round_players').insert({
        round_id: input.roundId,
        user_id: input.userId,
        tee_box: input.teeBox,
        status: 'invited',
        invited_by: input.invitedBy,
      } as Inserts<'round_players'>);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}

export function useJoinViaCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { code: string; teeBox: string }) => {
      const { data, error } = await supabase.rpc('redeem_join_code', {
        p_code: input.code,
        p_tee_box: input.teeBox,
      });
      if (error) throw error;
      return data as string; // round_id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .update({ status: 'joined', joined_at: new Date().toISOString() })
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
      void qc.invalidateQueries({ queryKey: ['pendingInvites'] });
    },
  });
}

export function useDeclineInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .delete()
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId)
        .eq('status', 'invited');
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pendingInvites'] });
    },
  });
}

export function useWithdrawFromRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .update({ status: 'withdrawn' })
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}

export function useFinishMySlice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string; userId: string }) => {
      const { error } = await supabase
        .from('round_players')
        .update({ status: 'finished', finished_at: new Date().toISOString() })
        .eq('round_id', input.roundId)
        .eq('user_id', input.userId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}

export function useForceEndRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string }) => {
      const { error } = await supabase.rpc('force_end_round', { p_round_id: input.roundId });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}

export function useStartGroupRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roundId: string }) => {
      const { error } = await supabase
        .from('rounds')
        .update({ invites_locked_at: new Date().toISOString(), is_draft: false })
        .eq('id', input.roundId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ['groupRound', vars.roundId] });
    },
  });
}
```

- [ ] **Step 3: Create `lib/queries/invites.ts`**

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase, type Tables } from '@/lib/supabase';

export type PendingInvite = Tables<'round_players'> & {
  rounds: Pick<Tables<'rounds'>, 'id' | 'played_at' | 'course_id' | 'user_id'> & {
    courses: { name: string } | null;
  };
  inviter: { display_name: string | null; username: string | null } | null;
};

export function usePendingInvites(userId: string | undefined) {
  return useQuery({
    queryKey: ['pendingInvites', userId],
    queryFn: async (): Promise<PendingInvite[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('round_players')
        .select(
          `*,
           rounds!inner(id, played_at, course_id, user_id, courses(name)),
           inviter:profiles!round_players_invited_by_fkey(display_name, username)`,
        )
        .eq('user_id', userId)
        .eq('status', 'invited');
      if (error) throw error;
      return (data ?? []) as PendingInvite[];
    },
    enabled: !!userId,
    refetchInterval: 30_000,
  });
}

export function usePendingInvitesCount(userId: string | undefined) {
  const q = usePendingInvites(userId);
  return q.data?.length ?? 0;
}
```

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add lib/queries/groupRounds.ts lib/queries/invites.ts lib/queries/rounds.ts
git commit -m "Phase 7 task 4: client hooks for group rounds + invites"
```

---

## Task 5: Update existing solo round flow to write player_id

**Files:**
- Modify: `app/(app)/round/new/score.tsx` (pass `player_id` in upsert)
- Modify: `app/(app)/round/new/setup.tsx` (after creating draft round, also insert round_players row for the host with status='joined')
- Modify: `lib/queries/rounds.ts` (`useCreateDraftRound` should auto-create the host's round_players row)

- [ ] **Step 1: Auto-create round_players for solo rounds**

Update `useCreateDraftRound` in `lib/queries/rounds.ts`:

```ts
export function useCreateDraftRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Inserts<'rounds'>) => {
      const { data, error } = await supabase
        .from('rounds')
        .insert({ ...input, is_draft: true })
        .select()
        .single();
      if (error) throw error;
      // Auto-insert host's round_players row so all scoring goes through the same join table
      const { error: pErr } = await supabase.from('round_players').insert({
        round_id: data.id,
        user_id: data.user_id,
        tee_box: data.tee_box ?? 'default',
        status: 'joined',
        joined_at: new Date().toISOString(),
      } as Inserts<'round_players'>);
      if (pErr) throw pErr;
      return data as Tables<'rounds'>;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['rounds'] });
    },
  });
}
```

- [ ] **Step 2: Pass player_id in upsert**

In `app/(app)/round/new/score.tsx`, find the call to `upsert.mutate({ round_id, hole_number, score, par, ... })`. Add `player_id: session.user.id`. Also extend `useUpsertHoleScore` mutation input type if it doesn't already accept it.

In `lib/queries/rounds.ts`, change the mutation `onConflict: 'round_id,hole_number'` → `onConflict: 'round_id,player_id,hole_number'`.

- [ ] **Step 3: Smoke test on phone**

Score a fresh solo round end-to-end. Save it. Open the round detail. Edit it. All should work as before. (User does this manually after task ships.)

- [ ] **Step 4: Type check + commit**

```bash
npx tsc --noEmit
git add app/\(app\)/round/new/score.tsx lib/queries/rounds.ts
git commit -m "Phase 7 task 5: solo rounds write through round_players + player_id"
```

---

## Task 6: Solo / Group entry sheet on Play button

**Files:**
- Modify: `components/TabBar.tsx` (Play button)
- Create: `components/PlayModeSheet.tsx`

- [ ] **Step 1: Create PlayModeSheet**

```tsx
// components/PlayModeSheet.tsx
import { Modal, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { palette, fontFamily } from '@/theme/linksman';

type Props = { visible: boolean; onClose: () => void };

export function PlayModeSheet({ visible, onClose }: Props) {
  const go = (path: string) => {
    onClose();
    router.push(path);
  };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: palette.ink + 'CC' }} />
      <View style={{ backgroundColor: palette.bone, padding: 24, paddingBottom: 48 }}>
        <Text
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 9,
            letterSpacing: 9 * 0.2,
            color: palette.ink,
            opacity: 0.5,
            textTransform: 'uppercase',
          }}
        >
          NEW ROUND
        </Text>
        <Pressable
          onPress={() => go('/round/new/course')}
          style={{
            marginTop: 16,
            paddingVertical: 18,
            borderTopWidth: 0.5,
            borderBottomWidth: 0.5,
            borderColor: palette.ink + '33',
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
            Solo round
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 4,
            }}
          >
            Just you and the course.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => go('/round/new/group-setup')}
          style={{
            paddingVertical: 18,
            borderBottomWidth: 0.5,
            borderColor: palette.ink + '33',
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
            Group round
          </Text>
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: palette.ink,
              opacity: 0.55,
              marginTop: 4,
            }}
          >
            Score live with friends.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => go('/join-round')}
          style={{ paddingVertical: 18 }}
        >
          <Text
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              letterSpacing: 12 * 0.16,
              color: palette.fairway,
              textTransform: 'uppercase',
            }}
          >
            HAVE A JOIN CODE? →
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Wire into TabBar**

In `components/TabBar.tsx`, change `PlayButton` so tapping opens the sheet instead of navigating directly:

```tsx
function PlayButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ /* existing brass style */ }}
      >
        <Svg ...>{/* existing icon */}</Svg>
      </Pressable>
      <PlayModeSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

Add `useState` to the imports and `PlayModeSheet` import.

- [ ] **Step 3: Commit**

```bash
git add components/TabBar.tsx components/PlayModeSheet.tsx
git commit -m "Phase 7 task 6: Solo/Group entry sheet on Play button"
```

---

## Task 7: Group round setup screen

**Files:**
- Create: `app/(app)/round/new/group-setup.tsx`

This screen is simpler than solo setup — it picks course, tee, live-visible toggle, then creates the round and routes to the lobby.

- [ ] **Step 1: Create the screen**

```tsx
// app/(app)/round/new/group-setup.tsx
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { useCreateGroupRound } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

type Step = 'course' | 'config';

export default function GroupSetup() {
  const { session } = useSession();
  const [step, setStep] = useState<Step>('course');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [teeBox, setTeeBox] = useState('white');
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  const [liveVisible, setLiveVisible] = useState(false);
  const create = useCreateGroupRound();

  // Step "course" reuses the existing /round/new/course flow with a callback param
  // For simplicity, push to course picker with mode=groupRoundSelect; on selection,
  // course picker calls router.replace back here with ?courseId=...

  // Implementer should adapt course.tsx to support mode=groupRoundSelect:
  //   when set, the picker calls router.replace({ pathname: '/round/new/group-setup', params: { courseId } })
  //   instead of routing to setup.

  if (step === 'course' && !courseId) {
    router.replace('/round/new/course?mode=groupRoundSelect');
    return null;
  }

  const onCreate = async () => {
    if (!session?.user.id || !courseId) return;
    const round = await create.mutateAsync({
      hostId: session.user.id,
      course_id: courseId,
      tee_box: teeBox,
      hole_count: holeCount,
      live_visible: liveVisible,
      played_at: new Date().toISOString().slice(0, 10),
    });
    router.replace({ pathname: '/round/group/[id]/lobby', params: { id: round.id } });
  };

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: 8, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: palette.ink, opacity: 0.6, textTransform: 'uppercase' }}>
              CANCEL
            </Text>
          </Pressable>
        </View>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginTop: 16 }}>
          Group round
        </Text>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 8 }}>
          Course selected. Tee, length, and visibility next.
        </Text>

        {/* Tee box picker */}
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginTop: 32 }}>
          YOUR TEE
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {(['black','blue','white','gold','red'] as const).map((t) => {
            const active = t === teeBox;
            return (
              <Pressable key={t} onPress={() => setTeeBox(t)} style={{
                paddingVertical: 10, paddingHorizontal: 14,
                borderWidth: 0.5, borderColor: active ? palette.fairway : palette.ink + '33',
                backgroundColor: active ? palette.fairway + '11' : 'transparent',
              }}>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: active ? palette.fairway : palette.ink, textTransform: 'uppercase' }}>
                  {t}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Hole count */}
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginTop: 24 }}>
          LENGTH
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {[9, 18].map((hc) => {
            const active = holeCount === hc;
            return (
              <Pressable key={hc} onPress={() => setHoleCount(hc as 9 | 18)} style={{
                paddingVertical: 10, paddingHorizontal: 18,
                borderWidth: 0.5, borderColor: active ? palette.fairway : palette.ink + '33',
                backgroundColor: active ? palette.fairway + '11' : 'transparent',
              }}>
                <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, color: active ? palette.fairway : palette.ink }}>
                  {hc} HOLES
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Live visible toggle */}
        <View style={{ marginTop: 32, paddingVertical: 14, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: palette.ink + '33', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
              Live to friends
            </Text>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 4 }}>
              Friends of any player see the round on their feed during play. Off = round appears only when finished.
            </Text>
          </View>
          <Switch value={liveVisible} onValueChange={setLiveVisible} />
        </View>

        <Pressable
          onPress={onCreate}
          disabled={create.isPending}
          style={{ marginTop: 32, backgroundColor: palette.brass, paddingVertical: 16, alignItems: 'center', opacity: create.isPending ? 0.5 : 1 }}
        >
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, letterSpacing: 13 * 0.18, color: palette.ink, textTransform: 'uppercase' }}>
            CREATE ROUND →
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Wire `mode=groupRoundSelect` in course picker**

In `app/(app)/round/new/course.tsx`, in the `goToCourse` function, add another mode branch:

```ts
if (params.mode === 'groupRoundSelect') {
  router.replace({ pathname: '/round/new/group-setup', params: { courseId } });
  return;
}
```

The group-setup screen reads `useLocalSearchParams<{ courseId?: string }>()` and uses that as the locked-in courseId. Update the screen accordingly: instead of branching to `/round/new/course?mode=groupRoundSelect` if `!courseId`, read it from params on mount.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/round/new/group-setup.tsx app/\(app\)/round/new/course.tsx
git commit -m "Phase 7 task 7: group round setup screen"
```

---

## Task 8: Lobby + invite flow

**Files:**
- Create: `app/(app)/round/group/[id]/lobby.tsx`
- Create: `app/(app)/round/group/[id]/_layout.tsx` (Stack)
- Create: `components/InviteSearchSheet.tsx`
- Create: `components/PlayerTile.tsx`

- [ ] **Step 1: Stack layout**

```tsx
// app/(app)/round/group/[id]/_layout.tsx
import { Stack } from 'expo-router';
export default function GroupRoundLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: PlayerTile component**

```tsx
// components/PlayerTile.tsx
import { Text, View } from 'react-native';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  displayName: string;
  username: string | null;
  status: 'invited' | 'joined' | 'withdrawn' | 'finished';
  scoreLabel?: string; // e.g. "+2 thru 7"
  isHost?: boolean;
  isMe?: boolean;
};

const STATUS_LABEL: Record<Props['status'], string> = {
  invited: 'INVITED',
  joined: 'PLAYING',
  withdrawn: 'WITHDREW',
  finished: 'FINISHED',
};

export function PlayerTile({ displayName, username, status, scoreLabel, isHost, isMe }: Props) {
  const muted = status === 'invited' || status === 'withdrawn';
  return (
    <View style={{
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 0.5,
      borderColor: palette.ink + '33',
      opacity: muted ? 0.55 : 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }} numberOfLines={1}>
          {displayName}{isMe ? ' (you)' : ''}{isHost ? ' · host' : ''}
        </Text>
        {username ? (
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 10, color: palette.ink, opacity: 0.55, marginTop: 2 }}>
            @{username}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.6, textTransform: 'uppercase' }}>
          {STATUS_LABEL[status]}
        </Text>
        {scoreLabel ? (
          <Text style={{ fontFamily: fontFamily.display, fontSize: 16, color: palette.ink, marginTop: 2 }}>
            {scoreLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
```

- [ ] **Step 3: InviteSearchSheet component**

```tsx
// components/InviteSearchSheet.tsx
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useUserSearch } from '@/lib/queries/users';
import { useMutuals } from '@/lib/queries/follows';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
  myUserId: string | undefined;
  excludeIds: string[];
};

export function InviteSearchSheet({ visible, onClose, onPick, myUserId, excludeIds }: Props) {
  const [query, setQuery] = useState('');
  const mutualsQ = useMutuals(myUserId);
  const searchQ = useUserSearch(query);

  const candidates = query.length >= 2
    ? (searchQ.data ?? []).filter((u) => !excludeIds.includes(u.id))
    : (mutualsQ.data ?? []).filter((u) => !excludeIds.includes(u.id));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: palette.ink + 'CC' }} />
      <View style={{ backgroundColor: palette.bone, padding: 24, paddingBottom: 48, maxHeight: '70%' }}>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.5, textTransform: 'uppercase' }}>
          INVITE A MUTUAL
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by username..."
          placeholderTextColor={palette.ink + '66'}
          autoCapitalize="none"
          style={{
            fontFamily: fontFamily.editorial,
            fontSize: 18,
            color: palette.ink,
            paddingVertical: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: palette.ink + '33',
            marginTop: 12,
          }}
        />
        <ScrollView style={{ marginTop: 12 }}>
          {candidates.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => {
                onPick(u.id);
                onClose();
              }}
              style={{ paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: palette.ink + '20' }}
            >
              <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
                {u.display_name}
              </Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.6, marginTop: 2 }}>
                @{u.username}
              </Text>
            </Pressable>
          ))}
          {candidates.length === 0 ? (
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 16 }}>
              {query.length >= 2 ? 'No matches.' : 'Type at least 2 characters or wait for your mutuals to load.'}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
```

If `useUserSearch` doesn't already exist in `lib/queries/users.ts`, add a thin wrapper that does `select id, display_name, username from profiles where username ilike '%query%' limit 20`.

- [ ] **Step 4: Lobby screen**

```tsx
// app/(app)/round/group/[id]/lobby.tsx
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { PlayerTile } from '@/components/PlayerTile';
import { InviteSearchSheet } from '@/components/InviteSearchSheet';
import { useGroupRound, useInviteToRound, useStartGroupRound, useWithdrawFromRound } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function Lobby() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const groupQ = useGroupRound(id);
  const invite = useInviteToRound();
  const start = useStartGroupRound();
  const withdraw = useWithdrawFromRound();
  const [inviteOpen, setInviteOpen] = useState(false);

  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const isHost = round?.user_id === session?.user.id;
  const me = players.find((p) => p.user_id === session?.user.id);
  const joinedCount = players.filter((p) => p.status === 'joined').length;

  // If round has started, route to score
  if (round?.invites_locked_at) {
    router.replace({ pathname: '/round/group/[id]/score', params: { id: round.id, hole: '1' } });
    return null;
  }

  const onCopyCode = async () => {
    if (!round?.join_code) return;
    await Clipboard.setStringAsync(round.join_code);
    Alert.alert('Copied', `Code ${round.join_code} copied to clipboard.`);
  };

  const onStart = async () => {
    if (!round) return;
    await start.mutateAsync({ roundId: round.id });
  };

  const onLeave = async () => {
    if (!round || !session?.user.id) return;
    Alert.alert(isHost ? 'Cancel round?' : 'Leave round?', isHost ? 'This deletes the round for everyone.' : 'You can rejoin via the code.', [
      { text: 'Stay', style: 'cancel' as const },
      {
        text: isHost ? 'Cancel round' : 'Leave',
        style: 'destructive' as const,
        onPress: async () => {
          if (isHost) {
            await supabase.from('rounds').delete().eq('id', round.id);
          } else {
            await withdraw.mutateAsync({ roundId: round.id, userId: session.user.id });
          }
          router.replace('/(app)/(tabs)');
        },
      },
    ]);
  };

  if (!round) return null;

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ paddingTop: 8, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={onLeave} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: palette.clay, opacity: 0.8, textTransform: 'uppercase' }}>
              {isHost ? 'CANCEL' : 'LEAVE'}
            </Text>
          </Pressable>
        </View>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.5, textTransform: 'uppercase', marginTop: 16 }}>
          LOBBY
        </Text>
        <Text style={{ fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginTop: 4 }}>
          Waiting for players
        </Text>

        {/* Join code card */}
        <Pressable onPress={onCopyCode} style={{ marginTop: 24, paddingVertical: 18, paddingHorizontal: 16, borderWidth: 0.5, borderColor: palette.ink + '33' }}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase' }}>
            JOIN CODE · TAP TO COPY
          </Text>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 32, color: palette.ink, letterSpacing: 4, marginTop: 4 }}>
            {round.join_code}
          </Text>
        </Pressable>

        {/* Players */}
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginTop: 32, marginBottom: 8 }}>
          PLAYERS
        </Text>
        {players.map((p) => (
          <View key={p.user_id} style={{ marginBottom: 8 }}>
            <PlayerTile
              displayName={p.user_id /* TODO: hydrate display_name via join — see Task 9 */}
              username={null}
              status={p.status as 'invited' | 'joined' | 'withdrawn' | 'finished'}
              isHost={p.user_id === round.user_id}
              isMe={p.user_id === session?.user.id}
            />
          </View>
        ))}

        {isHost ? (
          <>
            <Pressable
              onPress={() => setInviteOpen(true)}
              style={{ marginTop: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 0.5, borderColor: palette.ink + '33', borderStyle: 'dashed' }}
            >
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 12 * 0.16, color: palette.fairway, textTransform: 'uppercase' }}>
                + INVITE A MUTUAL
              </Text>
            </Pressable>

            <Pressable
              onPress={onStart}
              disabled={joinedCount < 1 || start.isPending}
              style={{ marginTop: 32, backgroundColor: palette.brass, paddingVertical: 16, alignItems: 'center', opacity: start.isPending ? 0.5 : 1 }}
            >
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, letterSpacing: 13 * 0.18, color: palette.ink, textTransform: 'uppercase' }}>
                START ROUND →
              </Text>
            </Pressable>
          </>
        ) : (
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 32, textAlign: 'center' }}>
            Waiting for the host to start...
          </Text>
        )}
      </ScrollView>

      <InviteSearchSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        myUserId={session?.user.id}
        excludeIds={players.map((p) => p.user_id)}
        onPick={(userId) =>
          invite.mutate({
            roundId: round.id,
            userId,
            teeBox: round.tee_box,
            invitedBy: session!.user.id,
          })
        }
      />
    </ScreenContainer>
  );
}
```

The TODO marker on PlayerTile's `displayName={p.user_id}` is a deliberate placeholder — Task 9 hydrates names. For this task, leaving the user_id is fine; the lobby is functional, just not pretty.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/round/group lib/queries components/PlayerTile.tsx components/InviteSearchSheet.tsx
git commit -m "Phase 7 task 8: lobby + invite flow"
```

---

## Task 9: Hydrate player names + per-round-player profile join

**Files:**
- Modify: `lib/queries/groupRounds.ts` (extend `useGroupRound` to join profiles)

- [ ] **Step 1: Extend the query**

Replace the players fetch in `useGroupRound` queryFn with:

```ts
supabase
  .from('round_players')
  .select('*, profile:profiles!round_players_user_id_fkey(id, display_name, username, avatar_url)')
  .eq('round_id', roundId)
```

Update the type:

```ts
export type GroupRoundPlayer = Tables<'round_players'> & {
  profile: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null;
};

export type GroupRound = {
  round: Tables<'rounds'>;
  players: GroupRoundPlayer[];
  holes: Tables<'round_holes'>[];
};
```

- [ ] **Step 2: Wire profile name into PlayerTile usage**

In `lobby.tsx`, change:

```tsx
displayName={p.profile?.display_name ?? '—'}
username={p.profile?.username ?? null}
```

(Same pattern when used in score and round detail screens later.)

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add lib/queries/groupRounds.ts app/\(app\)/round/group/\[id\]/lobby.tsx
git commit -m "Phase 7 task 9: hydrate player names via profile join"
```

---

## Task 10: Group score screen

**Files:**
- Create: `app/(app)/round/group/[id]/score.tsx`
- Create: `components/PlayerProgressStrip.tsx`

This is the heaviest UI task. Reuse most of the existing `app/(app)/round/new/score.tsx` layout, but:
- Read round data via `useGroupRound`, not the solo `roundQ`.
- Filter `holes` by `player_id === session.user.id` for the local user's score state.
- Add a `<PlayerProgressStrip players={players} holes={holes} currentHole={hole} />` at the top.
- Replace "Finish round" with "FINISH MY SLICE" → `useFinishMySlice`.
- Add an overflow menu with "End round for everyone" (host only) → `useForceEndRound` and "Leave round" → `useWithdrawFromRound`.

- [ ] **Step 1: PlayerProgressStrip**

```tsx
// components/PlayerProgressStrip.tsx
import { ScrollView, Text, View } from 'react-native';
import type { GroupRoundPlayer } from '@/lib/queries/groupRounds';
import type { Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

type Props = {
  players: GroupRoundPlayer[];
  holes: Tables<'round_holes'>[];
  meId: string | undefined;
};

export function PlayerProgressStrip({ players, holes, meId }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {players
        .filter((p) => p.status === 'joined' || p.status === 'finished')
        .map((p) => {
          const myHoles = holes.filter((h) => h.player_id === p.user_id);
          const thru = myHoles.length;
          const totalScore = myHoles.reduce((s, h) => s + h.score, 0);
          const totalPar = myHoles.reduce((s, h) => s + h.par, 0);
          const diff = totalScore - totalPar;
          const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
          const isMe = p.user_id === meId;
          return (
            <View
              key={p.user_id}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderWidth: 0.5,
                borderColor: isMe ? palette.brass : palette.bone + '33',
                backgroundColor: isMe ? palette.brass + '14' : 'transparent',
                minWidth: 92,
              }}
            >
              <Text
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 9,
                  letterSpacing: 9 * 0.16,
                  color: palette.bone,
                  opacity: 0.7,
                  textTransform: 'uppercase',
                }}
                numberOfLines={1}
              >
                {p.profile?.display_name?.split(' ')[0] ?? '—'}
                {p.status === 'finished' ? ' ✓' : ''}
              </Text>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 16, color: palette.bone, marginTop: 2 }}>
                {diffLabel} · thru {thru}
              </Text>
            </View>
          );
        })}
    </ScrollView>
  );
}
```

- [ ] **Step 2: Group score screen**

```tsx
// app/(app)/round/group/[id]/score.tsx
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ScoreNumeral } from '@/components/ScoreNumeral';
import { Topo } from '@/components/Topo';
import { PlayerProgressStrip } from '@/components/PlayerProgressStrip';
import { NotesField } from '@/components/NotesField';
import {
  useGroupRound,
  useFinishMySlice,
  useForceEndRound,
  useWithdrawFromRound,
} from '@/lib/queries/groupRounds';
import { useUpsertHoleScore } from '@/lib/queries/rounds';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';
import { palette, fontFamily } from '@/theme/linksman';

export default function GroupScore() {
  const { id, hole: holeParam } = useLocalSearchParams<{ id: string; hole: string }>();
  const hole = parseInt(holeParam ?? '1', 10);
  const { session } = useSession();
  const meId = session?.user.id;

  const groupQ = useGroupRound(id);
  const upsert = useUpsertHoleScore();
  const finishMine = useFinishMySlice();
  const forceEnd = useForceEndRound();
  const withdraw = useWithdrawFromRound();

  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const holes = groupQ.data?.holes ?? [];
  const me = players.find((p) => p.user_id === meId);
  const isHost = round?.user_id === meId;
  const totalHoles = round?.hole_count ?? 18;

  // Course holes for par lookup, scoped to my tee
  const [courseHoles, setCourseHoles] = useState<Tables<'course_holes'>[]>([]);
  useEffect(() => {
    if (!round?.course_id || !me?.tee_box) return;
    void supabase
      .from('course_holes')
      .select('*')
      .eq('course_id', round.course_id)
      .eq('tee_box', me.tee_box)
      .then(({ data }) => setCourseHoles((data ?? []) as Tables<'course_holes'>[]));
  }, [round?.course_id, me?.tee_box]);

  const myHoles = useMemo(() => holes.filter((h) => h.player_id === meId), [holes, meId]);
  const courseHole = courseHoles.find((h) => h.hole_number === hole);
  const existing = myHoles.find((h) => h.hole_number === hole);
  const par = courseHole?.par ?? existing?.par ?? 4;

  const [score, setScore] = useState(par);
  useEffect(() => {
    setScore(existing?.score ?? par);
  }, [hole, existing?.score, par]);

  // Debounced autosave
  useEffect(() => {
    if (!id || !meId) return;
    const t = setTimeout(() => {
      upsert.mutate({
        round_id: id,
        player_id: meId,
        hole_number: hole,
        score,
        par,
        putts: null,
        fairway_hit: null,
        gir: null,
      } as never);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, hole, par]);

  const onAdvance = () => {
    if (hole >= totalHoles) {
      onFinishMine();
    } else {
      router.setParams({ hole: String(hole + 1) });
    }
  };

  const onFinishMine = async () => {
    if (!id || !meId) return;
    Alert.alert('Finish your round?', 'You can still see the round, but you won’t be able to add more scores.', [
      { text: 'Keep playing', style: 'cancel' as const },
      {
        text: 'Finish',
        onPress: async () => {
          await finishMine.mutateAsync({ roundId: id, userId: meId });
          router.replace({ pathname: '/round/[id]', params: { id } });
        },
      },
    ]);
  };

  const onMore = () => {
    if (!id || !meId) return;
    const buttons: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          await withdraw.mutateAsync({ roundId: id, userId: meId });
          router.replace('/(app)/(tabs)');
        },
      },
    ];
    if (isHost) {
      buttons.splice(1, 0, {
        text: 'End round for everyone',
        style: 'destructive',
        onPress: async () => {
          await forceEnd.mutateAsync({ roundId: id });
          router.replace({ pathname: '/round/[id]', params: { id } });
        },
      });
    }
    Alert.alert('Round options', undefined, buttons);
  };

  if (!round || !me) return null;

  const padded = String(hole).padStart(2, '0');
  const totalPadded = String(totalHoles).padStart(2, '0');

  return (
    <ScreenContainer>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.18 }}>
        <Topo seed={`${id}-h${hole}`} width={400} height={900} stroke={palette.bone + '22'} />
      </View>
      <View style={{ flex: 1, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Pressable onPress={onMore} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone, opacity: 0.7 }}>
              ⋯
            </Text>
          </Pressable>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.bone }}>
            {padded}/{totalPadded}
          </Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <PlayerProgressStrip players={players} holes={holes} meId={meId} />
        </View>

        <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.bone, opacity: 0.7, marginTop: 24, textTransform: 'uppercase' }}>
          HOLE {padded} · PAR {par}
        </Text>

        <View style={{ alignItems: 'center', marginTop: 32, flexDirection: 'row', justifyContent: 'center', gap: 32 }}>
          <Pressable onPress={() => setScore((s) => Math.max(1, s - 1))} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 0.5, borderColor: palette.bone + '40', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>−</Text>
          </Pressable>
          <ScoreNumeral value={score} size={120} color={palette.bone} />
          <Pressable onPress={() => setScore((s) => Math.min(20, s + 1))} style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 0.5, borderColor: palette.bone + '40', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 24, color: palette.bone }}>+</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 32, borderTopWidth: 0.5, borderTopColor: palette.bone + '22' }}>
          <NotesField
            value={me.notes ?? ''}
            onChange={(t) => {
              void supabase.from('round_players').update({ notes: t || null }).eq('round_id', id).eq('user_id', meId);
            }}
            surface="ink"
          />
        </View>

        <Pressable
          onPress={onAdvance}
          style={{ marginTop: 32, backgroundColor: palette.brass, paddingVertical: 16, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, letterSpacing: 13 * 0.18, color: palette.ink, textTransform: 'uppercase' }}>
            {hole >= totalHoles ? 'FINISH MY SLICE →' : `HOLE ${hole + 1} →`}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add app/\(app\)/round/group/\[id\]/score.tsx components/PlayerProgressStrip.tsx
git commit -m "Phase 7 task 10: group score screen with realtime progress strip"
```

---

## Task 11: Pending invites + join code surfaces

**Files:**
- Create: `app/(app)/invites.tsx`
- Create: `app/(app)/join-round.tsx`
- Modify: `app/(app)/(tabs)/profile.tsx` or `discover.tsx` (add bell icon + dot indicator)

- [ ] **Step 1: Pending invites screen**

```tsx
// app/(app)/invites.tsx
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { usePendingInvites } from '@/lib/queries/invites';
import { useAcceptInvite, useDeclineInvite } from '@/lib/queries/groupRounds';
import { useSession } from '@/lib/hooks/useSession';
import { palette, fontFamily } from '@/theme/linksman';

export default function Invites() {
  const { session } = useSession();
  const myId = session?.user.id;
  const q = usePendingInvites(myId);
  const accept = useAcceptInvite();
  const decline = useDeclineInvite();
  const invites = q.data ?? [];

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={{ paddingTop: 8, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Wordmark size={20} color={palette.ink} />
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: palette.ink, opacity: 0.6, textTransform: 'uppercase' }}>
              BACK
            </Text>
          </Pressable>
        </View>

        <Text style={{ fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginTop: 16 }}>
          Round invites
        </Text>

        {invites.length === 0 ? (
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 24 }}>
            No pending invites.
          </Text>
        ) : (
          invites.map((inv) => (
            <View key={inv.round_id} style={{ marginTop: 16, paddingVertical: 16, borderTopWidth: 0.5, borderColor: palette.ink + '33' }}>
              <Text style={{ fontFamily: fontFamily.display, fontSize: 18, color: palette.ink }}>
                {inv.inviter?.display_name ?? '—'} invited you
              </Text>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.6, marginTop: 4 }}>
                {inv.rounds.courses?.name ?? 'Course'} · {inv.rounds.played_at}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
                <Pressable
                  onPress={async () => {
                    if (!myId) return;
                    await accept.mutateAsync({ roundId: inv.round_id, userId: myId });
                    router.push({ pathname: '/round/group/[id]/lobby', params: { id: inv.round_id } });
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 18, backgroundColor: palette.fairway }}
                >
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 12 * 0.16, color: palette.bone, textTransform: 'uppercase' }}>
                    ACCEPT
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!myId) return;
                    await decline.mutateAsync({ roundId: inv.round_id, userId: myId });
                  }}
                  style={{ paddingVertical: 10, paddingHorizontal: 18, borderWidth: 0.5, borderColor: palette.ink + '33' }}
                >
                  <Text style={{ fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 12 * 0.16, color: palette.ink, textTransform: 'uppercase' }}>
                    DECLINE
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Join code screen**

```tsx
// app/(app)/join-round.tsx
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { ScreenContainer } from '@/components/ScreenContainer';
import { Wordmark } from '@/components/Wordmark';
import { useJoinViaCode } from '@/lib/queries/groupRounds';
import { palette, fontFamily } from '@/theme/linksman';

export default function JoinRound() {
  const [code, setCode] = useState('');
  const [tee, setTee] = useState('white');
  const join = useJoinViaCode();

  const onJoin = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid code', 'Codes are 6 characters.');
      return;
    }
    try {
      const roundId = await join.mutateAsync({ code: code.toUpperCase(), teeBox: tee });
      router.replace({ pathname: '/round/group/[id]/lobby', params: { id: roundId } });
    } catch (e: unknown) {
      Alert.alert('Could not join', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <ScreenContainer surface="bone">
      <View style={{ paddingTop: 8, paddingBottom: 14, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Wordmark size={20} color={palette.ink} />
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: palette.ink, opacity: 0.6, textTransform: 'uppercase' }}>
            CANCEL
          </Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: fontFamily.display, fontSize: 36, color: palette.ink, marginTop: 16 }}>
        Join round
      </Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase().slice(0, 6))}
        placeholder="6-CHAR CODE"
        placeholderTextColor={palette.ink + '66'}
        autoCapitalize="characters"
        style={{
          fontFamily: fontFamily.display,
          fontSize: 32,
          color: palette.ink,
          letterSpacing: 4,
          paddingVertical: 16,
          marginTop: 24,
          borderBottomWidth: 0.5,
          borderBottomColor: palette.ink + '33',
        }}
      />

      <Text style={{ fontFamily: fontFamily.mono, fontSize: 9, letterSpacing: 9 * 0.2, color: palette.ink, opacity: 0.55, textTransform: 'uppercase', marginTop: 24 }}>
        YOUR TEE
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        {(['black','blue','white','gold','red'] as const).map((t) => {
          const active = t === tee;
          return (
            <Pressable key={t} onPress={() => setTee(t)} style={{
              paddingVertical: 10, paddingHorizontal: 14,
              borderWidth: 0.5, borderColor: active ? palette.fairway : palette.ink + '33',
              backgroundColor: active ? palette.fairway + '11' : 'transparent',
            }}>
              <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, letterSpacing: 11 * 0.16, color: active ? palette.fairway : palette.ink, textTransform: 'uppercase' }}>
                {t}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={onJoin}
        disabled={join.isPending || code.length !== 6}
        style={{ marginTop: 32, backgroundColor: palette.brass, paddingVertical: 16, alignItems: 'center', opacity: join.isPending || code.length !== 6 ? 0.5 : 1 }}
      >
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 13, letterSpacing: 13 * 0.18, color: palette.ink, textTransform: 'uppercase' }}>
          JOIN →
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
```

- [ ] **Step 3: Bell icon + dot on Profile tab**

In `app/(app)/(tabs)/profile.tsx`, add to the top header bar (where Wordmark is):

```tsx
import { usePendingInvitesCount } from '@/lib/queries/invites';
// inside component:
const inviteCount = usePendingInvitesCount(viewerId);
```

```tsx
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
  <Pressable onPress={() => router.push('/(app)/invites')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
    <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.7, textTransform: 'uppercase' }}>
      INVITES
    </Text>
    {inviteCount > 0 ? (
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.fairway }} />
    ) : null}
  </Pressable>
</View>
```

(Place inside the existing top row alongside Wordmark.)

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/invites.tsx app/\(app\)/join-round.tsx app/\(app\)/\(tabs\)/profile.tsx
git commit -m "Phase 7 task 11: pending invites + join-by-code surfaces"
```

---

## Task 12: Group round detail + feed card

**Files:**
- Modify: `app/(app)/round/[id].tsx` (render group rounds)
- Modify: `components/FeedRoundCard.tsx` or create `components/GroupRoundCard.tsx`
- Modify: `lib/queries/feed.ts` (ensure group rounds come through; should "just work" with the RLS update)

- [ ] **Step 1: Group round detail rendering**

In `app/(app)/round/[id].tsx`, branch on `round.is_group`:

```tsx
if (round.is_group) {
  return <GroupRoundDetail roundId={round.id} />;
}
// existing solo render
```

Create the `GroupRoundDetail` component inline or in a new file. It should:
- Use `useGroupRound(roundId)` to read realtime data
- Render each player as a slice: header tile + their HoleGrid (filtered by player_id) + their notes quote
- Comment thread + like remain at the bottom (existing components, round-level)

```tsx
function GroupRoundDetail({ roundId }: { roundId: string }) {
  const groupQ = useGroupRound(roundId);
  const round = groupQ.data?.round;
  const players = groupQ.data?.players ?? [];
  const holes = groupQ.data?.holes ?? [];

  if (!round) return null;

  return (
    <ScreenContainer surface="bone">
      <ScrollView contentContainerStyle={{ paddingBottom: 200 }}>
        {/* header */}
        <Text style={{ fontFamily: fontFamily.display, fontSize: 28, color: palette.ink, marginTop: 24 }}>
          Group round
        </Text>
        <Text style={{ fontFamily: fontFamily.mono, fontSize: 11, color: palette.ink, opacity: 0.55, marginTop: 4 }}>
          {round.played_at}
        </Text>

        {players
          .filter((p) => p.status !== 'invited')
          .map((p) => {
            const playerHoles = holes.filter((h) => h.player_id === p.user_id);
            const total = playerHoles.reduce((s, h) => s + h.score, 0);
            const totalPar = playerHoles.reduce((s, h) => s + h.par, 0);
            const diff = total - totalPar;
            const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
            return (
              <View key={p.user_id} style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 0.5, borderColor: palette.ink + '33' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={{ fontFamily: fontFamily.display, fontSize: 22, color: palette.ink }}>
                    {p.profile?.display_name ?? '—'}
                  </Text>
                  <Text style={{ fontFamily: fontFamily.display, fontSize: 24, color: palette.ink }}>
                    {p.status === 'withdrawn' ? 'WITHDREW' : `${total} · ${diffLabel}`}
                  </Text>
                </View>
                <HoleGrid holes={playerHoles} />
                {p.notes ? (
                  <Text style={{ fontFamily: fontFamily.displayItalic, fontSize: 16, color: palette.ink, marginTop: 12 }}>
                    “{p.notes}”
                  </Text>
                ) : null}
              </View>
            );
          })}

        {/* Comment thread + like (existing components, round-scoped) */}
      </ScrollView>
    </ScreenContainer>
  );
}
```

- [ ] **Step 2: Group feed card**

Create `components/GroupRoundCard.tsx` modeled after `FeedRoundCard.tsx` but rendering N player slices in a stacked layout. Existing feed component should branch:

```tsx
{round.is_group ? <GroupRoundCard round={round} /> : <FeedRoundCard round={round} />}
```

Implementer: write `GroupRoundCard` to match the visual feel of `FeedRoundCard` (Topo backdrop, course/date header, then a row per player with name + score + diff). Per-player notes quoted under their name. One heart + comment row at the bottom (round-level, reusing `LikeButton` + comment count display).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/round/\[id\].tsx components/GroupRoundCard.tsx components/FeedRoundCard.tsx
git commit -m "Phase 7 task 12: group round detail + feed card"
```

---

## Final task: phone test + tag

After all 12 tasks ship:

1. Two test accounts (mutuals): host creates group round, invites Player B, B accepts, host starts, both score live, both see each other's scores update.
2. Code path: third device with non-mutual user enters code; appears in lobby and round.
3. Live visibility off: round invisible to outside mutuals until both finish.
4. Live visibility on: outside mutuals see live card with running scores.
5. Host force-ends mid-play; both rounds finalize; one feed card.
6. Withdraw mid-round; round still completes; withdrawn slice shows WITHDREW.
7. Solo rounds (existing) still work; existing rounds still display.

Then:
```bash
git tag phase-7
git push origin main phase-7
```

Update `~/.claude/projects/-Users-gavingillespie-Desktop-Golf-App/memory/build_state.md`: mark Phase 7 shipped+tagged, set Next phase to Phase 8 (engagement: push notifications, contacts invite, streaks, photos).
