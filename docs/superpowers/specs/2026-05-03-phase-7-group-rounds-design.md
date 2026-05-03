# Phase 7 — Group Rounds (Level C real-time multiplayer) Design

**Status:** approved 2026-05-03

**Goal:** Real-time multiplayer group rounds where each player updates their own scores during play. Round is shared on every participant's feed. ~4 weeks, ~12 tasks.

## Locked product decisions

| # | Decision |
|---|---|
| 1 | Two invite paths: mutuals-only username search + 6-char join code (code is the non-mutual escape hatch) |
| 2 | Host opts in to live-visible vs private-until-done at round creation; default private |
| 3 | Hybrid finalization — each player marks their own slice done; host can force-end the whole round |
| 4 | Late join allowed anytime via code; username invites lock when host taps Start |
| 5 | Each player picks their own tee, defaulting to host's pick |
| 6 | One comment thread + one round-level like count per round (existing schema) |
| 7 | Feed visibility: round shows on every participant's mutuals' feeds and on each player's profile |
| 8 | Invite delivery: in-app only (bell icon + green-dot pattern). Push deferred to Phase 8 |
| 9 | Notes: per-player on `round_players.notes` |
| 10 | Leaving: anyone can withdraw anytime; partial scores retained flagged "withdrew"; host has no special leave power |

## Schema

### M1 — `rounds` extensions
```sql
ALTER TABLE rounds ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN live_visible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE rounds ADD COLUMN join_code TEXT UNIQUE;
ALTER TABLE rounds ADD COLUMN invites_locked_at TIMESTAMPTZ;
```
- `is_group=false` → behaves exactly like solo today (existing rounds untouched).
- `join_code`: 6-char alphanumeric, set only on group rounds, regenerable by host.
- `invites_locked_at`: set when host taps Start. Username invites cannot be created after this; code joins still work.

### M2 — `round_players` (NEW)
```sql
CREATE TABLE round_players (
  round_id     UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id),
  tee_box      TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('invited','joined','withdrawn','finished')),
  notes        TEXT CHECK (notes IS NULL OR length(notes) <= 500),
  joined_at    TIMESTAMPTZ,
  finished_at  TIMESTAMPTZ,
  invited_by   UUID REFERENCES profiles(id),
  PRIMARY KEY (round_id, user_id)
);
CREATE INDEX round_players_user_status_idx ON round_players(user_id, status);
```

### M3 — `round_holes.player_id`
```sql
ALTER TABLE round_holes ADD COLUMN player_id UUID REFERENCES profiles(id);
UPDATE round_holes rh SET player_id = r.user_id FROM rounds r WHERE rh.round_id = r.id;
ALTER TABLE round_holes ALTER COLUMN player_id SET NOT NULL;
ALTER TABLE round_holes DROP CONSTRAINT round_holes_round_id_hole_number_key;  -- existing unique
ALTER TABLE round_holes ADD CONSTRAINT round_holes_unique_player_hole UNIQUE (round_id, player_id, hole_number);
```

### M4 — RLS expansion
New helpers:
- `is_in_round(round UUID, viewer UUID)` — true if viewer has `round_players` row with status IN ('joined','finished') for that round.
- `is_mutual_of_any_round_player(round UUID, viewer UUID)` — true if viewer is mutual with any joined/finished player.

Updated policies:
- `rounds.SELECT`: own OR mutual-of-host OR `is_in_round(id, auth.uid())` OR `is_mutual_of_any_round_player(id, auth.uid())`.
- `round_players.SELECT`: same membership-or-mutual rule.
- `round_players.INSERT`: by self (`auth.uid() = user_id`) when invited via username, OR by host (existing host can create invited rows for any mutual), OR by self via code (RPC `redeem_join_code`).
- `round_players.UPDATE`: only the player can change their own status/notes; host additionally can set everyone to `finished` (force-end RPC).
- `round_holes.SELECT` inherits from rounds.
- `round_holes.INSERT/UPDATE`: only `auth.uid() = player_id`.

Block list still applies — `is_blocked` short-circuits all visibility helpers as today.

### Backwards-compat
Solo rounds (existing + future with `is_group=false`) get one `round_players` row auto-inserted on create (host as sole player, status='joined', tee = round.tee_box). All scoring code uses `(round_id, player_id, hole_number)` uniformly.

## Realtime
- Supabase Realtime channel: `round:<round_id>` listening to `round_players` and `round_holes` row changes scoped by round_id.
- Each client merges into TanStack Query cache via `setQueryData` (race-safe pattern from existing `useUpsertHoleScore`).
- Subscribed only while the score screen / lobby for that round is mounted.

## UI / Flows

