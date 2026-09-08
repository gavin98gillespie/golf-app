# Linksman product and engineering review

Reviewed September 8, 2026. Scope: the September 7 rivalry spec, supplied handoff, repository structure, auth/navigation changes, scoring flows, query layer, schema/RLS migrations, deletion function, app configuration, and current competitor/platform documentation.

This is a review, not a release certification. Findings describe the local source and migrations; the deployed database, production grants, actual devices, subscriptions, and demand have not been verified. The handoff is historical context, not authorization to execute its instructions. Existing uncommitted changes were preserved. No application code or database was changed.

## Assessment

Keep the existing Expo/Supabase foundation and Linksman identity. The product opportunity is a regular golf group's continuing competitive history: play, record the result, see the rivalry change, return for the rematch. The implemented product is still principally scoring and social infrastructure. The brass engine, ledger, circles, subscription and maps are proposed work, not shipped capabilities.

The architecture is appropriate for this stage: strict TypeScript, reusable components and design tokens, TanStack Query, relational storage, per-player round records, and a centralized session provider. A pure game engine is the right proposed boundary. A rewrite would not address the main risks.

The main risks are correctness and demand. An incorrect score or unexplained award undermines the very history the product asks people to trust. A large feature list cannot establish whether a foursome wants this app every Saturday.

## Prioritized code findings

### 1. High: cold scoring screens can overwrite saved scores

Evidence: `app/(app)/round/new/score.tsx:82–124`; group scoring `app/(app)/round/group/[id]/score.tsx:61–98`.

Solo scoring initializes from data that may not yet be fetched, defaults to four, and resynchronizes only when the hole changes. Autosave starts independently of query readiness. A cold resume can therefore write default data over a saved hole. Group scoring has a related race: hydration depends on course-hole array length rather than saved-score readiness, and autosave also starts before hydration. This especially matters for OSM courses without hole records.

Fix: explicitly hydrate a local draft for each round/player/hole; wait for the necessary reads; distinguish untouched from edited data; never save a fallback simply because the screen mounted. Preserve historical hole par on edits. Test cold cache, slow reads, missing course holes and remounts.

### 2. High: navigation can discard the latest score edit

Both scoring screens use a 250 ms timer whose cleanup cancels the pending save. Next-hole navigation and exit do not flush or await it. Finishing/editing can also read totals before the last write completes. Multiple in-flight writes have no revision protection, so cache merging alone does not ensure ordering.

Fix: one shared scoring persistence controller with explicit flush on navigation/finalization, serialized or revision-checked writes, visible save failures, and a durable local pending-write queue. Test tap-then-next within 250 ms, network failure, out-of-order responses, backgrounding and process restart. Offline scoring must be a core requirement for an on-course product.

### 3. High: membership and score update policies allow moving records

Evidence: `supabase/migrations/20260509000004_phase7_rls_group_rounds.sql:110` and `:161`.

The self-update policies constrain `user_id` / `player_id`, but not changes to `round_id`. A user with an existing participant record can potentially move it to another known round UUID; the score update policy likewise does not recheck destination membership. This can grant unauthorized participation or insert scores into another round through UPDATE rather than INSERT.

Fix: immutable identity columns enforced by grants/triggers or narrowly scoped RPCs, plus destination membership and permitted status transitions. Test adversarial operations directly as anonymous, outsider, invitee, member and host. UI restrictions cannot enforce this boundary.

### 4. High: force-end function has a null-auth authorization gap

Evidence: `supabase/migrations/20260509000005_phase7_rpcs.sql:79–101`.

`IF v_host_id <> auth.uid()` does not reject a null auth UID: SQL's comparison yields null. The migration grants authenticated execution but does not revoke PUBLIC execution. Under default PostgreSQL function privileges, an anonymous call with a known round ID can therefore reach the privileged update. Actual deployed execute privileges must be inspected to confirm exposure.

