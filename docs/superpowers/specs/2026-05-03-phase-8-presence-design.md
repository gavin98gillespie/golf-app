# Phase 8 — Presence (design)

**Date:** 2026-05-03
**Phase name:** Presence
**Goal:** Make Linksman openable on day one with a meaningful surface, even when no mutuals have posted. Convert sign-up into a guided start that ends at the user's home course with the option to log a card. Restructure the bottom nav so daily-use surfaces are reachable without burying the social feed. Layer a memory-first vocabulary (card / ledger) onto the existing scoring vocabulary (round) without renaming the data model.

This phase is the *shape* of the new app. Phase 9 (Memory) layers richer Course memory, weather, and marginalia onto the Today and Courses surfaces this phase establishes.

## Scope

**In scope:**
- Auth screen polish (welcome subtitle, create-account legal text + tap targets)
- First-run onboarding flow (4 steps)
- `onboarding_completed` flag on profiles + route guard
- Today screen as default landing (3 modules)
- Bottom tab restructure: `Today | Feed | [Play] | Search | Me`
- Settings moved off bottom nav into Me
- Discover removed from bottom nav, search behavior preserved as a top-level Search tab
- Global Search surface (Players / Courses / Join Code)

**Out of scope (deferred to Phase 9 or later):**
- Weather / Playing Window
- Course marginalia / "miss on hole 1" prompt
- Courses tab as a top-level destination (Phase 9)
- Photos
- Streaks
- Leaderboards
- Contacts import / invite-link generation
- Push notifications

## Vocabulary

**Three terms, three contexts. No global rename.**

| Term | Where | Examples |
|---|---|---|
| **Round** | Saved history, detail screens, stats, all DB columns and types | `rounds` table, `useUserRounds`, "Round detail", "Recent rounds" |
| **Card** | Starting/scoring language at moment of intent | "Start a card", "Your first card will live here", "Begin a card" |
| **Ledger** | Editorial archive language at the front-page level | "Your ledger begins here", "From your ledger" |

The user starts a *card*, plays the round, sees it saved as a *round* in their *ledger*. Database, API, and existing screens keep `round` everywhere. New surfaces (Today, onboarding, ledger preview) speak the layered language.

## Navigation restructure

**Before:** `Feed | Discover | [Play] | Me | Settings`
**After:** `Today | Feed | [Play] | Search | Me`

Changes:
- **Today** added as new index route, replaces the Feed at index. Becomes default landing for authenticated users with `onboarding_completed = true`.
- **Feed** stays as a tab but shifts one slot right. Same content as today's `(tabs)/index.tsx` (mutuals feed + draft resume banner + WeeklySummary).
- **Discover** removed as a bottom tab. Its behaviors (user search, course search) move into the Search tab.
- **Search** added as a new tab. Sections: Players, Courses, Join Code.
- **Settings** removed as a bottom tab. Surfaced from the Profile (Me) screen via top-right "Settings" link.
- **Play** unchanged — central brass button, `PlayModeSheet`.

In Phase 9, Search is demoted from tab → top-right global action and the Courses tab takes the slot. This phase deliberately keeps Search as a tab so we don't lose access to user/course discovery during the gap.

## Onboarding flow

**Trigger:** authenticated user where `profile.onboarding_completed IS NOT TRUE` and required profile fields (`username`, `display_name`) are present. Users without `username` go through the existing `(auth)/profile-setup.tsx` first; onboarding starts after that lands.

**Existing users:** all currently-shipped users have completed Phase 1 profile-setup, so they have `username` and `display_name`. The migration backfills `onboarding_completed = true` for any profile where both are non-null. They are not forced through the new onboarding.

**Route:** `/(onboarding)` route group with own `_layout.tsx`. Each step is its own route so users can hardware-back through the flow.

### Step 1 — `Your Card`
Path: `/(onboarding)/your-card`
Purpose: confirm display name + username (already collected at profile-setup, but shown as a confirmation step so users see what their card will look like).
Surface: bone background, mono eyebrow ("YOUR CARD"), Fraunces title ("This is your card."), inline mini ScoreNumeral preview with the user's display name underneath. Editable inline; saves to existing `profiles` mutation.
CTA: "Continue" (sage), advances to Step 2.

