# Linksman — Project Handoff

**Written:** 2026-09-07 · **Repo:** `/Users/gavingillespie/Desktop/Golf App` · **Branch:** `main` @ `1580c55`

You have filesystem access to this repo. This document gives you the context the code cannot: why the product changed direction, which decisions are locked, what was just fixed, and what to do next. Read it before touching anything.

---

## 1. Thirty-second version

**Linksman** is a React Native / Expo golf app, roughly 14,100 lines across 42 routes, built through 9 tagged phases. It works: real-time multiplayer group rounds, a social graph, hole-by-hole scoring, stats, and store-compliance plumbing are all shipped.

On **2026-09-07** the owner repositioned it. It was "a social golf tracker" — a crowded category owned by 18Birdies, TheGrint and Golf GameBook. It is now **"golf's running bet, made permanent"**: a persistent, points-denominated rivalry ledger between people who play together repeatedly.

**This is a repositioning, not a rebuild.** The expensive chassis (realtime group scoring, follows, feed, auth) already works and is being kept. So is the visual identity. New work layers a competitive/ledger system on top.

The full design lives at **`docs/superpowers/specs/2026-09-07-linksman-rivalry-ledger-design.md`**. Read it after this.

---

## 2. Stack and repo facts

| | |
|---|---|
| Framework | Expo SDK 54, expo-router 6 (file-based routing), React Native 0.81.5, React 19.1 |
| Language | TypeScript, `strict` |
| Styling | NativeWind 4 (Tailwind) + inline style objects. **Both are used**; see §6. |
| Backend | Supabase — Postgres, RLS everywhere, Realtime, Edge Functions (Deno) |
| Data layer | TanStack Query v5. All server access goes through hooks in `lib/queries/*`. |
| State | `zustand` (light use), React context for session |
| Validation | `zod` |
| Errors | Sentry (`@sentry/react-native`), DSN-conditional init |
| Build | EAS. Project `d058e67b-4546-4673-8bf6-beac42804243` |
| Supabase ref | `tpbgtuhubrqzlvbvusqx` |
| GitHub | `github.com/gavin98gillespie/golf-app` (public — legal pages are served from it via GitHub Pages) |

**Scale:** 42 routes · 44 components · 18 query modules · 20 migrations.

**Secrets:** `.env.local` (gitignored) holds `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` for scripts.

---

## 3. What is already built

Tags `phase-0` … `phase-7` exist. Phase 8 is on `main` but **untagged**.

| Phase | Shipped |
|---|---|
| **0–1** | Project setup, design system, EAS. Email auth, profile setup, course picker (search / nearby / add), round setup, hole-by-hole scoring with autosave, summary, resume mid-round, round history, settings |
| **2** | Stats card, score-trend chart (hand-rolled SVG, no chart lib), best-per-par, course detail, "new course best" callout |
| **3a** | `follows` table, Discover, other-user profiles, feed |
| **3b** | Likes, comments, blocks, reports. Venmo-style inline like+comment row. Followers/following screens. Moderation menus. |
| **4** | Compliance: profanity filter (client + Postgres CHECK), account deletion Edge Function, ToS/Privacy/EULA via GitHub Pages, iOS privacy manifests, Sentry, email confirmation |
| **5** | **The Linksman visual rebuild.** Brand foundation, custom tab bar, procedural topo, cinematic summary, editorial voice. Also the OSM course seed (~17k US courses). |
| **6** | Home course, round notes, edit saved rounds, detailed stats (fairway %, GIR, putts, by-par), achievements + trophy case. *Handicaps were explicitly skipped — no free rating/slope source. §5 of the spec now unblocks this.* |
| **7** | **Real-time multiplayer group rounds.** `round_players` join table, Supabase Realtime per round, join codes, invite/RSVP, live per-player progress. Solo rounds refactored to write through `round_players` so all scoring is uniform. `user_round_summaries` view. This is the hardest thing in the codebase and it works. |
| **8** *(untagged)* | 3-step onboarding, "Today" landing screen, nav restructure, unified Search tab, one-way follow visibility |

---

## 4. The pivot — four locked decisions

The owner chose each of these explicitly. **Do not relitigate them.**

### 4.1 The wedge — the Rivalry Ledger

Every group has a running bet that lives in someone's Notes app and gets argued about in the parking lot. Nobody has built the ledger for it.

Rejected alternatives: "Strava for golf" (per-hole segment leaderboards) and a course-intelligence layer. Both are viable; neither was chosen.

