# Linksman — The Rivalry Ledger (design)

**Date:** 2026-09-07
**Supersedes:** the "social golf tracker" positioning of Phases 1–8
**Goal:** Reposition Linksman from a social round tracker into golf's persistent rivalry ledger, on top of the existing chassis. Ship to the App Store and Google Play.

---

## 1. Positioning

**Pitch:** Golf's running bet, made permanent.

Every round with the same people feeds a ledger that never resets — who's up, who's owed, who's been carrying a losing streak since March.

**The problem with the old positioning.** "Social feed + round tracking" is occupied by 18Birdies, TheGrint, Golf GameBook, Hole19 and SwingU. 18Birdies already ships skins, nassau and wolf, so "we have mini-games too" is not a wedge.

**The wedge.** Every real golf group has a running bet that lives in someone's Notes app and gets argued about in the parking lot. Nobody has built the ledger for it. It is social by construction, it compounds with every round, it is worthless to a solo user, and it makes the feed interesting because *standing* moved — not merely that a score was posted.

**Non-goals.** No currency. No wagering. No in-app settlement. No official USGA handicap claim.

---

## 2. Core concepts

| Concept | Definition |
|---|---|
| **Brass** | The ledger unit. Points only, never currency. Mass noun — "up 14 brass," never "14 brasses." Abbreviates to `BR`. Rendered in `palette.brass` (`#B8924A`), already the app's premium accent. |
| **Head-to-head ledger** | Automatic and zero-setup. Anyone you have played a group round with has a running brass total with you. This is what gives a new user value on round one. |
| **Circles** | Opt-in named groups ("The Saturday Game") with membership, standings, and seasons. The retention layer — you do not churn out of a league you are currently losing. |
| **Seasons** | A scoreboard with a start and an end, so the ledger pays off instead of drifting. "Three rounds left. You're six back." |
| **Games** | Formats that generate brass. Optional; a group round with no game selected behaves exactly as it does today. |
| **Challenges** | Lightweight per-hole props worth brass, resolved with one tap during scoring. |

### Why "brass"

`brass` is already the accent color for the Play button and the ◆ achievement diamond, and it is authentic British slang for money. The ledger's currency and the app's most valuable color become the same object. It reads as money while being provably not money — the correct posture for App Review.

---

## 3. Game formats (v1)

All free. All optional.

| Format | Brass mechanics |
|---|---|
| **Skins** | 1 brass per hole to the low net score; ties carry the hole forward |
| **Nassau** | 3 brass — front nine, back nine, total |
| **Match Play** | 1 brass for the match; hole-by-hole up/down, dormie handled |
| **Net Stroke** | 1 brass to the low net total |
| **Wolf** | 4 players only; rotating partner selection, variable brass |

### Side challenges

Toggled at setup, worth 1 brass each, resolved with a single tap during scoring.

**Closest to the Pin** (par 3s) · **Longest Drive** (designated hole) · **Sandy** (up-and-down from a bunker) · **Greenie** (GIR on a par 3) · **Barkie** (par after hitting a tree)

These are where the app gets its personality. A Barkie is a story, and stories get screenshotted.

---

## 4. Fairness — the Linksman Index

A ledger between a scratch player and a 22-handicap is not a rivalry; it is a scratch player farming a friend until that friend deletes the app. Handicaps are therefore mandatory, not optional.

**Definition.** For each of the player's most recent 20 rounds, a differential is `total_score - total_par` for that round, normalised to 18 holes. The index is the mean of the **best 8 of those 20** differentials, rounded to one decimal. Fewer than 5 rounds yields no index and the player is shown as unrated; between 5 and 19 rounds the best 40% (minimum 1) are used.

**Allocation.** In a game, each player receives `round(their_index - lowest_index_in_group)` strokes, distributed one per hole in ascending `stroke_index` order, wrapping for allocations above 18. Holes with no known stroke index are allocated last, in hole order.

**Explicitly not USGA.** The app states this in plain language wherever the index appears. Claiming an official Handicap Index without an allied golf association agreement is a legal problem, and we do not need one — allocation by stroke index is what actually makes skins and match play fair.

**No course rating or slope required.** This is what makes the free data path viable (§5).

---

## 5. Course data — OSM primary, verified

### Decision: OpenStreetMap only for v1. No commercial API.

An earlier draft of this plan assumed a commercial provider could be bulk-hydrated into our own tables for a one-time fee. **That assumption was wrong and is retracted.** Golf Intelligence's Terms of Use forbid it:

> "An A–Z catalog dump is not allowed on any plan." Device cache "is not a license to download the catalog, host a local copy of 'every course,' or stand up your own golf-data store."

Permitted use is a per-course cache on an end-user device for up to one year following a legitimate fetch for that user, plus a short-lived server working copy. That makes commercial data a **recurring, usage-scaling cost**, not a one-time purchase.

### What OSM actually provides

OSM's `golf=hole` ways carry `ref` (hole number), `par`, `handicap` (stroke index), and full geometry. Supporting polygons are tagged `golf=green` / `fairway` / `bunker` / `tee` / `water_hazard` / `rough`.

