# Phase 3a — Social Graph + Discover + Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the app from a single-player tracker into a social one. Users can find each other, follow each other, see each other's profiles, and a Home feed lights up with rounds from mutual follows. Round detail becomes viewable by mutuals (read-only). No likes, no comments, no contacts, no block/report yet — those land in Phase 3b.

**Architecture:** One new table (`follows`), an RLS expansion on `rounds`/`round_holes` to honor `visibility='mutuals'`, and a small Postgres helper (`are_mutuals(a, b)`). Everything else is read-side: new query modules (`follows.ts`, `users.ts`, `feed.ts`), a Discover overhaul, an other-user profile route, an updated Home tab, and a non-owner-aware round detail screen. We keep the existing patterns: TanStack Query hooks, RLS-only authorization, NativeWind theme tokens, no new global state.

**Tech Stack additions:** none. All new behavior uses libraries already in `package.json`.

**Spec note:** The original Phase 3 in the spec bundles social graph, feed, likes, comments, block, report, and contacts invite into one phase. We split that into 3a (this plan: graph + feed) and 3b (interactions + safety) so each gets a clean phone-test gate. 3b will also pair naturally with the Phase 4 compliance work, since report/block surfaces overlap with App Store moderation requirements.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` — Phase 0/1/2 shipped and tagged `phase-2`.

---

## Mental model

```
DISCOVER TAB                              OTHER-USER PROFILE                       FEED (Home)
┌──────────────────────────────┐          ┌──────────────────────────────┐         ┌──────────────────────────────┐
│ Discover                     │          │ ← Back                       │         │ Home                         │
│ ┌────────────────────────┐   │          │  ╭──╮                        │         │ ┌─ Resume in-progress ────┐ │
│ │ 🔍 Search players or…  │   │          │  │PFP│  Display Name         │         │ │ (existing draft banner) │ │
│ └────────────────────────┘   │          │  ╰──╯  @username             │         │ └────────────────────────┘  │
│                              │          │                              │         │                              │
│ Players                      │          │  Bio • Home: Pebble Beach    │         │ ┌─ Round card ────────────┐ │
│  • @gavin    Gavin G.    ＋ │          │                              │         │ │ ╭╮ Bob Smith            │ │
│  • @bob      Bob Smith   ✓  │          │  [ Follow ]   12 rounds      │         │ │ ╰╯ @bob • 2h ago        │ │
│                              │          │              4 followers     │         │ │ Pebble Beach            │ │
│ Courses                      │          │              7 following     │         │ │ 82 (+10)  18 holes      │ │
│  • Pebble Beach              │          │                              │         │ └────────────────────────┘  │
│  • Lincoln Park              │          │  ── Mutual? ─────────────    │         │                              │
└──────────────────────────────┘          │  Recent rounds (mutual only) │         │ ┌─ Round card ────────────┐ │
                                          │   • Pebble Beach  82  today  │         │ │ ╭╮ Alice                │ │
                                          │   • Lincoln Park  79  May 1  │         │ │ ╰╯ @alice • yesterday   │ │
                                          │                              │         │ └────────────────────────┘  │
                                          │  ── Not mutual ──────────    │         └──────────────────────────────┘
                                          │  "Follow each other to see   │
                                          │   their rounds"              │
                                          └──────────────────────────────┘
```

Definitions:
- **Follow** = one-way: a row exists in `follows(follower_id=me, following_id=them)`.
- **Mutual** = both rows exist (I follow them AND they follow me back).
- **Visibility = 'mutuals'** (the default for new rounds): owner can read; mutuals can read; everyone else gets nothing.
- **Visibility = 'public'**: anyone authenticated can read. We don't expose a UI toggle for this in 3a — it's reserved for v2's "For You" feed — but the RLS policy includes it so we don't have to migrate again later.
- **Visibility = 'private'**: owner-only.

---

## File Structure (new + modified files in Phase 3a)

```
supabase/migrations/
└── 20260503000001_phase3a_follows_and_mutuals_rls.sql   # follows table + are_mutuals() + rounds/round_holes RLS expansion

lib/queries/
├── follows.ts                                            # follow/unfollow + isFollowing + isMutual + counts
├── users.ts                                              # search users + get profile by username
└── feed.ts                                               # mutual rounds feed query

components/
├── UserListItem.tsx                                      # avatar + display_name + @username + follow button
├── FollowButton.tsx                                      # 3-state button: Follow / Following / You
└── FeedRoundCard.tsx                                     # avatar + header + course + score row, tappable

app/(app)/
├── (tabs)/
│   ├── discover.tsx                                      # MODIFIED: search bar + Players + Courses sections
│   └── index.tsx                                         # MODIFIED: render feed below the resume banner
├── profile/
│   ├── _layout.tsx                                       # NEW: stack for /profile/[username]
│   └── [username].tsx                                    # NEW: other-user profile (also handles "self" case)
└── round/
    └── [id].tsx                                          # MODIFIED: read-only branch for non-owner viewers