**Why it works:** social by construction, compounds with every round, worthless to a solo user (network effects), and it makes the feed interesting because *standing* moved rather than merely a score being posted.

### 4.2 The unit — **brass** (`BR`)

Points only. **No currency anywhere in the app, ever.** Mass noun: "up 14 brass," never "14 brasses."

Named for `palette.brass` `#B8924A` — already the app's premium accent (Play button, ◆ achievement diamond) — and for the British slang for money. Reads as money while provably not being money, which is the correct posture for App Review.

Rejected: dollars-tracked-but-not-moved (Apple 5.3 risk, age gating, state-by-state legal exposure), and a points/dollars opt-in toggle (the escape hatch is exactly what reviewers look for).

### 4.3 Course data — OpenStreetMap only

See §5. This is the decision most likely to be wrongly reversed by a fresh model.

### 4.4 Monetization — free social, paid on-course tools

**Free forever:** scoring, feed, follows, group rounds, join codes, every game format, every challenge, the full active-season ledger.

**Never paywall anything social.** A group is only as premium as its cheapest member, and a rival who cannot see the ledger ends the rivalry.

**Linksman Club (~$40–50/yr):** GPS distances, vector hole maps, Linksman Index, deep stats, multi-season ledger history. This rides a habit golfers already pay for — competitors charge $30–60/yr for GPS and stats alone.

Infrastructure: RevenueCat for cross-platform entitlements; purchase state is never trusted from the client (webhook → Supabase Edge Function → `profiles.club_active`).

### 4.5 Also locked: the visuals stay

The owner considered a full redesign and chose **not** to. The Linksman system is an asset: ink/bone dual surface, Fraunces + JetBrains Mono, procedural topo, brass accents, no emoji, no exclamation points, ◆ for achievements, clay for alerts. It looks nothing like the blue-and-white aesthetic every competitor ships.

**Do not propose a visual rebuild.** Extend the language with competitive surfaces (standings tables, head-to-head cards, streaks, season-title moments).

There is a deferred alternative direction (cream + sage + bold display) on file — it stays deferred.

---

## 5. Course data — read this before touching anything data-related

### The decision: OSM only. No commercial API in v1.

### The retracted assumption

An earlier draft assumed a commercial provider could be bulk-hydrated once into our own tables for a one-time fee (~$150 for two metros). **That was wrong.** Golf Intelligence's Terms of Use forbid it directly:

> "An A–Z catalog dump is not allowed on any plan." Device cache "is not a license to download the catalog, host a local copy of 'every course,' or stand up your own golf-data store."

Permitted use is a per-course cache on one end user's device for up to one year following a legitimate fetch for that user. That makes commercial data a **recurring, usage-scaling cost** (~$399/mo past roughly 700 users), not a purchase.

**If you are ever tempted to add a paid course API, re-read that provider's caching terms first.**

### What OSM provides

`golf=hole` ways carry `ref` (hole number), `par`, `handicap` (**the stroke index, 1–18**), and full geometry. Supporting polygons: `golf=green` / `fairway` / `bunker` / `tee` / `water_hazard` / `rough`.

**Coverage, measured live via Overpass on 2026-09-07:**

| Market | Holes | ≈ Courses | par | stroke index |
|---|---|---|---|---|
| Brevard County (Melbourne FL) | 356 | 19.8 | 100% | 83% |
| Orlando metro | 1,083 | 60.2 | 87% | 60% |

**Brevard map features:** 1,524 bunkers · 1,239 tee boxes · 401 greens · 194 water hazards · 68 fairways · 56 rough · 31 lateral water.

### Yardage is derived, not fetched

The `dist` tag is **0% populated**. But a `golf=hole` way *is* the tee-to-green playing path, so its geodesic length is the hole distance. Computed across all 356 Brevard holes:

| Par | n | Median | Range |
|---|---|---|---|
| 3 | 97 | 174 yds | 57–235 |
| 4 | 191 | 381 yds | 251–555 |
| 5 | 68 | 526 yds | 441–593 |

Textbook-realistic. **Derived yardage is trustworthy** — use haversine over the way's node list, convert metres → yards (×1.09361).

### Consequences

- Recurring data cost: **$0**
- The data is **legally storable** under ODbL (unlike the commercial option)
- Vector hole maps render offline, in Linksman's own style, rather than looking like every other app's Google-satellite screenshot
- **It unblocks handicaps**, which Phase 6 shelved for lack of a free rating/slope source — because the Linksman Index deliberately isn't a USGA handicap, and stroke index is what actually makes skins and match play fair

