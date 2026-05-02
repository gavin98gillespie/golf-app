# Phase 3b — Interactions + Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the social layer feel alive and safe. Add likes + comments to rounds, tappable followers/following lists, an in-app "you have new followers" hint (the user-asked alternative to push notifications), block, and report. By the end, two friends can have a back-and-forth in the comments of a round, and any user has the tools to remove a bad actor (block) or flag a problem (report).

**Architecture:** Three new tables (`likes`, `comments`, `blocks`, `reports` — four tables, three social + one moderation). One Postgres helper (`is_blocked(a, b)`, symmetric) plumbed into existing RLS so blocked content is invisible to the blocker. Everything else follows the patterns already in place: TanStack Query hooks, RLS-only authorization, NativeWind theme tokens.

**Tech Stack additions:** none. All libraries needed are already installed.

**Spec deviation:** the original Phase 3 spec includes "contacts invite (with hashed contact list)." We are deferring this to Phase 4 (onboarding/compliance polish). Why: (1) it's the heaviest piece — needs `expo-contacts`, client-side SHA-256 hashing, an `invites` table, and a server-side match function; (2) it's onboarding sugar, not core social; (3) Phase 4 already touches onboarding (account deletion, ToS placement). Bundling it there keeps 3b focused.

**Scope NOT included** (intentionally):
- Push notifications. Real push (APNs + `expo-notifications` + server triggers) lands in v2 after TestFlight. The "follow-back hint" in this plan is the in-app substitute the user asked for.
- Editing or deleting comments after posting. Add only if a tester requests it.
- Like/comment counts on feed cards. Considered cheap polish — included.

**Working directory:** `/Users/gavingillespie/Desktop/Golf App/` — Phase 3a tagged.

---

## Mental model

```
ROUND DETAIL (mutual viewing someone's round)         FOLLOWERS LIST                      PROFILE TAB (yours)
┌──────────────────────────────────────────┐          ┌──────────────────────────────┐    ┌──────────────────────────────┐
│ ← Back            (•••)                  │          │ ← Followers                  │    │ Display Name           ⚙ ●  │ ← red dot when
│ ╭╮ Bob Smith                             │          │                              │    │ @username                    │   new followers
│ ╰╯ @bob                                  │          │ ╭╮ Alice                ✓Following │    │                              │   to follow back
│                                          │          │ ╰╯ @alice                    │    │ ┌─ Stats summary ─────────┐ │
│ Pebble Beach           82 (+10)          │          │                              │    │                              │
│ 18 holes • May 2                         │          │ ╭╮ Charlie         [Follow back] │    │  Followers ▶  Following ▶   │ ← tappable
│                                          │          │ ╰╯ @charlie                  │    │                              │
│ ┌─ hole grid ───────────────┐           │          └──────────────────────────────┘    └──────────────────────────────┘
│ │  4 5 4 3 5 4 3 4 5         │           │
│ └────────────────────────────┘           │          ROUND ••• MENU            REPORT SHEET
│                                          │          ┌──────────────────────┐  ┌────────────────────────────────┐
│ ❤  3   💬 2                              │          │ Report this round    │  │ Report                         │
│                                          │          │ Cancel               │  │                                │
│ ┌─ Comments ──────────────┐              │          └──────────────────────┘  │ Why are you reporting this?    │
│ │ Alice  • 2h                │              │                                  │ ○ Spam                         │
│ │ Nice round!               │              │          PROFILE ••• MENU        │ ○ Harassment                   │
│ │                            │              │          ┌──────────────────────┐  │ ○ Inappropriate content        │
│ │ Charlie • 1h               │              │          │ Block @alice          │  │ ○ Other                        │
│ │ How were the greens?       │              │          │ Report @alice         │  │                                │
│ └────────────────────────────┘              │          │ Cancel                │  │ [ Submit ]    [ Cancel ]       │
│                                          │          └──────────────────────┘  └────────────────────────────────┘
│ [ Add a comment…           ] [Send]      │
└──────────────────────────────────────────┘
```

Definitions:
- **Block** = a row in `blocks(blocker_id, blocked_id)`. The relationship is recorded one-way but **enforced symmetrically** in RLS via `is_blocked(a, b)` which checks both directions. Once A blocks B, neither sees the other.
- **Report** = a row in `reports(reporter_id, target_type, target_id, reason, status)`. Goes to a moderation queue we'll triage manually before public launch (Phase 6); the moderation tooling itself is out of scope here.
- **New follower** (for the red-dot hint) = a user who follows you that you don't follow back. The Profile tab dot shows whenever this set is non-empty.

---

## File Structure

```
supabase/migrations/
└── 20260504000001_phase3b_likes_comments_blocks_reports.sql

lib/queries/
├── likes.ts                # like/unlike + count + has-liked
├── comments.ts             # list + post comments
├── blocks.ts               # block / unblock / list-of-blocks
├── reports.ts              # submit a report
└── follows.ts              # MODIFIED: add useFollowersList + useFollowingList

components/
├── LikeButton.tsx          # heart toggle + count
├── CommentList.tsx         # list of comments under a round
├── CommentInput.tsx        # text input + Send button
├── UserListItem.tsx        # MODIFIED: optional "Follow back" hint
└── ReportSheet.tsx         # modal sheet for choosing a reason + submit

app/(app)/
├── round/
│   └── [id].tsx            # MODIFIED: add LikeButton, CommentList, CommentInput, ••• menu (Report)
├── profile/
│   └── [username].tsx      # MODIFIED: ••• menu (Block, Report); tappable count rows
├── (tabs)/
│   └── profile.tsx         # MODIFIED: tappable count rows
└── relations/
    ├── _layout.tsx         # NEW: stack
    └── [username]/
        ├── followers.tsx   # NEW: list of who follows the user
        └── following.tsx   # NEW: list of who the user follows

lib/database.types.ts        # REGENERATED after migration
```

---

## Task 1: Migration — likes, comments, blocks, reports + `is_blocked` + RLS plumbing

**Files:**
- Create: `supabase/migrations/20260504000001_phase3b_likes_comments_blocks_reports.sql`
- Regenerate: `lib/database.types.ts`