**Measured coverage (Overpass, 2026-09-07):**

| Market | Holes | ≈ Courses | par | stroke index |
|---|---|---|---|---|
| Brevard County (Melbourne) | 356 | 19.8 | 100% | 83% |
| Orlando metro | 1,083 | 60.2 | 87% | 60% |

**Map features, Brevard:** 1,524 bunkers · 1,239 tee boxes · 401 greens · 194 water hazards · 68 fairways · 56 rough · 31 lateral water.

### Yardage is derived, not fetched

The `dist` tag is absent (0% coverage), but a `golf=hole` way *is* the tee-to-green playing path, so its geodesic length is the hole distance. Computed and validated against all 356 Brevard holes:

| Par | n | Median | Range |
|---|---|---|---|
| 3 | 97 | 174 yds | 57–235 |
| 4 | 191 | 381 yds | 251–555 |
| 5 | 68 | 526 yds | 441–593 |

These are textbook-realistic distributions. Derived yardage is trustworthy.

### Consequences

- **Recurring data cost: $0.** Down from an assumed $399/mo.
- **The data is legally storable.** ODbL permits it.
- Vector hole maps are free, render offline, and can be drawn in Linksman's ink/bone style rather than looking like every other app's Google satellite screenshot.
- Commercial data is deferred, not foreclosed. If coverage becomes a real complaint, a provider can be added later as an on-demand per-user fill respecting device-cache terms.

### Obligations and gaps

- **ODbL attribution** — "© OpenStreetMap contributors" must appear in-app (Settings and any hole map).
- **Stroke-index gaps** (17% Brevard, 40% Orlando) are filled by an in-app confirmation flow: the first group to play a course confirms or corrects its stroke indexes for everyone. This doubles as a contribution loop.
- **Par gaps** (13% Orlando) use the existing par-picker fallback already built for OSM courses.

---

## 6. Data model

### The atomic record

```sql
ledger_entries (
  id            uuid primary key,
  round_id      uuid references rounds(id) on delete cascade,
  round_game_id uuid null references round_games(id) on delete cascade,
  challenge_id  uuid null references round_challenges(id) on delete cascade,
  circle_id     uuid null references circles(id) on delete set null,
  from_user     uuid references profiles(id),   -- lost the brass
  to_user       uuid references profiles(id),   -- won it
  brass         int not null check (brass > 0),
  created_at    timestamptz not null default now(),
  check (from_user <> to_user)
)
```

Directional and pairwise. **Every ledger surface is a query against this one table.** Head-to-head is a two-way sum; circle standings are a group-by; a season is a date filter; the feed is the most recent rows; a streak is a window function.

There are no derived totals to keep in sync, no reconciliation bugs, and the ledger is auditable down to the hole that moved it.

Indexes: `(from_user, to_user)`, `(circle_id, created_at desc)`, `(round_id)`, `(to_user, created_at desc)`.

### Supporting tables

| Table | Columns of note |
|---|---|
| `circles` | `name`, `created_by`, `season_start`, `season_label` |
| `circle_members` | PK `(circle_id, user_id)`, `role` (`owner`/`member`), `joined_at` |
| `round_games` | `round_id`, `format` enum, `config` jsonb, `circle_id` (null = ad hoc), `status` (`active`/`settled`/`void`) |
| `round_challenges` | `round_id`, `hole_number`, `kind` enum, `brass`, `winner_id`, `resolved_at` |
| `course_hole_geometry` | `course_hole_id`, `kind`, `path` jsonb — OSM-derived polygons for hole maps |

### Extensions to existing tables

- `course_holes`: `stroke_index int`, `yardage int`, `tee_lat/lng`, `green_lat/lng`, `source` (`osm`/`user`)
- `profiles`: `linksman_index numeric`, `club_active boolean`
- `courses`: `data_source`, `holes_verified_at`

### The game engine is a pure module

Scores in, brass out. No database, no React, no network. Skins carryover, Nassau's three segments, match-play dormie, and Wolf's partner rotation are fiddly rules that must be unit-tested in isolation rather than debugged through a UI on a golf course. It is also the piece most likely to grow, so it gets a hard boundary from day one.

```
lib/games/
  types.ts        -- HoleResult, PlayerState, BrassAward
  allocate.ts     -- stroke allocation by index + Linksman Index
  skins.ts  nassau.ts  match.ts  netStroke.ts  wolf.ts
  index.ts        -- resolve(format, config, holes) -> BrassAward[]
```

---

## 7. Surfaces

| Surface | Change |
|---|---|
| **Today** | Gains a Ledger module — season position, who is closing, brass in play this week |
| **Ledger** *(new tab)* | Standings, head-to-head detail, season history, streaks |
| **Group setup** | New step: choose formats, toggle challenges, pick the circle |
| **Live scoring** | Running game strip — skins carried, match status, open challenges |
| **Round summary** | Settlement card: brass awarded, ledger movement, the swing |
| **Feed** | Cards lead with the swing, not the score |
| **Hole view** | Vector `HoleMap` from OSM geometry, in ink/bone. Club-gated (§8); free users see par, yardage and stroke index without the map. |