### Obligations

- **ODbL attribution** — "© OpenStreetMap contributors" must appear in-app (Settings + any hole map)
- Stroke-index gaps filled by an in-app user confirmation flow — the first group to play a course confirms or corrects its indexes for everyone. Doubles as a contribution loop.
- Par gaps use the par-picker fallback already built for OSM courses

### Go-to-market: Melbourne FL → Orlando FL

A rivalry ledger is worthless until your actual foursome is on it. **Density beats breadth.** 40 courses in one metro where everyone's friends are present beats 17,000 courses and nobody to play against. The owner lives in the Melbourne area and can recruit real foursomes by text — that is the point.

---

## 6. Product design

### Concepts

| Concept | Definition |
|---|---|
| **Brass** | The ledger unit. Points only. |
| **Head-to-head ledger** | Automatic, zero-setup. Anyone you've played a group round with has a running brass total with you. Gives a new user value on round one. |
| **Circles** | Opt-in named groups ("The Saturday Game") with standings and seasons. The retention layer. |
| **Seasons** | A scoreboard with a start and an end, so the ledger pays off instead of drifting. |

### Formats (v1)

**Skins** (1 brass/hole to low net, ties carry) · **Nassau** (3 brass: front/back/total) · **Match Play** (1 brass, dormie handled) · **Net Stroke** (1 brass to low net total) · **Wolf** (4 players, rotating partners, variable brass)

### Side challenges

1 brass each, toggled at setup, one-tap resolution during scoring:

**Closest to the Pin** (par 3s) · **Longest Drive** · **Sandy** (up-and-down from bunker) · **Greenie** (GIR on a par 3) · **Barkie** (par after hitting a tree)

This is the "make golf more fun" layer the owner asked for. A Barkie is a story, and stories get screenshotted.

### The Linksman Index

A rivalry between a scratch player and a 22-handicap is a scratch player farming a friend until that friend deletes the app. Handicaps are mandatory.

**Formula:** per round, differential = `total_score - total_par`, normalised to 18 holes. Index = mean of the **best 8 of the last 20** differentials, to one decimal. Under 5 rounds → unrated. 5–19 rounds → best 40% (min 1).

**Allocation:** each player gets `round(their_index - lowest_index_in_group)` strokes, one per hole in ascending stroke-index order, wrapping above 18. Holes with unknown stroke index are allocated last, in hole order.

**Explicitly not USGA.** Say so in-app. Claiming an official Handicap Index without an allied golf association agreement is a legal problem, and we don't need one.

---

## 7. Architecture for the new work

### The atomic record — everything derives from one table

```sql
ledger_entries (
  id, round_id, round_game_id, challenge_id, circle_id,
  from_user,   -- lost the brass
  to_user,     -- won it
  brass int not null check (brass > 0),
  created_at,
  check (from_user <> to_user)
)
```

Directional and pairwise. Head-to-head is a two-way sum; circle standings a group-by; a season a date filter; the feed the most recent rows; a streak a window function.

**No derived totals to keep in sync, no reconciliation bugs, auditable down to the hole that moved it.** Do not add cached total columns.

Indexes: `(from_user, to_user)`, `(circle_id, created_at desc)`, `(round_id)`, `(to_user, created_at desc)`.

Supporting: `circles`, `circle_members`, `round_games`, `round_challenges`, `course_hole_geometry`. Extensions: `course_holes.stroke_index/yardage/tee_lat/lng/green_lat/lng`, `profiles.linksman_index/club_active`.

### The game engine is a pure module

Scores in, brass out. **No database, no React, no network.**

```
lib/games/
  types.ts     allocate.ts
  skins.ts  nassau.ts  match.ts  netStroke.ts  wolf.ts
  index.ts     -- resolve(format, config, holes) -> BrassAward[]
```

Skins carryover, Nassau's three segments, match-play dormie and Wolf's partner rotation are fiddly rules that must be **unit-tested in isolation** rather than debugged through a UI on a golf course.

### Surfaces

Navigation becomes **Today · Feed · [Play] · Ledger · Me** (Search moves to a header action).

Today gains a Ledger module · new Ledger tab (standings, head-to-head, seasons, streaks) · group setup gains a format/challenge step · live scoring gains a running game strip · round summary gains a settlement card · **feed cards lead with the swing, not the score**.