This migration:
1. Creates `likes`, `comments`, `blocks`, `reports`.
2. Adds `is_blocked(a uuid, b uuid)` — `STABLE SECURITY DEFINER`, symmetric (returns true if EITHER has blocked the other).
3. Replaces the existing `rounds_read_visible` policy to also exclude blocks.
4. Replaces `round_holes_read_via_round` to inherit.
5. Adds RLS to the four new tables.
6. Updates `profiles` SELECT to honor blocks (you can't browse a blocker's profile, and they can't browse yours).
7. Updates `follows` SELECT to honor blocks (a block hides the relationship from both sides).

- [ ] **Step 1.1: Create the migration**

Create `supabase/migrations/20260504000001_phase3b_likes_comments_blocks_reports.sql`:

```sql
-- ============================================================================
-- Phase 3b: likes, comments, blocks, reports + symmetric is_blocked helper
-- + RLS updates on profiles, follows, rounds, round_holes to honor blocks.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- likes
-- ----------------------------------------------------------------------------
CREATE TABLE likes (
  user_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  round_id    UUID         NOT NULL REFERENCES rounds(id)   ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, round_id)
);

CREATE INDEX likes_round_idx ON likes(round_id);

-- ----------------------------------------------------------------------------
-- comments
-- ----------------------------------------------------------------------------
CREATE TABLE comments (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id    UUID         NOT NULL REFERENCES rounds(id)   ON DELETE CASCADE,
  user_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT         NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX comments_round_idx ON comments(round_id, created_at);

-- ----------------------------------------------------------------------------
-- blocks
-- ----------------------------------------------------------------------------
CREATE TABLE blocks (
  blocker_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX blocks_blocked_idx ON blocks(blocked_id);

-- ----------------------------------------------------------------------------
-- reports
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type   TEXT         NOT NULL CHECK (target_type IN ('round', 'profile', 'comment')),
  target_id     UUID         NOT NULL,
  reason        TEXT         NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
  details       TEXT         CHECK (details IS NULL OR length(details) <= 500),
  status        TEXT         NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX reports_status_idx ON reports(status, created_at);

-- ----------------------------------------------------------------------------
-- is_blocked helper — symmetric. SECURITY DEFINER bypasses RLS on `blocks`
-- so this can be called from inside other RLS policies safely.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_blocked(a UUID, b UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = a AND blocked_id = b)
         OR (blocker_id = b AND blocked_id = a)
    );
  $$;

REVOKE ALL ON FUNCTION public.is_blocked(UUID, UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.is_blocked(UUID, UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- RLS: likes
-- ----------------------------------------------------------------------------
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- You can read a like row iff you can read the parent round (same RLS gate)
-- AND neither party (you, like-author, round-owner) is blocked relative to you.
CREATE POLICY "likes_read_via_round"
  ON likes FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), likes.user_id)
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = likes.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public'  AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "likes_insert_own"
  ON likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = likes.round_id
        AND r.is_draft = false
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public')
          OR (r.visibility = 'mutuals' AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "likes_delete_own"
  ON likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: comments
-- ----------------------------------------------------------------------------
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_read_via_round"
  ON comments FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), comments.user_id)
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = comments.round_id
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public'  AND r.is_draft = false)
          OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "comments_insert_own"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = comments.round_id
        AND r.is_draft = false
        AND (
          r.user_id = auth.uid()
          OR (r.visibility = 'public')
          OR (r.visibility = 'mutuals' AND public.are_mutuals(auth.uid(), r.user_id))
        )
        AND NOT public.is_blocked(auth.uid(), r.user_id)
    )
  );

CREATE POLICY "comments_delete_own"
  ON comments FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: blocks
-- ----------------------------------------------------------------------------
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocks_read_own"
  ON blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "blocks_insert_own"
  ON blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- RLS: reports — reporter can read their own; nobody else (admin tooling later)
-- ----------------------------------------------------------------------------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_read_own"
  ON reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "reports_insert_own"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Replace existing policies to honor blocks
-- ----------------------------------------------------------------------------

-- profiles: anyone authenticated can read EXCEPT blocked
DROP POLICY "profiles_read_authenticated" ON profiles;

CREATE POLICY "profiles_read_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (NOT public.is_blocked(auth.uid(), id));

-- follows: anyone authenticated can read EXCEPT involving blocked
DROP POLICY "follows_read_authenticated" ON follows;

CREATE POLICY "follows_read_authenticated"
  ON follows FOR SELECT TO authenticated
  USING (
    NOT public.is_blocked(auth.uid(), follower_id)
    AND NOT public.is_blocked(auth.uid(), following_id)
  );

-- rounds: replace 3a's rounds_read_visible to also exclude blocks
DROP POLICY "rounds_read_visible" ON rounds;

CREATE POLICY "rounds_read_visible"
  ON rounds FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      NOT public.is_blocked(auth.uid(), user_id)
      AND (
        (visibility = 'public'  AND is_draft = false)
        OR (visibility = 'mutuals' AND is_draft = false AND public.are_mutuals(auth.uid(), user_id))
      )
    )
  );

-- round_holes: same
DROP POLICY "round_holes_read_via_round" ON round_holes;

CREATE POLICY "round_holes_read_via_round"
  ON round_holes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rounds r
      WHERE r.id = round_holes.round_id
        AND (
          r.user_id = auth.uid()
          OR (
            NOT public.is_blocked(auth.uid(), r.user_id)
            AND (
              (r.visibility = 'public'  AND r.is_draft = false)
              OR (r.visibility = 'mutuals' AND r.is_draft = false AND public.are_mutuals(auth.uid(), r.user_id))
            )
          )
        )
    )
  );
```

- [ ] **Step 1.2: Push the migration**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  npm run db:push
  ```

- [ ] **Step 1.3: Regenerate types**

  ```bash
  npm run db:types
  ```
  Confirm `lib/database.types.ts` now has rows for `likes`, `comments`, `blocks`, `reports`, and a Functions entry for `is_blocked`.

- [ ] **Step 1.4: Typecheck**

  ```bash
  npx tsc --noEmit
  ```

- [ ] **Step 1.5: Commit**

  ```bash
  git add supabase/migrations/20260504000001_phase3b_likes_comments_blocks_reports.sql lib/database.types.ts
  git commit -m "feat(db): add likes/comments/blocks/reports + is_blocked RLS plumbing"
  ```

---

## Task 2: Likes — query module + LikeButton component

**Files:**
- Create: `lib/queries/likes.ts`
- Create: `components/LikeButton.tsx`

- [ ] **Step 2.1: Create `lib/queries/likes.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export function useLikeCount(roundId: string | undefined) {
  return useQuery({
    queryKey: ['like_count', roundId],
    queryFn: async () => {
      if (!roundId) return 0;
      const { count, error } = await supabase
        .from('likes')
        .select('user_id', { count: 'exact', head: true })
        .eq('round_id', roundId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!roundId,
  });
}

export function useHasLiked(viewerId: string | undefined, roundId: string | undefined) {
  return useQuery({
    queryKey: ['has_liked', viewerId, roundId],
    queryFn: async () => {
      if (!viewerId || !roundId) return false;
      const { count, error } = await supabase
        .from('likes')
        .select('user_id', { count: 'exact', head: true })
        .eq('user_id', viewerId)
        .eq('round_id', roundId);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    enabled: !!viewerId && !!roundId,
  });
}

export function useLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roundId: string }) => {
      const { error } = await supabase
        .from('likes')
        .insert({ user_id: input.userId, round_id: input.roundId });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.setQueryData(['has_liked', vars.userId, vars.roundId], true);
      qc.invalidateQueries({ queryKey: ['like_count', vars.roundId] });
    },
  });
}