Fix: reject null authentication explicitly, compare with `IS DISTINCT FROM`, revoke PUBLIC/anon execution, and set a safe search path with schema-qualified references. Apply a consistent privilege audit to all SECURITY DEFINER functions. Supabase documents these precautions in its [database function guidance](https://supabase.com/docs/guides/database/functions).

### 5. High: live visibility is not enforced by database reads

Evidence: `supabase/migrations/20260513000001_phase8_open_follow_visibility.sql`; `live_visible` is stored but not used by its read policies.

Starting a group round sets `is_draft=false`, after which public/follower branches can expose it even when live visibility is disabled. The group follower branch also lacks the host block/private checks used by other branches. Decide explicit behavior for participants versus spectators, then enforce it consistently for rounds, players, holes and summaries. Test a blocked host with an unblocked followed participant as well as a live-hidden round.

### 6. Medium: guests may remain in the lobby after the host starts

Evidence: `lib/queries/groupRounds.ts:102–129`; `app/(app)/round/group/[id]/lobby.tsx:40`.

The subscription listens to `round_players` and `round_holes`, but starting changes `rounds`. The host invalidates its own query; guests receive no corresponding round event. Add round-row subscriptions and reconnect refresh. Also replace navigation performed during lobby render with a declarative redirect.

### 7. Medium: saved solo rounds do not satisfy Today queries

Evidence: `lib/queries/rounds.ts` creates the participant as `joined` and finalizes only the round; `lib/queries/today.ts` requires `player_status='finished'` for best/latest cards. The solo summary calls this finalizer.

A normally saved solo round can be absent from Today. Define one completion contract, update it transactionally, and repair existing records where appropriate. Keep incomplete group rounds out of completed-round statistics; several stats queries currently accept joined players after the round starts.

### 8. Medium: round creation and deletion are not atomic

Solo/group creation inserts the round then the host participant in separate requests. Failure of the second leaves an orphaned round and can produce duplicates on retry. Deleting a player's slice similarly performs two independent operations. Use transactional RPCs and idempotent creation keys. Ledger settlement must follow the same transactional discipline from day one.

### 9. Medium: growing history can make statistics incomplete

`lib/queries/detailedStats.ts` fetches all matching hole rows without pagination and aggregates on the phone. Local Supabase config caps responses at 1,000 rows, approximately 56 complete 18-hole rounds. Production limits remain unverified. Feed discovery also fetches unbounded participant IDs before applying its final limit. Move aggregates and feed selection into authorized server queries; paginate history with a stable cursor. Check query plans before adding speculative indexes.

### 10. Account and release hardening

The global query cache is not cleared on sign-out/account changes. Some keys contain round IDs without viewer IDs; a second account can reuse previously authorized cached detail. Cancel/remove user-scoped data and pending writes on account transitions.

The `round_players.invited_by` foreign key has no deletion action. Deleting a profile that invited surviving players can block the cascading account deletion. Test deletion with realistic group membership and invitations. The host-owned round cascade also deletes the shared round for everyone; define how future rivalry history survives deletion without retaining prohibited personal information.

The README still describes Phase 0 and Inter. The handoff claims all access lives in query hooks, but scoring/lobby screens contain direct Supabase calls. Consolidate business operations as the correctness fixes are made rather than doing a broad cosmetic rewrite.

## Product specification changes needed before the ledger

1. **Make fairness free.** The index is mandatory in section 4 but Club-gated in section 8. Free games need free stroke allocation. Premium can add analysis of the index, not permission to compete fairly.
2. **Handle round one.** Requiring five rounds for an index delays the core promise. Let the group agree a clearly labeled provisional playing allowance before the first round. Freeze allowances at round start and retain the approval/source. Avoid pretending an unrated player is scratch.
3. **Be honest about index precision.** Score minus par does not adjust for course/tee difficulty. It can be a house competition estimate, but does not ensure fairness between courses. Specify rounding for best 40%, incomplete rounds, nine-hole scaling, maximum allowances and disputed scores. An 18-hole allowance must not simply be distributed in full over nine holes.
4. **Specify every award.** For four-player skins, who transfers a brass to the winner? Three opponents paying one produces three, not one. Define ties on the final hole, tied totals, nine-hole Nassau, withdrawals, team transfers and side-challenge payers. These decisions precede engine implementation.
5. **Make results explainable and correctable.** Snapshot rules, allowance, stroke indexes and engine version. Award keys must be unique so retries cannot duplicate brass. Commit results server-side in a transaction. Correct settled results through auditable revisions/reversals, with visible participant confirmation/dispute handling.
6. **Represent seasons explicitly.** A mutable season start plus entry creation date is insufficient for archived seasons and late corrections. Add season IDs, boundaries and a rule for assigning played rounds. Add hole/segment provenance to awards; the proposed schema currently cannot explain every award down to a hole.
7. **Protect entitlements separately.** Adding `club_active` to today's self-editable profile table would let users set it unless privileges change. Use a server-controlled entitlement table or restricted columns. Handle expiration, refunds, transfer, duplicate/out-of-order webhook events and restores.

## Market and monetization

The handoff's claim that nobody has built persistent competitive standings is too strong. [Squabbit documents recurring leagues and season-long standings](https://squabbitgolf.com/help/groups/league/leaguesGroup.html). This does not prove it has Linksman's exact pairwise ledger, but it means the opportunity must be validated through ease of use and repeat group adoption, not assumed category uniqueness.

Likewise, basic GPS is not automatically a compelling subscription: [18Birdies lists GPS, scoring and round statistics among free features](https://help.18birdies.com/article/661-premium-features). Treat $40–50/year as a price hypothesis. Ask golfers who already use a watch/rangefinder or free GPS what would make this an additional purchase.

My recommendation: preserve free participation and trial paid personal value after groups retain. Candidate value includes useful rivalry analysis, polished offline course tools where coverage is verified, and season recap exports. Keep earned results accessible enough that ending a subscription does not damage the social loop. Avoid promising a permanent exhaustive free feature list before the economics are tested.

Illustrative arithmetic, not a forecast: at $49/year, 100 paying users generate $4,900 gross annual revenue; 1,000 generate $49,000. At an assumed 5% paid conversion, those require 2,000 and 20,000 active users respectively. These figures exclude store fees, refunds, taxes, hosting, acquisition and your time. Track conversion and retention before extrapolating.

The most useful product additions are invitation links/QRs that preserve the destination through onboarding; remembered foursomes, tees and game settings; a short explanation of each award; participant-approved corrections; and an optional shareable rematch/result card. Evaluate one designated scorekeeper or guest entry only with a clear consent/identity model. These reduce friction in the actual Saturday game.

## OSM and store assumptions

Keep OSM, but label derived yardage as approximate until course/tee verification. A plausible yardage distribution does not validate each tee. [OSM describes golf-hole ways as an approximate standard playing path](https://wiki.openstreetmap.org/wiki/Tag%3Agolf%3Dhole); that is not proof of tee-specific measured yardage or accurate front/back green geometry. Verify complete course layouts rather than dividing hole count by 18. Track provenance, tee identity, confidence and corrections; one group's edit should not silently rewrite every player's course data.

No license purchase does not mean zero operating cost. Budget import, validation, hosting, bandwidth and maintenance. [OSM's license](https://www.openstreetmap.org/copyright) includes attribution and share-alike obligations; assess derived database distribution, not just a label on a map.

Keep brass as points, with no monetary conversion or redemption. Replace the external pitch “running bet” with something like “Your foursome. Every round. A rivalry that lasts.” The claim that a money-like name guarantees approval is unsupported: [Apple evaluates functionality under its review guidelines](https://developer.apple.com/app-store/review/guidelines/). Align marketing, app behavior and review notes.

Move Android testing forward. For qualifying new personal accounts, [Google requires at least 12 continuously opted-in closed testers for 14 days before applying for production access](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en). Account eligibility and current submission requirements need checking at release time. Finalize app identifiers before distributing store builds.

## Recommended delivery order

1. **Reliability baseline:** fix score hydration/persistence, authorization, completion and realtime. Add meaningful scoring regression tests and database role tests. Test signup, resume, airplane mode and two-device scoring on iOS and Android.
2. **Narrow rivalry beta:** one clear format (net stroke is a small initial rules surface), agreed free allowances, server-computed brass, result explanation, head-to-head history and invitation flow. Seed only the courses beta groups actually play. Defer maps, Wolf and the full challenge catalog.
3. **Repeat-round experiment:** recruit roughly 8–12 real Melbourne groups and observe several normal rounds. Measure invite-to-join, first completed group round, time/effort to enter scores, disputed results, and whether the group returns without reminders. A proposed internal gate is at least half of activated groups returning for a second round within their normal playing cadence, with no unresolved score loss. This is a decision threshold to test, not an industry benchmark.
4. **Retention expansion:** circles/seasons, a few requested formats, share cards and useful reminders based on observed behavior.
5. **Paid-value experiment:** demonstrate the proposed Club features, test willingness to pay and real conversion, then implement subscriptions with server-controlled entitlements.
6. **Store release:** verified device flows, account deletion/recovery, accessibility, moderation operations, privacy disclosures, purchase restore/refund behavior, operational monitoring and store materials.

## Verification performed

- `npm run typecheck`: passed.
- `npm run lint`: passed with 0 errors and 63 warnings (mostly formatting; also hook dependency and unused-variable warnings).
- No automated application test files or test script found in the inspected repository.
- No fresh native export, simulator/device test, deployed database test or mutation was performed in this review. Prior export success is reported in the handoff, not independently reproduced here.

The next implementation task should be scoring and authorization reliability. Build the first trustworthy rivalry loop immediately after that, then let real groups determine which expansion earns its place.