---

## 8. Phase plan

| Phase | Ships |
|---|---|
| **9 — Foundation** | Tag the §9 fixes. Extend course schema. Overpass hole-importer for Brevard. Derived yardage. Stroke-index confirmation flow. Linksman Index. Vector `HoleMap`. ODbL attribution. |
| **10 — Ledger core** | Schema + RLS. Pure game engine with unit tests (skins, nassau, match, net stroke). Game setup in group rounds. Live game strip. Settlement. Head-to-head + Today module. |
| **11 — Circles & challenges** | Circles, standings, seasons + season-end moment. Five challenges. Wolf. Ledger tab. Feed swing cards. |
| **12 — Club** | RevenueCat + webhook + entitlements. Paywall. GPS distances. Deep stats. |
| **13 — Polish** | Motion, skeletons, perf, a11y, push notifications. **First Android device build.** |
| **14 — Store prep** | Bundle ID, icon, splash, screenshots, listing, analytics, App Review notes. |
| **15 — Beta** | TestFlight + Play closed track, real Melbourne foursomes. |
| **16 — Submit** | |

Phase 9 has a spec but **no implementation plan yet** — that is the immediate next deliverable.

---

## 9. Defects fixed 2026-09-07 (uncommitted)

The owner reported glitchy sign-up and screen transitions from the earlier build. An audit found one architectural cause with several symptoms.

**Root cause:** `useSession` was a per-component hook called at **28 sites**. Each created its own state, its own `getSession()` call, and its own `onAuthStateChange` subscription. Four to six ran concurrently per screen, resolving on different ticks with different answers.

The sign-up bug followed directly: `profile-setup` replaced to `/(app)/(tabs)`, whose layout mounted with *its own* session instance still `null`, so the guard ejected the user back to `/welcome`. **Account created, user thrown out.**

| # | Defect | Fix |
|---|---|---|
| 1 | 28 duplicate auth subscriptions and loading states | Single `SessionProvider` at root; consumers read context. **Call-site API unchanged** — all 28 sites still call `useSession()` and get `{ session, loading }`. |
| 2 | Guards fired `router.replace` from `useEffect`, stacking navigations | Declarative `<Redirect>` |
| 3 | Tab bar used `router.replace` — destroyed and remounted each tab on every tap, losing scroll and refetching | Navigates through the tab navigator |
| 4 | Splash hid on font load, before session resolved | Held until fonts *and* session ready |
| 5 | `app/index.tsx` returned `null` — white frame in a near-black app | Declarative redirect |
| 6 | Profile fetch error indistinguishable from "no profile" — a network blip sent existing users to re-pick a handle | Explicit error state with retry |
| 7 | `getSession()` had no `.catch` — permanent spinner on failure | Resolves as signed-out |
| 8 | Inconsistent transitions between route groups | Groups fade; ink transition background |
| 9 | `preventAutoHideAsync()` unhandled rejection | Caught |
| 10 | `profile-setup` → tabs → guard → onboarding (double transition) | Routes straight to onboarding |
| 11 | Dead `['myProfile']` invalidation | Removed |

**Files touched:** `app/_layout.tsx`, `app/index.tsx`, `app/(app)/_layout.tsx`, `app/(app)/(tabs)/_layout.tsx`, `app/(auth)/profile-setup.tsx`, `components/TabBar.tsx`, `lib/queries/profile.ts`, and `lib/hooks/useSession.ts` → `.tsx`.

**Verification:** `tsc --noEmit` exit 0 · `eslint --quiet` exit 0 · `expo export --platform ios` exit 0 · `expo export --platform android` exit 0.