Navigation becomes **Today · Feed · [Play] · Ledger · Me**. Search moves to a header action, which the Phase 9 notes already anticipated.

---

## 8. Monetization

**Free forever:** scoring, feed, follows, group rounds, join codes, every game format, every challenge, and the full active-season ledger.

Paywalling anything social kills the loop that has to spread — a group is only as premium as its cheapest member, and a rival who cannot see the ledger ends the rivalry.

**Linksman Club (~$40–50/yr):** GPS distances to front/center/back, vector hole maps, Linksman Index, deep stats, full multi-season ledger history and head-to-head archive.

This rides a habit golfers already pay for. Competitors charge $30–60/yr for GPS and stats alone.

**Infrastructure:** RevenueCat for cross-platform entitlements. Purchase state is never trusted from the client — a RevenueCat webhook hits a Supabase Edge Function which sets `profiles.club_active`.

---

## 9. Phase sequence

| Phase | Ships |
|---|---|
| **9 — Foundation** | Tag the auth/nav fixes (§10). Extend course schema. Overpass hole-importer for Brevard. Derived yardage. Stroke-index confirmation flow. Linksman Index. Vector `HoleMap`. ODbL attribution. |
| **10 — Ledger core** | Schema + RLS. The pure game engine with unit tests (skins, nassau, match, net stroke). Game setup in group rounds. Live game strip. Settlement on summary. Head-to-head view + Today module. |
| **11 — Circles & challenges** | Circles, membership, standings. Seasons + season-end moment. Five side challenges. Wolf. Ledger tab. Feed cards leading with the swing. |
| **12 — Club** | RevenueCat + webhook + entitlements. Paywall. GPS distances. Deep stats. |
| **13 — Polish** | Motion pass, skeletons, perf, accessibility, push notifications. **First Android device build.** |
| **14 — Store prep** | Bundle ID, icon, splash, screenshots, listing copy, analytics, App Review notes. |
| **15 — Beta** | TestFlight + Play closed track with real Melbourne foursomes. |
| **16 — Submit** | |

---

## 10. Pre-existing defects fixed 2026-09-07

An audit of the auth and navigation layer found the cause of the sign-up and transition glitches reported from the earlier build.

**Root cause:** `useSession` was a per-component hook called at 28 sites. Each created its own state, its own `getSession()` call, and its own `onAuthStateChange` subscription. Four to six ran concurrently per screen, resolving on different ticks with different answers.

The reported sign-up bug followed directly: `profile-setup` replaced to `/(app)/(tabs)`, whose layout mounted with its own session instance still `null`, and the guard ejected the user back to `/welcome`. Account created, user thrown out.

| # | Defect | Fix |
|---|---|---|
| 1 | 28 duplicate auth subscriptions and loading states | Single `SessionProvider` at root; consumers read context. Call-site API unchanged. |
| 2 | Guards fired `router.replace` from `useEffect`, stacking navigations | Declarative `<Redirect>`; does not animate or stack |
| 3 | Tab bar used `router.replace`, destroying and remounting each tab | Navigates through the tab navigator; state and scroll persist |
| 4 | Splash hid on font load, before session resolved | Splash held until fonts *and* session are ready |
| 5 | `app/index.tsx` returned `null` — white frame | Declarative redirect |
| 6 | Profile fetch error was indistinguishable from "no profile" | Explicit error state with retry |
| 7 | `getSession()` had no `.catch` — permanent spinner on failure | Resolves as signed-out |
| 8 | Inconsistent transitions between route groups | Groups fade; ink transition background |
| 9 | `preventAutoHideAsync()` unhandled rejection | Caught |
| 10 | `profile-setup` → tabs → guard → onboarding (double transition) | Routes straight to onboarding |
| 11 | Dead `['myProfile']` invalidation | Removed |

**Verification:** `tsc --noEmit` exit 0 · `eslint --quiet` exit 0 · `expo export --platform ios` exit 0 · `expo export --platform android` exit 0. Not yet run on a physical device or simulator.

---

## 11. Risks

1. **Android has never been run.** Both platforms bundle cleanly, but bundling is not running. Realtime, gesture-handler, fonts and safe-area all have Android-specific failure modes. Budget real time in Phase 13.
2. **Apple Developer enrollment is pending** ($99/yr); Google Play requires a one-time $25. Enrollment can take days — start before Phase 13.
3. **Bundle ID is still `com.golfapp.app`.** Effectively permanent once shipped. Must change before any store artifact exists.
4. **OSM coverage decays outside seeded metros.** Acceptable for a Melbourne-first launch; the stroke-index confirmation flow is the mitigation.
5. **Cold start needs two people.** A ledger with one member is an empty room. Onboarding must get a second human in, or the wedge never demonstrates itself.
6. **App Review.** Points-only is correct, but review notes must state plainly: no currency, no wagering, no in-app settlement.
7. **The device test of §10 has not happened.** The cause is fixed and it builds; the feel is unconfirmed.