export function useUnlike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roundId: string }) => {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', input.userId)
        .eq('round_id', input.roundId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.setQueryData(['has_liked', vars.userId, vars.roundId], false);
      qc.invalidateQueries({ queryKey: ['like_count', vars.roundId] });
    },
  });
}
```

- [ ] **Step 2.2: Create `components/LikeButton.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';

import { useHasLiked, useLikeCount, useLike, useUnlike } from '@/lib/queries/likes';

type Props = { viewerId: string; roundId: string };

export function LikeButton({ viewerId, roundId }: Props) {
  const hasLikedQ = useHasLiked(viewerId, roundId);
  const countQ = useLikeCount(roundId);
  const like = useLike();
  const unlike = useUnlike();

  const liked = hasLikedQ.data ?? false;
  const count = countQ.data ?? 0;
  const busy = like.isPending || unlike.isPending;

  return (
    <Pressable
      disabled={busy}
      onPress={() => {
        if (liked) unlike.mutate({ userId: viewerId, roundId });
        else like.mutate({ userId: viewerId, roundId });
      }}
      className={`flex-row items-center px-3 py-2 rounded-full ${busy ? 'opacity-50' : 'active:opacity-70'}`}
    >
      <Text className="text-lg">{liked ? '❤️' : '🤍'}</Text>
      <Text className="text-text-primary text-sm font-semibold ml-2">{count}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2.3: Typecheck + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/queries/likes.ts components/LikeButton.tsx
git commit -m "feat(likes): add like queries and LikeButton component"
```

---

## Task 3: Comments — query module + CommentList + CommentInput

**Files:**
- Create: `lib/queries/comments.ts`
- Create: `components/CommentList.tsx`
- Create: `components/CommentInput.tsx`

- [ ] **Step 3.1: Create `lib/queries/comments.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase, type Tables } from '@/lib/supabase';

export type CommentWithAuthor = Tables<'comments'> & {
  profiles: Pick<Tables<'profiles'>, 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export function useComments(roundId: string | undefined) {
  return useQuery({
    queryKey: ['comments', roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles!comments_user_id_fkey ( id, username, display_name, avatar_url )
          `,
        )
        .eq('round_id', roundId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommentWithAuthor[];
    },
    enabled: !!roundId,
  });
}

export function usePostComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { userId: string; roundId: string; body: string }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: input.userId,
          round_id: input.roundId,
          body: input.body.trim(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.roundId] });
    },
  });
}
```

> If the FK alias `comments!comments_user_id_fkey` confuses Supabase (auto-generated names sometimes differ), fall back to the shorthand `profiles ( id, username, display_name, avatar_url )`.

- [ ] **Step 3.2: Create `components/CommentList.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { format } from 'date-fns';

import type { CommentWithAuthor } from '@/lib/queries/comments';

type Props = { comments: CommentWithAuthor[] };

export function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return <Text className="text-text-secondary text-sm py-2">No comments yet.</Text>;
  }
  return (
    <View>
      {comments.map((c) => (
        <View key={c.id} className="py-3 border-b border-border-subtle">
          <Pressable
            onPress={() =>
              c.profiles?.username
                ? router.push({ pathname: '/profile/[username]', params: { username: c.profiles.username } })
                : null
            }
            className="active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-7 h-7 rounded-full bg-bg-surface border border-border-subtle items-center justify-center">
                <Text className="text-text-secondary text-xs font-semibold">
                  {(c.profiles?.display_name ?? '?').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-text-primary text-sm font-semibold ml-2">
                {c.profiles?.display_name ?? 'Unknown'}
              </Text>
              <Text className="text-text-secondary text-xs ml-2">
                {format(new Date(c.created_at), 'MMM d')}
              </Text>
            </View>
          </Pressable>
          <Text className="text-text-primary text-sm mt-1 leading-5">{c.body}</Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 3.3: Create `components/CommentInput.tsx`**

```tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';

import { usePostComment } from '@/lib/queries/comments';

type Props = { viewerId: string; roundId: string };

export function CommentInput({ viewerId, roundId }: Props) {
  const [body, setBody] = useState('');
  const post = usePostComment();
  const trimmed = body.trim();
  const canSend = trimmed.length > 0 && !post.isPending;

  const onSend = () => {
    if (!canSend) return;
    post.mutate(
      { userId: viewerId, roundId, body: trimmed },
      { onSuccess: () => setBody('') },
    );
  };

  return (
    <View className="flex-row items-center mt-3">
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder="Add a comment…"
        placeholderTextColor="#4a5a52"
        multiline
        maxLength={500}
        className="flex-1 bg-bg-surface border border-border-subtle rounded-2xl px-4 py-3 text-text-primary text-sm"
      />
      <Pressable
        disabled={!canSend}
        onPress={onSend}
        className={`ml-2 px-4 py-3 rounded-full ${canSend ? 'bg-accent active:opacity-70' : 'bg-bg-surface opacity-50'}`}
      >
        {post.isPending ? (
          <ActivityIndicator size="small" color="#08100c" />
        ) : (
          <Text className={`text-sm font-semibold ${canSend ? 'text-bg-base' : 'text-text-secondary'}`}>
            Send
          </Text>
        )}
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 3.4: Typecheck + lint + commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/queries/comments.ts components/CommentList.tsx components/CommentInput.tsx
git commit -m "feat(comments): add comment queries, list, and input"
```

---

## Task 4: Wire Likes + Comments into the round detail screen

**Files:**
- Modify: `app/(app)/round/[id].tsx`

Below the existing hole grid, add:
- A row containing `<LikeButton viewerId={...} roundId={round.id} />` and a comment count
- The comments list (above the input)
- The comment input pinned below the list

Both like/comment writes are gated by RLS (you can only act on rounds you can read).

- [ ] **Step 4.1: Read the file** so you know exactly where the existing JSX ends.

  ```bash
  cat "app/(app)/round/[id].tsx"
  ```

- [ ] **Step 4.2: Add the imports**

  At the top of the file, alongside existing imports:

  ```tsx
  import { LikeButton } from '@/components/LikeButton';
  import { CommentList } from '@/components/CommentList';
  import { CommentInput } from '@/components/CommentInput';
  import { useComments } from '@/lib/queries/comments';
  ```

- [ ] **Step 4.3: Add the hook call**

  After the existing data hooks (where `round` and `session` are available):

  ```tsx
  const commentsQ = useComments(round?.id);
  const comments = commentsQ.data ?? [];
  const viewerId = session?.user.id;
  ```

- [ ] **Step 4.4: Render the interactions block**

  After the existing hole grid JSX and before the closing container, insert:

  ```tsx
  {viewerId && round ? (
    <View className="mt-6">
      <View className="flex-row items-center">
        <LikeButton viewerId={viewerId} roundId={round.id} />
        <Text className="text-text-secondary text-sm ml-4">💬 {comments.length}</Text>
      </View>

      <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-4 mb-1">
        Comments
      </Text>
      <CommentList comments={comments} />

      <CommentInput viewerId={viewerId} roundId={round.id} />
    </View>
  ) : null}
  ```

  Make sure `View` and `Text` are already imported from `react-native`.

- [ ] **Step 4.5: Typecheck + lint + run on phone + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  ```

  Expo Go check on phone (with two mutual accounts):
  - Open a mutual's round → heart toggles, count updates
  - Type a comment, tap Send → comment appears immediately
  - Switch accounts → comment is visible

  Commit:

  ```bash
  git add "app/(app)/round/[id].tsx"
  git commit -m "feat(round): wire likes and comments into round detail"
  ```

---

## Task 5: Followers / Following list screens + tappable counts

**Files:**
- Modify: `lib/queries/follows.ts` (add list hooks)
- Modify: `components/UserListItem.tsx` (optional "Follow back" hint)
- Create: `app/(app)/relations/_layout.tsx`
- Create: `app/(app)/relations/[username]/followers.tsx`
- Create: `app/(app)/relations/[username]/following.tsx`
- Modify: `app/(app)/profile/[username].tsx` (tappable counts)
- Modify: `app/(app)/(tabs)/profile.tsx` (tappable counts)

- [ ] **Step 5.1: Add `useFollowersList` + `useFollowingList` to `lib/queries/follows.ts`**

  Append these to the END of the existing `lib/queries/follows.ts` (do not remove or modify existing exports):

  ```ts
  import { type Tables } from '@/lib/supabase';

  export type RelationUser = Pick<
    Tables<'profiles'>,
    'id' | 'username' | 'display_name' | 'avatar_url' | 'bio' | 'home_course_id'
  >;

  export function useFollowersList(userId: string | undefined) {
    return useQuery({
      queryKey: ['followers_list', userId],
      queryFn: async () => {
        if (!userId) return [];
        const { data, error } = await supabase
          .from('follows')
          .select('profiles!follows_follower_id_fkey ( id, username, display_name, avatar_url, bio, home_course_id )')
          .eq('following_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? [])
          .map((row) => (row as { profiles: RelationUser | null }).profiles)
          .filter((p): p is RelationUser => p !== null);
      },
      enabled: !!userId,
    });
  }

  export function useFollowingList(userId: string | undefined) {
    return useQuery({
      queryKey: ['following_list', userId],
      queryFn: async () => {
        if (!userId) return [];
        const { data, error } = await supabase
          .from('follows')
          .select('profiles!follows_following_id_fkey ( id, username, display_name, avatar_url, bio, home_course_id )')
          .eq('follower_id', userId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? [])
          .map((row) => (row as { profiles: RelationUser | null }).profiles)
          .filter((p): p is RelationUser => p !== null);
      },
      enabled: !!userId,
    });
  }
  ```

  > If the FK aliases `follows_follower_id_fkey` / `follows_following_id_fkey` are wrong, grep `lib/database.types.ts` for the actual relationship names and substitute. Both joins involve the same `profiles` table, so the explicit FK alias is REQUIRED — Supabase can't infer.

- [ ] **Step 5.2: Modify `components/UserListItem.tsx` to optionally show "Follow back" hint**

  Replace the file with:

  ```tsx
  import { Pressable, Text, View } from 'react-native';
  import { router } from 'expo-router';

  import { FollowButton } from './FollowButton';
  import type { PublicProfile } from '@/lib/queries/users';
  import { useIsFollowing } from '@/lib/queries/follows';

  type Props = {
    user: PublicProfile;
    viewerId: string;
    /** When true, show a "Follow back" pill instead of plain Follow when applicable */
    followBackHint?: boolean;
  };

  export function UserListItem({ user, viewerId, followBackHint = false }: Props) {
    const isFollowingQ = useIsFollowing(viewerId, user.id);
    const isFollowing = isFollowingQ.data ?? false;
    const showFollowBack = followBackHint && !isFollowing && viewerId !== user.id;

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
          {showFollowBack ? (
            <Text className="text-accent text-[10px] uppercase tracking-wider mt-0.5">Follows you</Text>
          ) : null}
        </View>
        <FollowButton viewerId={viewerId} targetId={user.id} size="sm" />
      </Pressable>
    );
  }
  ```

  This keeps the existing call sites working (the new prop is optional, defaulting to `false`). The "Follows you" tag is shown above the unchanged Follow button when the viewer hasn't reciprocated.

- [ ] **Step 5.3: Create `app/(app)/relations/_layout.tsx`**

  ```tsx
  import { Stack } from 'expo-router';

  export default function RelationsLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
  }
  ```

- [ ] **Step 5.4: Create `app/(app)/relations/[username]/followers.tsx`**

  ```tsx
  import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
  import { router, useLocalSearchParams } from 'expo-router';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { UserListItem } from '@/components/UserListItem';
  import { useSession } from '@/lib/hooks/useSession';
  import { useProfileByUsername } from '@/lib/queries/users';
  import { useFollowersList } from '@/lib/queries/follows';

  export default function Followers() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const { session } = useSession();
    const viewerId = session?.user.id;

    const profileQ = useProfileByUsername(username);
    const listQ = useFollowersList(profileQ.data?.id);

    const isViewerOwnList = !!viewerId && profileQ.data?.id === viewerId;

    return (
      <ScreenContainer>
        <Pressable onPress={() => router.back()} className="mt-6 active:opacity-70">
          <Text className="text-accent text-sm">← Back</Text>
        </Pressable>
        <Text className="text-text-primary text-3xl font-light mt-4">Followers</Text>

        {profileQ.isLoading || listQ.isLoading ? (
          <ActivityIndicator className="mt-6" />
        ) : (listQ.data ?? []).length === 0 ? (
          <Text className="text-text-secondary text-sm mt-4">No followers yet.</Text>
        ) : (
          <FlatList
            data={listQ.data ?? []}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) =>
              viewerId ? (
                <UserListItem user={item} viewerId={viewerId} followBackHint={isViewerOwnList} />
              ) : null
            }
          />
        )}
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 5.5: Create `app/(app)/relations/[username]/following.tsx`**

  ```tsx
  import { ActivityIndicator, FlatList, Pressable, Text } from 'react-native';
  import { router, useLocalSearchParams } from 'expo-router';

  import { ScreenContainer } from '@/components/ScreenContainer';
  import { UserListItem } from '@/components/UserListItem';
  import { useSession } from '@/lib/hooks/useSession';
  import { useProfileByUsername } from '@/lib/queries/users';
  import { useFollowingList } from '@/lib/queries/follows';

  export default function Following() {
    const { username } = useLocalSearchParams<{ username: string }>();
    const { session } = useSession();
    const viewerId = session?.user.id;

    const profileQ = useProfileByUsername(username);
    const listQ = useFollowingList(profileQ.data?.id);

    return (
      <ScreenContainer>
        <Pressable onPress={() => router.back()} className="mt-6 active:opacity-70">
          <Text className="text-accent text-sm">← Back</Text>
        </Pressable>
        <Text className="text-text-primary text-3xl font-light mt-4">Following</Text>

        {profileQ.isLoading || listQ.isLoading ? (
          <ActivityIndicator className="mt-6" />
        ) : (listQ.data ?? []).length === 0 ? (
          <Text className="text-text-secondary text-sm mt-4">Not following anyone yet.</Text>
        ) : (
          <FlatList
            data={listQ.data ?? []}
            keyExtractor={(u) => u.id}
            renderItem={({ item }) =>
              viewerId ? <UserListItem user={item} viewerId={viewerId} /> : null
            }
          />
        )}
      </ScreenContainer>
    );
  }
  ```

- [ ] **Step 5.6: Make the Stat row tappable on `app/(app)/profile/[username].tsx`**

  In `app/(app)/profile/[username].tsx`, find the existing block:

  ```tsx
  <View className="flex-row mt-6 py-4 border-y border-border-subtle">
    <Stat label="Rounds" value={roundsCountQ.data ?? 0} />
    <Stat label="Followers" value={followersQ.data ?? 0} />
    <Stat label="Following" value={followingQ.data ?? 0} />
  </View>
  ```

  Replace with:

  ```tsx
  <View className="flex-row mt-6 py-4 border-y border-border-subtle">
    <Stat label="Rounds" value={roundsCountQ.data ?? 0} />
    <Pressable
      onPress={() =>
        router.push({ pathname: '/relations/[username]/followers', params: { username: profile.username } })
      }
      className="flex-1 active:opacity-70"
    >
      <Stat label="Followers" value={followersQ.data ?? 0} />
    </Pressable>
    <Pressable
      onPress={() =>
        router.push({ pathname: '/relations/[username]/following', params: { username: profile.username } })
      }
      className="flex-1 active:opacity-70"
    >
      <Stat label="Following" value={followingQ.data ?? 0} />
    </Pressable>
  </View>
  ```

  And update the `Stat` helper to remove its outer `flex-1` since the parent `Pressable` now provides it. Find:

  ```tsx
  function Stat({ label, value }: { label: string; value: number }) {
    return (
      <View className="flex-1">
        ...
      </View>
    );
  }
  ```

  Replace with:

  ```tsx
  function Stat({ label, value }: { label: string; value: number }) {
    return (
      <View className="flex-1">
        <Text className="text-text-primary text-xl font-light">{value}</Text>
        <Text className="text-text-secondary text-[10px] uppercase tracking-wider mt-1">{label}</Text>
      </View>
    );
  }
  ```

  > Note: the inner View keeps `flex-1` because `Rounds` (the first stat) has no Pressable wrapper.

- [ ] **Step 5.7: Make the Stat row tappable on `app/(app)/(tabs)/profile.tsx` (your own profile)**

  Find the equivalent stat row in `app/(app)/(tabs)/profile.tsx`. It probably uses `useMyProfile` to get the profile and shows similar count cells. Apply the same Pressable wrap with `params: { username: profile.username }`. If the file doesn't currently surface follower / following counts, add them — using `useFollowerCount(viewerId)` + `useFollowingCount(viewerId)` from `@/lib/queries/follows`.

  Read the file first to figure out the exact insertion point. Match the styling of the other-user profile screen.

- [ ] **Step 5.8: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add lib/queries/follows.ts components/UserListItem.tsx app/\(app\)/relations app/\(app\)/profile/\[username\].tsx app/\(app\)/\(tabs\)/profile.tsx
  git commit -m "feat(relations): tappable followers/following lists with follow-back hint"
  ```

---

## Task 6: New-followers red dot on the Profile tab

**Files:**
- Modify: `app/(app)/(tabs)/_layout.tsx`
- Create: `lib/queries/newFollowers.ts`

The hint shows a small dot on the Profile tab icon when the viewer has at least one follower they don't follow back.

- [ ] **Step 6.1: Create `lib/queries/newFollowers.ts`**

  ```ts
  import { useQuery } from '@tanstack/react-query';

  import { supabase } from '@/lib/supabase';

  /**
   * Returns the count of users who follow `userId` but whom `userId` doesn't follow back.
   * Used by the Profile tab to show a "follow-back" hint dot.
   */
  export function useNewFollowersCount(userId: string | undefined) {
    return useQuery({
      queryKey: ['new_followers_count', userId],
      queryFn: async () => {
        if (!userId) return 0;
        const [followersRes, followingRes] = await Promise.all([
          supabase.from('follows').select('follower_id').eq('following_id', userId),
          supabase.from('follows').select('following_id').eq('follower_id', userId),
        ]);
        if (followersRes.error) throw followersRes.error;
        if (followingRes.error) throw followingRes.error;
        const following = new Set((followingRes.data ?? []).map((r) => r.following_id));
        const newOnes = (followersRes.data ?? []).filter((r) => !following.has(r.follower_id));
        return newOnes.length;
      },
      enabled: !!userId,
      // refetch every 30s while the tab bar is mounted, plus on window focus.
      refetchInterval: 30_000,
    });
  }
  ```

- [ ] **Step 6.2: Read the current tab bar config**

  ```bash
  cat "app/(app)/(tabs)/_layout.tsx"
  ```

  You'll see Tab options for `index`, `discover`, `start`, `profile`. We're adding a small red dot to the `profile` tab when the count > 0.

- [ ] **Step 6.3: Add a tab badge or dot via `tabBarBadge`**

  In `app/(app)/(tabs)/_layout.tsx`, import:

  ```tsx
  import { useSession } from '@/lib/hooks/useSession';
  import { useNewFollowersCount } from '@/lib/queries/newFollowers';
  ```

  Inside the component, before the `<Tabs>` JSX:

  ```tsx
  const { session } = useSession();
  const newFollowersQ = useNewFollowersCount(session?.user.id);
  const showDot = (newFollowersQ.data ?? 0) > 0;
  ```

  Then on the `profile` `<Tabs.Screen>`, set the tab options to include the badge dot. Expo Router exposes `tabBarBadge` via `options` (or `screenOptions` per-screen). Use:

  ```tsx
  <Tabs.Screen
    name="profile"
    options={{
      title: 'Profile',
      tabBarBadge: showDot ? '•' : undefined,
      tabBarBadgeStyle: { backgroundColor: '#4ade80', color: '#08100c' },
      // ...keep any existing icon prop intact
    }}
  />
  ```

  > If the file uses a render-prop style for `screenOptions`, adapt accordingly. Don't change other tabs.

- [ ] **Step 6.4: Typecheck + lint + commit**

  ```bash
  npx tsc --noEmit && npm run lint
  git add lib/queries/newFollowers.ts app/\(app\)/\(tabs\)/_layout.tsx
  git commit -m "feat(profile): show new-followers hint dot on Profile tab"
  ```

---

## Task 7: Block — query module + UI surface on profile

**Files:**
- Create: `lib/queries/blocks.ts`
- Modify: `app/(app)/profile/[username].tsx` (••• menu with Block)

- [ ] **Step 7.1: Create `lib/queries/blocks.ts`**

  ```ts
  import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

  import { supabase } from '@/lib/supabase';

  export function useIsBlocked(viewerId: string | undefined, targetId: string | undefined) {
    return useQuery({
      queryKey: ['is_blocked', viewerId, targetId],
      queryFn: async () => {
        if (!viewerId || !targetId) return false;
        const { count, error } = await supabase
          .from('blocks')
          .select('blocker_id', { count: 'exact', head: true })
          .eq('blocker_id', viewerId)
          .eq('blocked_id', targetId);
        if (error) throw error;
        return (count ?? 0) > 0;
      },
      enabled: !!viewerId && !!targetId,
    });
  }

  export function useBlock() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { blockerId: string; blockedId: string }) => {
        const { error } = await supabase
          .from('blocks')
          .insert({ blocker_id: input.blockerId, blocked_id: input.blockedId });
        if (error) throw error;
      },
      onSuccess: (_d, vars) => {
        qc.invalidateQueries({ queryKey: ['is_blocked', vars.blockerId, vars.blockedId] });
        qc.invalidateQueries({ queryKey: ['feed', vars.blockerId] });
        qc.invalidateQueries({ queryKey: ['profile_by_username'] });
        qc.invalidateQueries({ queryKey: ['followers_list'] });
        qc.invalidateQueries({ queryKey: ['following_list'] });
      },
    });
  }

  export function useUnblock() {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { blockerId: string; blockedId: string }) => {
        const { error } = await supabase
          .from('blocks')
          .delete()
          .eq('blocker_id', input.blockerId)
          .eq('blocked_id', input.blockedId);
        if (error) throw error;
      },
      onSuccess: (_d, vars) => {
        qc.invalidateQueries({ queryKey: ['is_blocked', vars.blockerId, vars.blockedId] });
        qc.invalidateQueries({ queryKey: ['feed', vars.blockerId] });
      },
    });
  }
  ```

- [ ] **Step 7.2: Add ••• menu to `app/(app)/profile/[username].tsx`**

  In the profile header row (next to the FollowButton), add a "•••" Pressable that, when tapped, opens an `Alert` with options. RN's `Alert.alert` is the simplest cross-platform action sheet substitute and matches existing patterns.

  Add imports:

  ```tsx
  import { Alert } from 'react-native';
  import { useBlock, useUnblock, useIsBlocked } from '@/lib/queries/blocks';
  ```

  In the component body (after the existing query hooks):

  ```tsx
  const isBlockedQ = useIsBlocked(viewerId, profile?.id);
  const block = useBlock();
  const unblock = useUnblock();

  const onTapMore = () => {
    if (!viewerId || !profile) return;
    const blocked = isBlockedQ.data ?? false;
    Alert.alert('Options', `@${profile.username}`, [
      blocked
        ? {
            text: 'Unblock',
            onPress: () => unblock.mutate({ blockerId: viewerId, blockedId: profile.id }),
          }
        : {
            text: 'Block',
            style: 'destructive',
            onPress: () =>
              Alert.alert('Block this user?', 'They won\'t be able to see your profile or rounds. You won\'t see theirs.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => block.mutate({ blockerId: viewerId, blockedId: profile.id }),
                },
              ]),
          },
      { text: 'Report', onPress: () => openReportSheet({ targetType: 'profile', targetId: profile.id }) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  ```

  And in the header row JSX, add a •••  button next to FollowButton:

  ```tsx
  {viewerId ? <FollowButton viewerId={viewerId} targetId={profile.id} /> : null}
  {viewerId ? (
    <Pressable onPress={onTapMore} className="ml-2 p-2 active:opacity-70">
      <Text className="text-text-secondary text-base">•••</Text>
    </Pressable>
  ) : null}
  ```

  > `openReportSheet` is wired up in Task 8. For now, leave `openReportSheet` referenced — Task 8 will define it via `useReportSheet()` or a similar mechanism. If you want the file to typecheck right now without Task 8 in place, stub `openReportSheet` as a `useCallback` that calls a `setReportTarget` state hook in this same component — Task 8 will then read that state. Or land Task 7 + Task 8 together. Recommended: **bundle Tasks 7 and 8**.

- [ ] **Step 7.3: Bundle commit (with Task 8 below)**

  Skip a separate commit — bundle with Task 8.

---

## Task 8: Report — query module + ReportSheet + wire-up

**Files:**
- Create: `lib/queries/reports.ts`
- Create: `components/ReportSheet.tsx`
- Modify: `app/(app)/profile/[username].tsx` (open report sheet from ••• menu)
- Modify: `app/(app)/round/[id].tsx` (••• menu with Report)

- [ ] **Step 8.1: Create `lib/queries/reports.ts`**

  ```ts
  import { useMutation } from '@tanstack/react-query';

  import { supabase } from '@/lib/supabase';

  export type ReportTargetType = 'round' | 'profile' | 'comment';
  export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other';

  export function useSubmitReport() {
    return useMutation({
      mutationFn: async (input: {
        reporterId: string;
        targetType: ReportTargetType;
        targetId: string;
        reason: ReportReason;
        details?: string;
      }) => {
        const { error } = await supabase.from('reports').insert({
          reporter_id: input.reporterId,
          target_type: input.targetType,
          target_id: input.targetId,
          reason: input.reason,
          details: input.details ?? null,
        });
        if (error) throw error;
      },
    });
  }
  ```

- [ ] **Step 8.2: Create `components/ReportSheet.tsx`**

  ```tsx
  import { useState } from 'react';
  import { Modal, Pressable, Text, View, TextInput, ActivityIndicator, Alert } from 'react-native';

  import {
    useSubmitReport,
    type ReportReason,
    type ReportTargetType,
  } from '@/lib/queries/reports';

  type Props = {
    visible: boolean;
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    onClose: () => void;
  };

  const REASONS: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other', label: 'Other' },
  ];

  export function ReportSheet({ visible, reporterId, targetType, targetId, onClose }: Props) {
    const [reason, setReason] = useState<ReportReason | null>(null);
    const [details, setDetails] = useState('');
    const submit = useSubmitReport();

    const onSubmit = () => {
      if (!reason) return;
      submit.mutate(
        {
          reporterId,
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
        },
        {
          onSuccess: () => {
            Alert.alert('Thanks', 'Your report has been submitted.');
            setReason(null);
            setDetails('');
            onClose();
          },
          onError: (err) => Alert.alert('Could not submit', err.message),
        },
      );
    };

    return (
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-bg-base border-t border-border-subtle rounded-t-3xl p-6 pb-10">
            <Text className="text-text-primary text-2xl font-light">Report</Text>
            <Text className="text-text-secondary text-sm mt-1">Why are you reporting this?</Text>

            <View className="mt-4">
              {REASONS.map((r) => {
                const selected = reason === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setReason(r.value)}
                    className={`flex-row items-center py-3 px-4 mb-2 rounded-2xl border ${
                      selected ? 'border-accent bg-accent/10' : 'border-border-subtle'
                    } active:opacity-70`}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border ${selected ? 'border-accent bg-accent' : 'border-border-subtle'}`}
                    />
                    <Text className="text-text-primary text-sm ml-3">{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Additional details (optional)"
              placeholderTextColor="#4a5a52"
              multiline
              maxLength={500}
              className="bg-bg-surface border border-border-subtle rounded-2xl px-4 py-3 mt-2 text-text-primary text-sm min-h-[80px]"
            />

            <View className="flex-row mt-4">
              <Pressable
                onPress={onClose}
                className="flex-1 py-3 rounded-full border border-border-subtle mr-2 active:opacity-70"
              >
                <Text className="text-text-primary text-sm font-semibold text-center">Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!reason || submit.isPending}
                onPress={onSubmit}
                className={`flex-1 py-3 rounded-full ${reason && !submit.isPending ? 'bg-accent active:opacity-70' : 'bg-bg-surface opacity-50'}`}
              >
                {submit.isPending ? (
                  <ActivityIndicator size="small" color="#08100c" />
                ) : (
                  <Text
                    className={`text-sm font-semibold text-center ${reason ? 'text-bg-base' : 'text-text-secondary'}`}
                  >
                    Submit
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
  ```

- [ ] **Step 8.3: Wire ReportSheet into the profile screen**

  In `app/(app)/profile/[username].tsx`, add state and the modal:

  ```tsx
  import { ReportSheet } from '@/components/ReportSheet';
  import type { ReportTargetType } from '@/lib/queries/reports';

  // inside the component:
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);

  const openReportSheet = (input: { targetType: ReportTargetType; targetId: string }) => {
    setReportTarget({ type: input.targetType, id: input.targetId });
  };
  ```

  Update the menu's Report option to call `openReportSheet({ targetType: 'profile', targetId: profile.id })` (already wired in Task 7's Step 7.2).

  Render the modal (anywhere in the JSX returned by the component):

  ```tsx
  {viewerId && reportTarget ? (
    <ReportSheet
      visible
      reporterId={viewerId}
      targetType={reportTarget.type}
      targetId={reportTarget.id}
      onClose={() => setReportTarget(null)}
    />
  ) : null}
  ```

  Add `useState` to the imports if not already present.

- [ ] **Step 8.4: Add ••• menu + ReportSheet to `app/(app)/round/[id].tsx`**

  Wire the same pattern into round detail. Imports:

  ```tsx
  import { Alert } from 'react-native';
  import { useState } from 'react';
  import { ReportSheet } from '@/components/ReportSheet';
  import type { ReportTargetType } from '@/lib/queries/reports';
  ```

  Inside the component:

  ```tsx
  const [reportTarget, setReportTarget] = useState<{ type: ReportTargetType; id: string } | null>(null);

  const onTapMore = () => {
    if (!viewerId || !round) return;
    Alert.alert('Options', undefined, [
      {
        text: 'Report this round',
        onPress: () => setReportTarget({ type: 'round', id: round.id }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };
  ```

  Add a ••• Pressable next to the existing Back button (or in the header area) that calls `onTapMore`. Render the modal at the bottom of the JSX:

  ```tsx
  {viewerId && reportTarget ? (
    <ReportSheet
      visible
      reporterId={viewerId}
      targetType={reportTarget.type}
      targetId={reportTarget.id}
      onClose={() => setReportTarget(null)}
    />
  ) : null}
  ```

- [ ] **Step 8.5: Typecheck + lint + commit (bundles Tasks 7 + 8)**

  ```bash
  npx tsc --noEmit && npm run lint
  git add lib/queries/blocks.ts lib/queries/reports.ts components/ReportSheet.tsx app/\(app\)/profile/\[username\].tsx app/\(app\)/round/\[id\].tsx
  git commit -m "feat(safety): block + report — menus on profile and round, modal sheet"
  ```

---

## Task 9: End-to-end phone test + tag

**Files:** none.

- [ ] **Step 9.1: Likes + comments**

  Two mutual accounts. Open a mutual's round.
  - Tap heart → fills + count 0→1. Tap again → 1→0.
  - Type "nice round" → Send. Comment appears with your name.
  - Switch accounts. Comment still visible. Reply with a different account's comment.

- [ ] **Step 9.2: Followers / following lists + follow-back hint**

  Sign in to the second account. From their profile, follow your primary account (already done from 3a). Sign back in to primary.
  - Profile tab shows a green dot.
  - Tap Profile → tap "Followers" → see the second account with an "Follows you" hint and a Follow button.
  - Tap Follow → hint disappears, dot disappears.
  - Tap "Following" → see the second account.

- [ ] **Step 9.3: Block**

  From a mutual's profile, ••• → Block → Confirm.
  - Their round disappears from your feed (cold reload may be needed).
  - Their profile is no longer searchable in Discover.
  - Sign in as them: your profile is no longer searchable from theirs either; your rounds vanish from their feed.
  - From your profile of them, ••• → Unblock → everything restores.

- [ ] **Step 9.4: Report**

  ••• → Report on a profile and on a round.
  - Reason picker works, Submit shows confirmation.
  - In the Supabase dashboard SQL editor, verify rows in `reports`:
    ```sql
    SELECT id, target_type, target_id, reason, status, created_at
    FROM reports
    ORDER BY created_at DESC
    LIMIT 10;
    ```

- [ ] **Step 9.5: Tag phase-3b**

  ```bash
  cd "/Users/gavingillespie/Desktop/Golf App"
  git tag -a phase-3b -m "Phase 3b: likes + comments + relations + safety"
  git push origin main --tags
  ```

---

## Verification matrix

| Concern | Enforced by |
|---|---|
| You can't like/comment on a round you can't read | Likes/Comments INSERT policies inherit the same EXISTS-on-rounds gate as reads |
| Blocked users vanish from search, feed, profiles | `is_blocked()` baked into profiles SELECT, follows SELECT, rounds SELECT |
| You can only block on your own behalf | `blocks_insert_own` — `blocker_id = auth.uid()` |
| Report creator only — you can't read others' reports | `reports_read_own` — `reporter_id = auth.uid()` |
| Comments aren't editable after post | No UPDATE policy on `comments` (and no UI for it) |
| Comments are at most 500 chars | Table CHECK + TextInput maxLength + RLS enforces table CHECK |
| Tab dot reflects fresh state | `useNewFollowersCount` `refetchInterval: 30_000` plus cache invalidation on follow/unfollow |

## Spec-vs-plan deltas

- **Contacts invite deferred to Phase 4.** The original spec put hashed contacts invite in Phase 3. Moving to Phase 4 alongside the onboarding/compliance work.
- **No comment edits, no comment delete UI.** Spec is silent on this; we keep the data model minimal. RLS allows owner-delete; UI can be added later if testers ask.
- **Action sheet is `Alert.alert` rather than a native iOS `ActionSheet`.** Avoids pulling in another library. If feel feedback is poor, swap to `@react-native-action-sheet` later.