**Not verified:** never run on a device or simulator. The cause is fixed and it builds; the *feel* is unconfirmed. The simulator is blocked pending `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, which needs the owner's password.

**Everything above is uncommitted**, along with the new spec file, so the owner can review the diff first.

---

## 10. Open risks

1. **Android has never been run.** Both platforms bundle, but bundling is not running. Realtime, gesture-handler, fonts and safe-area all have Android-specific failure modes. Budget real time in Phase 13.
2. **Apple Developer enrollment is pending** ($99/yr); Google Play needs a one-time $25. Enrollment can take days — start before Phase 13.
3. **Bundle ID is still the placeholder `com.golfapp.app`.** Effectively permanent once shipped. Must change before any store artifact exists.
4. **OSM coverage decays outside seeded metros.** Acceptable for Melbourne-first; the confirmation flow is the mitigation.
5. **Cold start needs two people.** A ledger with one member is an empty room. Onboarding must land a second human.
6. **App Review.** Points-only is correct, but review notes must state plainly: no currency, no wagering, no in-app settlement.
7. **The device test hasn't happened** (see §9).

---

## 11. Working conventions — carried forward, follow these

**Build and tooling**

- `npm install` needs `--legacy-peer-deps` for anything that isn't `expo install` (expo-router peer dep conflict)
- Node TS scripts use **`tsx`, not `ts-node`** (Node 22)
- Scripts must load env explicitly: `dotenv` with `{ path: '.env.local' }` — Expo's convention isn't dotenv's default
- Overpass API **requires an explicit `User-Agent`** and benefits from mirror fallback. See `scripts/seed-osm-courses.ts` for the working pattern — reuse it for the hole importer.
- The `babel-preset-expo@55` advisory is benign and pre-existing
- `lib/database.types.ts` is generated (`npm run db:types`) and ESLint-ignored
- `supabase/functions/` is Deno; excluded from the RN tsconfig and eslint

**Verification before claiming done:** `npm run typecheck` · `npm run lint` · `npx expo export --platform ios` (and `android`). All four passed as of this handoff.

**Code style**

- Both NativeWind classes and inline style objects are in use. Newer Linksman-era code favours inline objects with `palette` / `fontFamily` from `theme/linksman.ts`. Match the file you're editing.
- `theme/colors.ts` is the legacy palette; `theme/linksman.ts` is canonical. `tailwind.config.js` keeps backwards-compat aliases (`bg-bg-base` etc.) mapped to Linksman values — some older components still use them.
- All server access goes through `lib/queries/*` hooks. Don't call `supabase` directly from a screen.
- Use `qc.setQueryData` rather than `invalidateQueries` where a score-revert race is possible — this bit the project before.

**Voice** — no emoji, no exclamation points. ◆ (brass diamond) for achievements, clay for alerts. Vocabulary is layered deliberately: **round** in data/history, **card** at the moment of intent, **ledger** at the editorial front-page level. The DB keeps `round` everywhere; do not globally rename.

**Process** — one task per subagent, bundled where mechanical. After each phase: full owner phone test → tag → write the next phase plan. Specs live in `docs/superpowers/specs/`, plans in `docs/superpowers/plans/`.

**Design reference** — `docs/design/linksman/` holds the original Claude Design package (`Linksman.html`, `brand.jsx`, `topo.jsx`, screen mockups). Phase 5 treated these as the contract; keep referring to them.

---

## 12. Where things are

```
app/                      42 routes, expo-router file-based
  (auth)/                 welcome, sign-in, sign-up, profile-setup
  (onboarding)/           home-course, regulars, begin
  (app)/(tabs)/           index (Today), feed, search, profile, start
  (app)/round/new/        course, setup, score, summary, add-course, group-setup
  (app)/round/group/[id]/ lobby, score          <- realtime multiplayer
components/               44 components; TabBar, Topo, ScoreNumeral, HoleGrid, ActionSheet…
lib/queries/              18 modules — ALL server access lives here
lib/hooks/useSession.tsx  single auth source of truth (new)
theme/linksman.ts         canonical palette + type + deltaColor/deltaLabel
supabase/migrations/      20 migrations, chronological
supabase/functions/       Deno edge functions (delete-account)
scripts/seed-osm-courses.ts   working Overpass pattern — model the hole importer on this
docs/superpowers/specs/   design specs, incl. the 2026-09-07 ledger spec
docs/superpowers/plans/   per-phase implementation plans
docs/design/linksman/     canonical visual reference package
docs/legal/               ToS/Privacy/EULA served via GitHub Pages
```

---

## 13. What to do next

1. **Read** `docs/superpowers/specs/2026-09-07-linksman-rivalry-ledger-design.md` in full.
2. **Ask the owner** whether to commit the §9 fixes and the spec (currently uncommitted, deliberately, so the diff can be reviewed).
3. **Get the device test done** — the sign-up fix is unverified on real hardware. Needs `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` from the owner first.
4. **Write the Phase 9 implementation plan**: Overpass hole importer for Brevard, course schema extension, derived yardage, stroke-index confirmation flow, Linksman Index, vector `HoleMap`, ODbL attribution.

**Do not** reverse the four locked decisions in §4, propose a visual rebuild, add a paid course API without re-reading its caching terms, or introduce currency anywhere in the product.