### Entry point
The brass Play button (tab bar) currently routes straight to course picker. Now it shows a quick-pick sheet: **Solo · Group**. Solo = unchanged. Group = `/round/new/group-setup`.

### Host flow
1. **Setup** (`group-setup.tsx`) — pick course → pick tee → "Live visible to my friends?" toggle → tap Continue.
2. **Invite + Lobby** (`group/[id]/lobby.tsx`) — round_id created, join_code generated. Host sees:
   - Player tiles (host pre-joined)
   - "Invite a mutual" button → modal sheet with mutuals search → tap → row inserted with status='invited'
   - Join code displayed with Copy button
   - "Start round" button (only enabled when ≥2 joined or host alone confirms solo-as-group)
   - Cancel round (deletes round and all round_players)
3. Host taps Start → `invites_locked_at = now`, all invitees see lobby disappear unless they accept first via code.
4. **Score** (`group/[id]/score.tsx`) — same as existing score screen, plus a horizontal player-progress strip at top: each tile shows player name + current hole + thru-score. Updates via Realtime.
5. Host on hole 18 sees DONE button → status='finished'. If others still playing, round_players strip shows them mid-round.
6. Host can also tap "End round for everyone" from the strip overflow menu — RPC `force_end_round` sets all joined→finished.

### Player flow
1. **Pending invite surface** — new bell icon on top tab bar OR section in Discover. Pending count shown as green dot. Tap → `app/(app)/invites.tsx` → list of pending invites (host name + course + date) → Accept/Decline.
2. **Accept** → status='joined', joined_at=now. If round not yet started, lobby. If started, jump straight to score screen.
3. **Join via code** — Discover tab gets a "Join with code" entry. Modal asks for 6-char code → RPC `redeem_join_code(code)` returns round_id → router push to lobby/score.
4. **Score screen** — same as host's, minus Start/Cancel/Force-end controls.
5. **Withdraw** — accessible from score screen overflow menu. Sets status='withdrawn'. Player exits to home tab.

### Feed
- Group round produces ONE feed card. Card variant `GroupRoundCard`:
  - Topo backdrop (seeded from round_id)
  - Player tiles row: avatar + name + score + diff
  - "Played at <course>" + date
  - Per-player notes shown as italic quotes below their tile
  - Heart + comment row (round-level)
- `GroupRoundCard` appears on each participant's mutuals' feeds (RLS-driven; controller doesn't filter).
- If `live_visible=true` and round status is in-progress, card shows a small pulsing "LIVE" badge and live scores.

### Round detail
`app/(app)/round/[id].tsx` extended:
- If `is_group=false` → existing single-slice view.
- If `is_group=true` → render N player slices (each with HoleGrid + per-player notes). Comment thread + like remain round-level. Owner header replaced by "Group round at <course>".

## Hooks & RPCs

### Client hooks
- `useCreateGroupRound({course_id, tee_box, live_visible})` → returns round.
- `useGroupRound(roundId)` — fetches + subscribes to Realtime; returns `{round, players, holesByPlayer}`.
- `useInviteToRound(roundId)` — `(userId) => insert round_players (status=invited)`.
- `useJoinViaCode(code)` — calls `redeem_join_code` RPC.
- `useAcceptInvite(roundId)` / `useDeclineInvite(roundId)`.
- `useWithdrawFromRound(roundId)`.
- `useFinishMySlice(roundId)`.
- `useForceEndRound(roundId)` — host-only.
- `usePendingInvites(userId)` — count + list, refetched every 30s like new-followers count.

### Server RPCs
- `redeem_join_code(code TEXT)` — looks up round, checks not blocked, checks not already joined, inserts round_players (status='joined'), returns round_id. Allowed even after `invites_locked_at`.
- `force_end_round(round_id UUID)` — sets all status='joined' rows to 'finished' for that round. Only callable by host (`auth.uid() = rounds.user_id`).

## Verification (per phase-end test)
1. Two test accounts (mutuals). Host creates group round, invites Player B. Player B accepts. Host starts. Both score holes; each sees the other's scores live in the strip.
2. Code path: third device (non-mutual) enters code; appears in lobby/round.
3. Live visibility off: round invisible to outside mutuals until both finish; visible after.
4. Live visibility on: outside mutual sees the round in their feed with running scores during play.
5. Host force-ends round mid-play; both players' rounds become finalized; feed card appears for both.
6. Withdraw mid-round; round still completes for the other player; withdrawn player's slice shown as "WITHDREW" in detail.
7. Solo rounds (existing) still work end-to-end — no regression.

## Out of scope (defer)
- Push notifications (Phase 8)
- Multi-player photos (Phase 8)
- Spectator/non-player following a live round (Phase 9)
- Per-player skins / side bets (v2)
- Tournament brackets across multiple group rounds (v2)