### Step 2 — `Home Course`
Path: `/(onboarding)/home-course`
Purpose: set `profile.home_course_id`. Reuses the existing course picker (`/round/new/course`) in a `?mode=homeCourse` variant so the same component handles both round-setup and onboarding. Picker already supports search + nearby + add-new.
CTA: course tap saves and advances. Bottom secondary: "Skip for now" (mono, low-opacity) — advances without setting home course.

### Step 3 — `Your Regulars`
Path: `/(onboarding)/regulars`
Purpose: follow at least one user so the mutuals feed isn't permanently dead. User-search input. Each result has a Follow button (reuses `useFollow` mutation).
Empty-state hint: "Follow people you actually play with. Linksman is mutual-only — you'll see their rounds when they follow back."
CTA: "Continue" (sage), always advances. Bottom secondary: "Skip for now."

**Invite-link generation deferred to Phase 9.** This step is search-and-follow only.

### Step 4 — `Begin`
Path: `/(onboarding)/begin`
Purpose: show a ledger-preview hero card and convert intent to action.
Layout: bone surface. Mono eyebrow ("YOUR LEDGER"). Fraunces title — if home course set: course name; if skipped: "Linksman".
Three datum rows under the title (hairlines between):
- BEST CARD — "No card yet"
- LAST CARD — "No card yet"
- NOTES — "No notes yet"
CTAs: primary "Start a card →" (brass, full-width), secondary "Go to Today" (mono uppercase, low-opacity).

Tapping "Start a card" runs `setOnboardingCompleted()` then `router.replace('/round/new/setup')` with the home course pre-selected if set, or the course picker first if not.
Tapping "Go to Today" runs `setOnboardingCompleted()` then `router.replace('/(app)/(tabs)')` (which now lands on Today).

## Today screen

Path: `/(app)/(tabs)/index.tsx` (the existing Feed file is renamed/moved — see Migration below).

**Surface:** bone (matches Profile/Settings/Course Detail editorial direction). Topo backdrop at low opacity (~0.06–0.08).

**Layout:** vertical scroll, three modules separated by hairlines and generous mono uppercase eyebrows. Wordmark + small avatar/initial in the top-right header row, mono date eyebrow on the left ("MON · MAY 3"). No card-in-card nesting.

### Module 1 — Home Course
- Mono eyebrow: "HOME COURSE"
- If `home_course_id` set: Fraunces course name (large), mono subline city/state, primary CTA "Start a card →" (sage/fairway), secondary mono link "Change" (opens course picker in homeCourse mode).
- If unset: Fraunces "Set a home course." with mono subline "Pick where you play most." CTA "Choose a course →" (sage).

Tap on course name: `router.push('/course/[id]')`.

### Module 2 — From Your Ledger
- Mono eyebrow: "FROM YOUR LEDGER"
- Three sub-rows, hairlines between:
  - **BEST CARD** — best round at home course (lowest score), or any course if no home course set. Shows score + course + date as compact ScoreNumeral row. Empty: "No card yet."
  - **LAST CARD** — most recent saved round. Same compact ScoreNumeral row. Empty: "No card yet."
  - **TROPHY CASE** — count of eagles/aces/albatrosses (already powered by `useAchievements`), tappable. Empty: "Nothing yet — play a round."
- Tapping a row navigates to the round detail or trophy case screen.

If the user has zero rounds, the whole module collapses to a single editorial empty:

> "Your first card will live here."

### Module 3 — Mutual Pulse
- Mono eyebrow: "FROM YOUR REGULARS"
- Latest mutual round OR latest comment on user's own rounds, whichever is more recent. Owner header row + small score/quote + tappable.
- Empty: editorial empty, no growth-bait copy:

> "Quiet on the wire."

If multiple events available, only the single most recent is shown — Today is a front page, not a feed (Feed tab still exists for that).

### Bottom anchor
A single mono row at the very bottom, low-opacity:

> "Open Feed for the rest →" (tappable, navigates to Feed tab)