lib/database.types.ts                                     # REGENERATED after the migration
```

---

## Task 1: Migration — `follows` table + `are_mutuals` helper + rounds/round_holes RLS

**Files:**
- Create: `supabase/migrations/20260503000001_phase3a_follows_and_mutuals_rls.sql`
- Regenerate: `lib/database.types.ts`

This is the only schema change in Phase 3a. It:
1. Creates the `follows` table with composite PK and a self-follow guard.
2. Adds `public.are_mutuals(uuid, uuid)` (`stable security definer` is intentional — see step 1.2).
3. Replaces the existing `rounds_read_own` and `round_holes_read_via_round` policies with versions that also allow mutuals + public visibility.
4. Allows reading `profiles` of anyone (already true) — no profile changes needed.

- [ ] **Step 1.1: Create the migration file**

  Create `supabase/migrations/20260503000001_phase3a_follows_and_mutuals_rls.sql` with:

  ```sql
  -- ============================================================================
  -- Phase 3a: follows table, mutuals helper, and expanded read policies on
  -- rounds + round_holes so mutuals can read each other's mutuals-visible rounds.
  -- ============================================================================

  -- ----------------------------------------------------------------------------
  -- follows
  -- ----------------------------------------------------------------------------
  CREATE TABLE follows (
    follower_id   UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    following_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
  );

  CREATE INDEX follows_following_idx ON follows(following_id);

  ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

  -- Anyone authenticated can read the graph (used to compute counts + mutuality).
  CREATE POLICY "follows_read_authenticated"
    ON follows FOR SELECT TO authenticated USING (true);

  -- You can only insert/delete rows where you are the follower.
  CREATE POLICY "follows_insert_own"
    ON follows FOR INSERT TO authenticated
    WITH CHECK (follower_id = auth.uid());

  CREATE POLICY "follows_delete_own"
    ON follows FOR DELETE TO authenticated
    USING (follower_id = auth.uid());

  -- ----------------------------------------------------------------------------
  -- are_mutuals helper
  -- ----------------------------------------------------------------------------
  -- SECURITY DEFINER so the function bypasses RLS on follows. This is safe
  -- because the function only returns a boolean and never leaks rows. We need
  -- this to call it from inside other RLS policies without infinite recursion.
  CREATE OR REPLACE FUNCTION public.are_mutuals(a UUID, b UUID)
    RETURNS BOOLEAN
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM follows WHERE follower_id = a AND following_id = b
      ) AND EXISTS (
        SELECT 1 FROM follows WHERE follower_id = b AND following_id = a
      );
    $$;

  REVOKE ALL ON FUNCTION public.are_mutuals(UUID, UUID) FROM public;
  GRANT EXECUTE ON FUNCTION public.are_mutuals(UUID, UUID) TO authenticated;

  -- ----------------------------------------------------------------------------
  -- Expand rounds read policy: owner OR public OR (mutuals + are_mutuals)
  -- ----------------------------------------------------------------------------
  DROP POLICY "rounds_read_own" ON rounds;

  CREATE POLICY "rounds_read_visible"
    ON rounds FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR (visibility = 'public'  AND is_draft = false)
      OR (visibility = 'mutuals' AND is_draft = false AND public.are_mutuals(auth.uid(), user_id))
    );

  -- ----------------------------------------------------------------------------
  -- Expand round_holes read policy to inherit from rounds
  -- ----------------------------------------------------------------------------
  DROP POLICY "round_holes_read_via_round" ON round_holes;

  CREATE POLICY "round_holes_read_via_round"
    ON round_holes FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM rounds r
        WHERE r.id = round_holes.round_id
          AND (
            r.user_id = auth.uid()
            OR (r.visibility = 'public'  AND r.is_draft = false)
            OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
          )
      )
    );
  ```

- [ ] **Step 1.2: Push the migration**

  Run:
  ```bash
  npm run db:push
  ```
  Expected: Supabase CLI applies one new migration. No errors.

- [ ] **Step 1.3: Regenerate database types**

  Run:
  ```bash
  npm run db:types
  ```
  Expected: `lib/database.types.ts` now contains a `follows` row type and an `are_mutuals` function entry under `Functions`.

- [ ] **Step 1.4: Sanity-check in the Supabase SQL editor**

  In the Supabase dashboard SQL editor, paste:
  ```sql
  -- These should ALL return true:
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'follows' AND policyname = 'follows_insert_own');
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'are_mutuals');
  SELECT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rounds' AND policyname = 'rounds_read_visible');
  SELECT public.are_mutuals(gen_random_uuid(), gen_random_uuid()); -- false (no rows)
  ```

- [ ] **Step 1.5: Commit**

  ```bash
  git add supabase/migrations/20260503000001_phase3a_follows_and_mutuals_rls.sql lib/database.types.ts
  git commit -m "feat(db): add follows table, are_mutuals helper, mutuals visibility on rounds"
  ```

---

## Task 2: Follows query module

**Files:**
- Create: `lib/queries/follows.ts`

Provides the data layer for everything follow-shaped: checking your relationship to a user, follower/following counts, and the follow/unfollow mutations.

- [ ] **Step 2.1: Create the file**

  Create `lib/queries/follows.ts`:

  ```ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

  import { supabase } from '@/lib/supabase';

  // -- Reads ------------------------------------------------------------------

  export function useIsFollowing(viewerId: string | undefined, targetId: string | undefined) {
    return useQuery({
      queryKey: ['is_following', viewerId, targetId],
      queryFn: async () => {
        if (!viewerId || !targetId || viewerId === targetId) return false;
        const { count, error } = await supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('follower_id', viewerId)
          .eq('following_id', targetId);
        if (error) throw error;
        return (count ?? 0) > 0;
      },
      enabled: !!viewerId && !!targetId && viewerId !== targetId,
    });
  }

  export function useIsMutual(viewerId: string | undefined, targetId: string | undefined) {
    return useQuery({
      queryKey: ['is_mutual', viewerId, targetId],
      queryFn: async () => {
        if (!viewerId || !targetId || viewerId === targetId) return false;
        const { data, error } = await supabase.rpc('are_mutuals', {
          a: viewerId,
          b: targetId,
        });
        if (error) throw error;
        return data as boolean;
      },
      enabled: !!viewerId && !!targetId && viewerId !== targetId,
    });
  }

  export function useFollowerCount(userId: string | undefined) {
    return useQuery({
      queryKey: ['follower_count', userId],
      queryFn: async () => {
        if (!userId) return 0;
        const { count, error } = await supabase
          .from('follows')
          .select('follower_id', { count: 'exact', head: true })
          .eq('following_id', userId);
        if (error) throw error;
        return count ?? 0;
      },
      enabled: !!userId,
    });
  }

  export function useFollowingCount(userId: string | undefined) {
    return useQuery({
      queryKey: ['following_count', userId],
      queryFn: async () => {
        if (!userId) return 0;
        const { count, error } = await supabase
          .from('follows')
          .select('following_id', { count: 'exact', head: true })
          .eq('follower_id', userId);
        if (error) throw error;
        return count ?? 0;
      },
      enabled: !!userId,
    });
  }

  // -- Mutations --------------------------------------------------------------

  export function useFollow() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { followerId: string; followingId: string }) => {
        const { error } = await supabase.from('follows').insert({
          follower_id: input.followerId,
          following_id: input.followingId,
        });
        if (error) throw error;
      },
      onSuccess: (_data, vars) => {
        qc.setQueryData(['is_following', vars.followerId, vars.followingId], true);
        qc.invalidateQueries({ queryKey: ['is_mutual', vars.followerId, vars.followingId] });
        qc.invalidateQueries({ queryKey: ['is_mutual', vars.followingId, vars.followerId] });
        qc.invalidateQueries({ queryKey: ['follower_count', vars.followingId] });
        qc.invalidateQueries({ queryKey: ['following_count', vars.followerId] });
        qc.invalidateQueries({ queryKey: ['feed', vars.followerId] });
      },
    });
  }

  export function useUnfollow() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { followerId: string; followingId: string }) => {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', input.followerId)
          .eq('following_id', input.followingId);
        if (error) throw error;
      },
      onSuccess: (_data, vars) => {
        qc.setQueryData(['is_following', vars.followerId, vars.followingId], false);
        qc.invalidateQueries({ queryKey: ['is_mutual', vars.followerId, vars.followingId] });
        qc.invalidateQueries({ queryKey: ['is_mutual', vars.followingId, vars.followerId] });
        qc.invalidateQueries({ queryKey: ['follower_count', vars.followingId] });
        qc.invalidateQueries({ queryKey: ['following_count', vars.followerId] });
        qc.invalidateQueries({ queryKey: ['feed', vars.followerId] });
      },
    });
  }
  ```

- [ ] **Step 2.2: Typecheck**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: clean. (If `are_mutuals` arg names mismatch the regenerated types, adjust to match the generated `Args` shape — Supabase sometimes flips arg ordering.)

- [ ] **Step 2.3: Commit**

  ```bash
  git add lib/queries/follows.ts
  git commit -m "feat(queries): add follows queries and mutations"
  ```

---

## Task 3: Users query module + Discover overhaul

**Files:**
- Create: `lib/queries/users.ts`
- Create: `components/UserListItem.tsx`
- Create: `components/FollowButton.tsx`
- Modify: `app/(app)/(tabs)/discover.tsx`

Discover becomes a real screen: a single search input on top, Players results above, Courses results below. The existing course-search lives in `lib/queries/courses.ts`; we don't duplicate it — we just call it.

- [ ] **Step 3.1: Create `lib/queries/users.ts`**

  ```ts
  import { useQuery } from '@tanstack/react-query';

  import { supabase, type Tables } from '@/lib/supabase';

  export type PublicProfile = Pick<
    Tables<'profiles'>,
    'id' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'home_course_id'
  >;

  export function useSearchUsers(query: string, viewerId: string | undefined) {
    const trimmed = query.trim();
    return useQuery({
      queryKey: ['search_users', trimmed, viewerId],
      queryFn: async () => {
        if (trimmed.length < 2) return [];
        const pattern = `%${trimmed}%`;
        let q = supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, bio, home_course_id')
          .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
          .order('username', { ascending: true })
          .limit(20);
        if (viewerId) q = q.neq('id', viewerId);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []) as PublicProfile[];
      },
      enabled: trimmed.length >= 2,
    });
  }

  export function useProfileByUsername(username: string | undefined) {
    return useQuery({
      queryKey: ['profile_by_username', username],
      queryFn: async () => {
        if (!username) return null;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username.toLowerCase())
          .maybeSingle();
        if (error) throw error;
        return data as Tables<'profiles'> | null;
      },
      enabled: !!username,
    });
  }
  ```

- [ ] **Step 3.2: Create `components/FollowButton.tsx`**

  ```tsx
  import { Pressable, Text, ActivityIndicator } from 'react-native';

  import { useFollow, useUnfollow, useIsFollowing } from '@/lib/queries/follows';

  type Props = {
    viewerId: string;
    targetId: string;
    size?: 'sm' | 'md';
  };

  export function FollowButton({ viewerId, targetId, size = 'md' }: Props) {
    const isFollowingQ = useIsFollowing(viewerId, targetId);
    const follow = useFollow();
    const unfollow = useUnfollow();

    if (viewerId === targetId) return null;

    const isFollowing = isFollowingQ.data ?? false;
    const busy = follow.isPending || unfollow.isPending || isFollowingQ.isLoading;

    const onPress = () => {
      if (busy) return;
      if (isFollowing) {
        unfollow.mutate({ followerId: viewerId, followingId: targetId });
      } else {
        follow.mutate({ followerId: viewerId, followingId: targetId });
      }
    };

    const padding = size === 'sm' ? 'px-3 py-1' : 'px-4 py-2';
    const fontSize = size === 'sm' ? 'text-xs' : 'text-sm';

    return (
      <Pressable
        onPress={onPress}
        disabled={busy}
        className={`${padding} rounded-full border ${
          isFollowing
            ? 'border-border-subtle bg-transparent'
            : 'border-accent bg-accent'
        } ${busy ? 'opacity-50' : 'active:opacity-70'}`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={isFollowing ? '#a3a3a3' : '#08100c'} />
        ) : (
          <Text
            className={`${fontSize} font-semibold ${
              isFollowing ? 'text-text-secondary' : 'text-bg-base'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </Pressable>
    );
  }
  ```

- [ ] **Step 3.3: Create `components/UserListItem.tsx`**

  ```tsx
  import { Pressable, Text, View } from 'react-native';
  import { router } from 'expo-router';

  import { FollowButton } from './FollowButton';
  import type { PublicProfile } from '@/lib/queries/users';

  type Props = {
    user: PublicProfile;
    viewerId: string;
  };

  export function UserListItem({ user, viewerId }: Props) {
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/profile/[username]', params: { username: user.username } })}
        className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
      >
        <View className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
          <Text className="text-text-secondary text-base font-semibold">
            {user.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-text-primary text-base font-semibold">{user.display_name}</Text>
          <Text className="text-text-secondary text-xs">@{user.username}</Text>
        </View>
        <FollowButton viewerId={viewerId} targetId={user.id} size="sm" />
      </Pressable>
    );
  }
  ```

- [ ] **Step 3.4: Rewrite `app/(app)/(tabs)/discover.tsx`**

  Replace the entire file:

  ```tsx
  import { useState } from 'react';
  import { FlatList, Text, View, ActivityIndicator } from 'react-native';

  import { Input } from '@/components/Input';
  import { ScreenContainer } from '@/components/ScreenContainer';
  import { UserListItem } from '@/components/UserListItem';
  import { CourseListItem } from '@/components/CourseListItem';
  import { useSearchUsers } from '@/lib/queries/users';
  import { useSearchCourses } from '@/lib/queries/courses';
  import { useSession } from '@/lib/hooks/useSession';

  export default function Discover() {
    const { session } = useSession();
    const viewerId = session?.user.id;
    const [q, setQ] = useState('');

    const usersQ = useSearchUsers(q, viewerId);
    const coursesQ = useSearchCourses(q);

    const showResults = q.trim().length >= 2;

    return (
      <ScreenContainer>
        <Text className="text-text-primary text-3xl font-light mt-12">Discover</Text>

        <View className="mt-4">
          <Input
            value={q}
            onChangeText={setQ}
            placeholder="Search players or courses"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {!showResults ? (
          <Text className="text-text-secondary text-sm mt-6">
            Type at least 2 characters to search.
          </Text>
        ) : (
          <FlatList
            data={[]}
            renderItem={null}
            keyExtractor={() => 'unused'}
            ListHeaderComponent={
              <View>
                <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-2">
                  Players
                </Text>
                {usersQ.isLoading ? (
                  <ActivityIndicator className="my-4" />
                ) : (usersQ.data ?? []).length === 0 ? (
                  <Text className="text-text-secondary text-sm py-2">No players found.</Text>
                ) : (
                  (usersQ.data ?? []).map((u) =>
                    viewerId ? <UserListItem key={u.id} user={u} viewerId={viewerId} /> : null,
                  )
                )}

                <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-2">
                  Courses
                </Text>
                {coursesQ.isLoading ? (
                  <ActivityIndicator className="my-4" />
                ) : (coursesQ.data ?? []).length === 0 ? (
                  <Text className="text-text-secondary text-sm py-2">No courses found.</Text>
                ) : (
                  (coursesQ.data ?? []).map((c) => (
                    <CourseListItem key={c.id} course={c} onPress={() => null} />
                  ))
                )}
              </View>
            }
          />
        )}
      </ScreenContainer>
    );
  }
  ```

  > Note for the implementer: if `useSearchCourses` doesn't exist with that exact name in `lib/queries/courses.ts`, use whatever the existing course-search hook is named (read the file). If `CourseListItem`'s prop signature differs, match the existing call site in `app/(app)/round/new/course.tsx` (search picker). Do NOT change `CourseListItem`'s API.

- [ ] **Step 3.5: Typecheck and run on device**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: clean.

  Then start Expo Go: `npx expo start --clear` and verify on your phone:
  - Discover tab opens.
  - Typing 2+ characters surfaces matching usernames + display names.
  - Tapping a user navigates to `/profile/<username>` (which 404s for now — Task 5 fixes that).
  - Follow button on a user toggles between Follow and Following.

- [ ] **Step 3.6: Commit**

  ```bash
  git add lib/queries/users.ts components/FollowButton.tsx components/UserListItem.tsx app/(app)/(tabs)/discover.tsx
  git commit -m "feat(discover): user search + follow button + Discover overhaul"
  ```

---

## Task 4: Feed query module + FeedRoundCard

**Files:**
- Create: `lib/queries/feed.ts`
- Create: `components/FeedRoundCard.tsx`

The feed is a single query: rounds where the owner is mutual with me, `visibility='mutuals'` or `'public'`, `is_draft=false`, joined to course name + owner profile. RLS already filters out anything I shouldn't see — but we ALSO scope client-side to `visibility != 'private'` and `is_draft = false` so the query is explicit and indexable.

- [ ] **Step 4.1: Create `lib/queries/feed.ts`**

  ```ts
  import { useQuery } from '@tanstack/react-query';

  import { supabase, type Tables } from '@/lib/supabase';

  export type FeedRound = Tables<'rounds'> & {
    courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
    profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
  };

  export function useFeed(viewerId: string | undefined, limit = 30) {
    return useQuery({
      queryKey: ['feed', viewerId, limit],
      queryFn: async () => {
        if (!viewerId) return [];
        // Step A: who do I follow?
        const { data: follows, error: followsErr } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', viewerId);
        if (followsErr) throw followsErr;
        const followingIds = (follows ?? []).map((r) => r.following_id);
        if (followingIds.length === 0) return [];

        // Step B: of those, who follows me back? RLS will filter to mutuals,
        // but we narrow client-side first to keep the rounds query small.
        const { data: backFollows, error: backErr } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', viewerId)
          .in('follower_id', followingIds);
        if (backErr) throw backErr;
        const mutualIds = (backFollows ?? []).map((r) => r.follower_id);
        if (mutualIds.length === 0) return [];

        // Step C: rounds from mutuals, mutual-or-public visibility, not drafts.
        const { data, error } = await supabase
          .from('rounds')
          .select(
            `
            *,
            courses ( name, hole_count ),
            profiles!rounds_user_id_fkey ( id, username, display_name, avatar_url )
            `,
          )
          .in('user_id', mutualIds)
          .in('visibility', ['mutuals', 'public'])
          .eq('is_draft', false)
          .order('played_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data ?? []) as FeedRound[];
      },
      enabled: !!viewerId,
    });
  }
  ```

  > Note: the FK alias `profiles!rounds_user_id_fkey` assumes the FK is named `rounds_user_id_fkey`. The migration in Phase 1 didn't name it explicitly, so Postgres auto-generated `rounds_user_id_fkey`. If Supabase rejects the alias, replace with the embedded shorthand `profiles ( id, username, display_name, avatar_url )` (Supabase will infer from the only `user_id` FK).

- [ ] **Step 4.2: Create `components/FeedRoundCard.tsx`**

  ```tsx
  import { Pressable, Text, View } from 'react-native';
  import { router } from 'expo-router';
  import { format } from 'date-fns';

  import type { FeedRound } from '@/lib/queries/feed';

  type Props = { round: FeedRound };

  export function FeedRoundCard({ round }: Props) {
    const owner = round.profiles;
    const course = round.courses;
    const diff = round.total_score - round.total_par;
    const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/round/[id]', params: { id: round.id } })}
        className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-3 active:opacity-70"
      >
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-full bg-bg-base border border-border-subtle items-center justify-center">
            <Text className="text-text-secondary text-base font-semibold">
              {(owner?.display_name ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 ml-3">
            <Text className="text-text-primary text-base font-semibold">
              {owner?.display_name ?? 'Unknown'}
            </Text>
            <Text className="text-text-secondary text-xs">
              @{owner?.username ?? '—'} · {format(new Date(round.played_at), 'MMM d')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-end justify-between mt-3">
          <View>
            <Text className="text-text-primary text-lg font-light">{course?.name ?? 'Unknown course'}</Text>
            <Text className="text-text-secondary text-xs">{course?.hole_count ?? 18} holes</Text>
          </View>
          <View className="items-end">
            <Text className="text-text-primary text-3xl font-light">{round.total_score}</Text>
            <Text
              className={`text-sm font-semibold ${
                diff < 0 ? 'text-accent' : diff > 0 ? 'text-text-secondary' : 'text-text-primary'
              }`}
            >
              {diffLabel} vs par
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }
  ```

- [ ] **Step 4.3: Typecheck**

  Run:
  ```bash
  npx tsc --noEmit
  ```
  Expected: clean.

- [ ] **Step 4.4: Commit**

  ```bash
  git add lib/queries/feed.ts components/FeedRoundCard.tsx
  git commit -m "feat(feed): add mutuals feed query and round card"
  ```

---

## Task 5: Other-user profile screen

**Files:**
- Create: `app/(app)/profile/_layout.tsx`
- Create: `app/(app)/profile/[username].tsx`

Anyone tappable in the app — Discover, feed cards, comments later — routes here. The screen handles three cases:
- **Self:** redirect to the existing Profile tab (we don't need a duplicate self-view).
- **Mutual:** full view — header, counts, follow button (showing "Following"), recent rounds list.
- **Not mutual:** header, counts, follow button, gated rounds section saying "Follow each other to see their rounds."

- [ ] **Step 5.1: Create `app/(app)/profile/_layout.tsx`**

  ```tsx
  import { Stack } from 'expo-router';

  export default function ProfileLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```

- [ ] **Step 5.2: Create `app/(app)/profile/[username].tsx`**

  ```tsx
  import { useEffect } from 'react';
  import { ActivityIndicator, Pressable, Text, View, FlatList } from 'react-native';
  import { router, useLocalSearchParams } from 'expo-router';
  import { useQuery } from '@tanstack/react-query';
  import { format } from 'date-fns';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { FollowButton } from '@/components/FollowButton';
  import { useSession } from '@/lib/hooks/useSession';
  import { useProfileByUsername } from '@/lib/queries/users';
  import { useFollowerCount, useFollowingCount, useIsMutual } from '@/lib/queries/follows';
  import { supabase, type Tables } from '@/lib/supabase';

  type RoundWithCourse = Tables<'rounds'> & {
    courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
  };

  export default function OtherProfile() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const { session } = useSession();
    const viewerId = session?.user.id;

    const profileQ = useProfileByUsername(username);
    const profile = profileQ.data;

    const isSelf = !!profile && !!viewerId && profile.id === viewerId;

    // If you somehow land on your own profile by username, bounce to the Profile tab.
    useEffect(() => {
      if (isSelf) router.replace('/(app)/(tabs)/profile');
    }, [isSelf]);

    const followersQ = useFollowerCount(profile?.id);
    const followingQ = useFollowingCount(profile?.id);
    const mutualQ = useIsMutual(viewerId, profile?.id);

    const roundsCountQ = useQuery({
      queryKey: ['profile_rounds_count', profile?.id],
      queryFn: async () => {
        if (!profile?.id) return 0;
        const { count, error } = await supabase
          .from('rounds')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_draft', false);
        if (error) throw error;
        return count ?? 0;
      },
      enabled: !!profile?.id,
    });

    const recentRoundsQ = useQuery({
      queryKey: ['user_recent_rounds', profile?.id],
      queryFn: async () => {
        if (!profile?.id) return [];
        const { data, error } = await supabase
          .from('rounds')
          .select('*, courses(name, hole_count)')
          .eq('user_id', profile.id)
          .eq('is_draft', false)
          .order('played_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);
        if (error) throw error;
        return (data ?? []) as RoundWithCourse[];
      },
      enabled: !!profile?.id && (mutualQ.data ?? false),
    });

    if (profileQ.isLoading) {
      return (
        <ScreenContainer>
          <ActivityIndicator className="mt-20" />
        </ScreenContainer>
      );
    }
    if (!profile) {
      return (
        <ScreenContainer>
          <BackButton />
          <Text className="text-text-primary text-xl mt-8">User not found</Text>
        </ScreenContainer>
      );
    }
    if (isSelf) return null; // useEffect will redirect

    const isMutual = mutualQ.data ?? false;

    return (
      <ScreenContainer>
        <BackButton />

        <View className="flex-row items-center mt-6">
          <View className="w-16 h-16 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
            <Text className="text-text-secondary text-2xl font-semibold">
              {profile.display_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-text-primary text-2xl font-light">{profile.display_name}</Text>
            <Text className="text-text-secondary text-sm">@{profile.username}</Text>
          </View>
          {viewerId ? <FollowButton viewerId={viewerId} targetId={profile.id} /> : null}
        </View>

        {profile.bio ? (
          <Text className="text-text-primary text-sm mt-4 leading-5">{profile.bio}</Text>
        ) : null}

        <View className="flex-row mt-6 py-4 border-y border-border-subtle">
          <Stat label="Rounds" value={roundsCountQ.data ?? 0} />
          <Stat label="Followers" value={followersQ.data ?? 0} />
          <Stat label="Following" value={followingQ.data ?? 0} />
        </View>

        <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-2">
          Recent rounds
        </Text>

        {!isMutual ? (
          <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mt-2">
            <Text className="text-text-primary text-sm">
              Follow each other to see their rounds.
            </Text>
          </View>
        ) : recentRoundsQ.isLoading ? (
          <ActivityIndicator className="my-4" />
        ) : (recentRoundsQ.data ?? []).length === 0 ? (
          <Text className="text-text-secondary text-sm mt-2">No rounds yet.</Text>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={recentRoundsQ.data ?? []}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => <RoundRow round={item} />}
          />
        )}
      </ScreenContainer>
    );
  }

  function Stat({ label, value }: { label: string; value: number }) {
    return (
      <View className="flex-1">
        <Text className="text-text-primary text-xl font-light">{value}</Text>
        <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-1">{label}</Text>
      </View>
    );
  }

  function RoundRow({ round }: { round: RoundWithCourse }) {
    const diff = round.total_score - round.total_par;
    const diffLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/round/[id]', params: { id: round.id } })}
        className="flex-row items-center py-3 border-b border-border-subtle active:opacity-70"
      >
        <View className="flex-1">
          <Text className="text-text-primary text-base">{round.courses?.name ?? '—'}</Text>
          <Text className="text-text-secondary text-xs mt-0.5">
            {format(new Date(round.played_at), 'MMM d, yyyy')}
          </Text>
        </View>
        <Text className="text-text-primary text-lg font-light">{round.total_score}</Text>
        <Text className="text-text-secondary text-xs ml-2 w-10 text-right">{diffLabel}</Text>
      </Pressable>
    );
  }

  function BackButton() {
    return (
      <Pressable onPress={() => router.back()} className="mt-6 active:opacity-70">
        <Text className="text-accent text-sm">← Back</Text>
      </Pressable>
    );
  }
  ```

- [ ] **Step 5.3: Verify navigation typing**

  If `app/(app)/_layout.tsx` uses a typed Stack, ensure the new `profile` group is included (it should auto-pick up via expo-router file-based routing — no edit needed).

- [ ] **Step 5.4: Typecheck and run on device**

  ```bash
  npx tsc --noEmit
  ```
  Expected: clean.

  Then on the phone:
  - From Discover, tap a user → other-profile loads.
  - Counts render as 0 / 0 / 0 (or whatever's there).
  - Tapping the Follow button toggles label between "Follow" and "Following".
  - "Follow each other to see their rounds" message appears since you don't have a mutual yet.
  - Tapping your own username (somehow) routes you to the Profile tab.

- [ ] **Step 5.5: Commit**

  ```bash
  git add app/(app)/profile/_layout.tsx app/(app)/profile/[username].tsx
  git commit -m "feat(profile): add other-user profile screen with follow + mutual gate"
  ```

---

## Task 6: Wire up the Home feed

**Files:**
- Modify: `app/(app)/(tabs)/index.tsx`

Replace the "Feed comes in Phase 3" placeholder with the actual feed list. Keep the existing draft-resume banner.

- [ ] **Step 6.1: Rewrite `app/(app)/(tabs)/index.tsx`**

  Replace the entire file:

  ```tsx
  import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
  import { router } from 'expo-router';
  import { useQuery } from '@tanstack/react-query';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { FeedRoundCard } from '@/components/FeedRoundCard';
  import { useSession } from '@/lib/hooks/useSession';
  import { useDraftRound } from '@/lib/queries/rounds';
  import { useFeed } from '@/lib/queries/feed';
  import { supabase, type Tables } from '@/lib/supabase';

  export default function Feed() {
    const { session } = useSession();
    const userId = session?.user.id;

    const draftQ = useDraftRound(userId);
    const feedQ = useFeed(userId);

    const courseQ = useQuery({
      queryKey: ['course', draftQ.data?.course_id],
      queryFn: async () => {
        if (!draftQ.data?.course_id) return null;
        const { data, error } = await supabase
          .from('courses')
          .select('name, hole_count')
          .eq('id', draftQ.data.course_id)
          .single();
        if (error) throw error;
        return data as Pick<Tables<'courses'>, 'name' | 'hole_count'>;
      },
      enabled: !!draftQ.data?.course_id,
    });

    const totalHoles = courseQ.data?.hole_count ?? 18;
    const resumeQ = useQuery({
      queryKey: ['resume_hole', draftQ.data?.id, totalHoles],
      queryFn: async () => {
        if (!draftQ.data) return 1;
        const { data, error } = await supabase
          .from('round_holes')
          .select('hole_number')
          .eq('round_id', draftQ.data.id);
        if (error) throw error;
        const scored = new Set((data ?? []).map((r) => r.hole_number));
        for (let n = 1; n <= totalHoles; n++) if (!scored.has(n)) return n;
        return totalHoles;
      },
      enabled: !!draftQ.data,
    });

    const draft = draftQ.data;
    const feed = feedQ.data ?? [];

    return (
      <ScreenContainer>
        <FlatList
          data={feed}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => <FeedRoundCard round={item} />}
          ListHeaderComponent={
            <View>
              <Text className="text-text-primary text-3xl font-light mt-8">Home</Text>

              {draft && courseQ.data ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/round/new/score',
                      params: { roundId: draft.id, hole: String(resumeQ.data ?? 1) },
                    })
                  }
                  className="bg-bg-surface border border-accent rounded-2xl p-4 mt-4 mb-2 active:opacity-80"
                >
                  <Text className="text-accent text-xs uppercase tracking-wider font-semibold">
                    In progress
                  </Text>
                  <Text className="text-text-primary text-lg font-semibold mt-1">
                    Resume at {courseQ.data.name}
                  </Text>
                  <Text className="text-text-secondary text-sm mt-1">
                    Continue scoring at hole {resumeQ.data ?? 1}
                  </Text>
                </Pressable>
              ) : null}

              <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-6 mb-3">
                Recent from people you follow
              </Text>
            </View>
          }
          ListEmptyComponent={
            feedQ.isLoading ? (
              <ActivityIndicator className="my-6" />
            ) : (
              <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mt-2">
                <Text className="text-text-primary text-sm">Your feed is quiet.</Text>
                <Text className="text-text-secondary text-xs mt-1">
                  Follow players from Discover. When you and someone follow each other, their rounds show up here.
                </Text>
              </View>
            )
          }
        />
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 6.2: Typecheck and run on device**

  ```bash
  npx tsc --noEmit
  ```
  Expected: clean.

  On the phone:
  - Home shows the empty-state card ("Your feed is quiet…").
  - With two test accounts that mutually follow each other and have at least one non-private saved round, both feeds should render the other's round.
  - Tapping a feed card opens `/round/[id]` (Task 7 makes this read-only-friendly for non-owners).

- [ ] **Step 6.3: Commit**

  ```bash
  git add app/(app)/(tabs)/index.tsx
  git commit -m "feat(home): render mutuals feed with empty state"
  ```

---

## Task 7: Round detail — read-only branch for non-owners

**Files:**
- Modify: `app/(app)/round/[id].tsx`

Right now the round detail page assumes the viewer is the owner (it shows Delete + edit affordances). When a feed tap lands a viewer on someone else's round, we hide owner-only actions and show the owner header instead.

- [ ] **Step 7.1: Read the current file to understand its structure**

  ```bash
  cat "app/(app)/round/[id].tsx"
  ```

  You'll see something like:
  - Loads `round` by id via a hook
  - Loads `round_holes`
  - Renders header (course + score + date) + `HoleScoreGrid` + Delete button

- [ ] **Step 7.2: Add an owner check and gate owner-only UI**

  In `app/(app)/round/[id].tsx`, after the existing `useSession` and round-loading code, add:

  ```tsx
  const isOwner = !!session?.user.id && round?.user_id === session.user.id;
  ```

  Then, somewhere in the JSX **above the existing course/date header**, render an owner header card when the viewer is NOT the owner:

  ```tsx
  {!isOwner && round?.user_id ? <RoundOwnerHeader ownerId={round.user_id} /> : null}
  ```

  And wrap any owner-only action (Delete button, edit notes, visibility toggle if present) in:

  ```tsx
  {isOwner ? (
    /* existing owner-only UI */
  ) : null}
  ```

  Add this component at the bottom of the file:

  ```tsx
  function RoundOwnerHeader({ ownerId }: { ownerId: string }) {
    const { data, isLoading } = useQuery({
      queryKey: ['profile', ownerId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name')
          .eq('id', ownerId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    });
    if (isLoading || !data) return null;
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/profile/[username]', params: { username: data.username } })}
        className="flex-row items-center py-3 active:opacity-70"
      >
        <View className="w-10 h-10 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
          <Text className="text-text-secondary text-base font-semibold">
            {data.display_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="ml-3">
          <Text className="text-text-primary text-base font-semibold">{data.display_name}</Text>
          <Text className="text-text-secondary text-xs">@{data.username}</Text>
        </View>
      </Pressable>
    );
  }
  ```

  Add the necessary imports at the top of the file if missing: `Pressable`, `View`, `useQuery`, `router`, `supabase`.

- [ ] **Step 7.3: Typecheck and run on device**

  ```bash
  npx tsc --noEmit
  ```
  Expected: clean.

  On the phone, with two test accounts mutually following:
  - Open your own round → Delete button still visible.
  - Open a mutual's round (from feed) → no Delete button; a header shows the owner's name + handle, tappable to their profile.

- [ ] **Step 7.4: Commit**

  ```bash
  git add "app/(app)/round/[id].tsx"
  git commit -m "feat(round): non-owner read view with owner header"
  ```

---

## Task 8: End-to-end phone test + tag

**Files:** none (verification + tag).

This is the user-tested gate before tagging `phase-3a`.

- [ ] **Step 8.1: Set up a second test account**

  - On the phone (or simulator), open the app, sign out from Settings.
  - Sign up with a second email + username (e.g., `@bobtest`).
  - Score and save one round on this account.
  - Sign out, sign back in as your primary account.

- [ ] **Step 8.2: Drive the social graph**

  - Open Discover, type the new account's username, tap Follow.
  - Sign out, sign in as the new account. Open Discover, type your primary username, tap Follow.

- [ ] **Step 8.3: Verify all gates**

  Sign back in as primary. Verify on the phone:

  - Home tab shows the secondary account's round in the feed.
  - Tapping the feed card opens round detail, which shows the owner header (no Delete button).
  - Tapping the owner header opens their profile.
  - Their profile shows real follower/following/rounds counts and recent rounds list.
  - Unfollowing them removes them from your feed (pull to refresh / cold reload).
  - Re-following restores them.
  - Discover empty-state ("Type at least 2 characters") shows on first load.
  - Searching for a non-existent username shows "No players found."

- [ ] **Step 8.4: Tag phase-3a**

  ```bash
  git tag -a phase-3a -m "Phase 3a: social graph + Discover + feed"
  git push origin main --tags
  ```

---

## Verification matrix (recap)

| Concern | How it's enforced |
|---|---|
| You can't see a non-mutual's mutuals-visibility round | RLS policy `rounds_read_visible` checks `are_mutuals(auth.uid(), user_id)` |
| You can't fake follow on someone else's behalf | RLS `follows_insert_own` requires `follower_id = auth.uid()` |
| Self-follow isn't possible | Table CHECK `follower_id <> following_id` |
| Drafts never leak into others' feeds | RLS gates on `is_draft = false` for non-owner reads + client query filters `is_draft=false` |
| Counts stay accurate after follow/unfollow | Mutations invalidate `follower_count` / `following_count` / `is_mutual` / `feed` query keys |

## Spec-vs-plan deltas (record-keeping)

- **Phase 3 split into 3a + 3b.** 3b will cover likes, comments, block, report, contacts invite.
- **No "Find friends" onboarding step yet.** The original spec had this as Auth step 3. Deferred to Phase 3b alongside contacts invite.
- **No public visibility UI yet.** RLS supports `'public'` so we don't have to migrate later, but no toggle exposes it; default visibility on new rounds remains `'mutuals'`.