## Global Search tab

Path: `/(app)/(tabs)/search.tsx`

**Surface:** ink (matches Feed). Top: search input with mono placeholder ("Search players, courses, or join code"). Three section toggles below the input:
- **PLAYERS** — username/display-name search (reuses Discover's existing user search query)
- **COURSES** — course search (reuses Discover's existing course search)
- **JOIN CODE** — 6-char code input, redeems via existing `useJoinViaCode`

Section toggle is a mono uppercase row. Default section is Players. Empty input shows section-specific recents: recent profiles followed, recent courses played, last join code attempted.

Reuses existing query hooks. No new data fetching. The current `discover.tsx` file is deleted; its components and helpers fold into `search.tsx`.

## Settings access

`(tabs)/settings.tsx` becomes a non-tab route at `(app)/settings.tsx` (out of `(tabs)`). Surfaced from `(tabs)/profile.tsx` via top-right link in the header row:

```
[Wordmark]                               SETTINGS  →
```

Mono uppercase, low-opacity, hitSlop=8, navigates to `/settings`.

## Auth screen polish

### `(auth)/welcome.tsx`
- Replace tagline "Quiet. Precise. Earned." with a clearer positioning line: **"Private scorecards for the people you play with."** (Confirm with user during plan review — alternative is to keep the existing tagline and add the new line as a subhead.)
- "EST. MMXXV · GOLF JOURNAL" stays.

### `(auth)/sign-up.tsx`
- Add small Linksman wordmark at top of screen (28px, ink).
- Add legal text below CTA: small mono uppercase line, low-opacity, "By creating an account you agree to our Terms and Privacy." with two `Pressable` links opening WebBrowser to existing legal URLs.
- Increase tap target on "Already have an account? Sign in." — bump padding to 12px vertical, hitSlop=8.
- KeyboardAvoidingView already in place; verify CTA is not crowded on iPhone SE (smallest device target). If it is, reduce vertical spacing between fields and CTA.

### `(auth)/sign-in.tsx`
- Same legal text + tap target fixes for parity.

## Data model changes

### Migration `20260512000001_phase8_profiles_onboarding_completed.sql`

```sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing users: anyone with username + display_name has effectively
-- finished the equivalent of onboarding under Phase 1's profile-setup, so we
-- don't force them through the new flow.
UPDATE profiles
SET onboarding_completed = true
WHERE username IS NOT NULL AND display_name IS NOT NULL;
```

No RLS change required — `profiles` already has owner-update policies.

### Route guard

In `app/(app)/_layout.tsx`, extend the existing redirect logic:

```ts
useEffect(() => {
  if (sessionLoading || profileQ.isLoading) return;
  if (!session) { router.replace('/(auth)/welcome'); return; }
  if (!profileQ.data) { router.replace('/(auth)/profile-setup'); return; }
  if (!profileQ.data.onboarding_completed) {
    router.replace('/(onboarding)/your-card');
  }
}, [...]);
```

Onboarding writes `onboarding_completed = true` only at Step 4 confirmation. Steps 2 and 3 use "Skip for now" without flipping the flag — but Step 4 is mandatory to land in the app.

### `setOnboardingCompleted` mutation

`lib/queries/profile.ts`:

```ts
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}
```

## Component changes

### New
- `app/(onboarding)/_layout.tsx` — Stack with no header, hidden tab bar.
- `app/(onboarding)/your-card.tsx`, `home-course.tsx`, `regulars.tsx`, `begin.tsx`
- `app/(app)/(tabs)/today.tsx` — new file at the index slot (rename existing index → feed, see below).
- `app/(app)/(tabs)/search.tsx` — new tab, absorbs Discover.
- `components/HomeCourseCard.tsx` — Today module 1.
- `components/LedgerCard.tsx` — Today module 2.
- `components/MutualPulseCard.tsx` — Today module 3.
- `components/OnboardingFooter.tsx` — shared footer with "Skip for now" + step indicator dots.
- `lib/queries/today.ts` — query hooks for `useBestCard`, `useLatestCard`, `useLatestMutualPulse`. May reuse `user_round_summaries` view.

### Modified
- `app/(app)/(tabs)/_layout.tsx` — add `today` and `search` Screens, remove `discover` and `settings`.
- `components/TabBar.tsx` — replace items to match the new nav: `today (Today) | feed (Feed) | profile (Me) | search (Search)` with the brass Play button as the centerpiece. Drop `discover` and `settings`. The `TabName` union type updates accordingly.
- `app/(app)/(tabs)/index.tsx` — rename current file to `feed.tsx`, then create a new `index.tsx` containing the Today screen. `index.tsx` is the default landing, so users entering `/(app)/(tabs)` see Today. TabBar's "Feed" button routes to `/(app)/(tabs)/feed`.
- `app/(app)/_layout.tsx` — onboarding redirect.
- `lib/queries/profile.ts` — add `useCompleteOnboarding`, ensure `onboarding_completed` returned in profile selects.
- `app/(auth)/welcome.tsx`, `sign-up.tsx`, `sign-in.tsx` — polish per above.
- `app/(app)/(tabs)/profile.tsx` — add Settings link in header row.
- `app/(app)/round/new/course.tsx` — accept `mode=homeCourse` param so it can be reused from Settings + onboarding (already partially supports this from Phase 6).

### Deleted
- `app/(app)/(tabs)/discover.tsx` — content folded into `search.tsx`.

### Moved
- `app/(app)/(tabs)/settings.tsx` → `app/(app)/settings.tsx`. Update Profile link target.

## Open decisions to confirm during plan review

1. **Welcome tagline.** Is "Private scorecards for the people you play with." the right replacement, or do you want to keep "Quiet. Precise. Earned." and add the positioning line as a subhead?
2. **Today date eyebrow.** "MON · MAY 3" or just "MAY 3" or "MONDAY, MAY 3"?
3. **Step 1 (Your Card) skipability.** Display name + username were already set at profile-setup. Is Step 1 a confirmation, or do we let users edit there? My read: confirmation, no edit (edits live in Profile).
4. **Onboarding step indicator.** Mono dots (●○○○) at the bottom, or no indicator?
5. **Today module ordering.** Home Course → Ledger → Mutual Pulse, or Home Course → Mutual Pulse → Ledger? My read: Ledger second so the personal memory beats the social pulse to the eye.

## Success criteria

A new user can:
1. Create an account.
2. See their card preview (Step 1).
3. Pick or skip a home course (Step 2).
4. Search and follow at least one regular, or skip (Step 3).
5. See their ledger preview with home course (Step 4).
6. Tap "Start a card" and land in the round-setup flow with home course pre-filled.
7. Reopen the app the next day and land on Today, see their home course module + most recent round + any mutual pulse.

An existing user:
1. Lands on Today (no onboarding forced).
2. Reaches Feed in one tap.
3. Reaches Search in one tap, finds Players/Courses/Join Code there.
4. Reaches Settings via Me.

## Phase 9 dependencies (not built here, but designed for)

- Today's "Playing Window" module (weather/wind/sunset) drops in as a fourth module above Mutual Pulse.
- Today's "From Your Ledger" expands to include marginalia ("the miss on hole 1") once the marginalia schema lands.
- Search tab demotes to a top-right global action; Courses tab takes the slot.
- "Your Regulars" onboarding step gains an invite-link generator once we have an invite object.

## Risk and unknowns

- **Renaming `(tabs)/index.tsx` to `feed.tsx`** changes the route. Any deep-link or hardcoded path expecting `/` to mean Feed will break. Audit: search the repo for `/(tabs)` and `(tabs)/index` paths. Most navigation goes through `router.replace('/(app)/(tabs)')` which resolves to `/index` — that will land on Today now, which is intended.
- **Empty Today on a fresh device.** A user who skips home course AND has no rounds AND no mutuals sees three empty states. The page should still feel intentional — empty states are short editorial copy, not blank. The plan must verify this looks correct in implementation.
- **Onboarding back-out.** If the user kills the app mid-onboarding, the flag stays false; they re-enter at Step 1 next launch. That's correct behavior.
