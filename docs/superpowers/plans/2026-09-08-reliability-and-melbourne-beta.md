# Linksman: reliability to Melbourne beta

## Product direction

Support twosomes, threesomes and foursomes in the primary experience. Circles may contain more people, with different combinations playing each round. Keep the existing Linksman identity, points-only brass, OSM-first course data and free social participation.

Design for golfers with different levels of comfort using apps. Default to scoring and a clear match result. Use readable text, high contrast, large labeled controls, saved-state feedback, optional details and remembered settings. Evaluate designated scorekeeping with explicit player consent; it requires a real permission model, not a client-only switch allowing arbitrary score edits.

## Delivery milestones

1. **Reliable scoring and secure multiplayer.** Hydration, ordered writes, navigation saves, durable offline recovery, database authorization, consistent completion, account lifecycle and realtime. Tests must exercise errors and multiple users, not just successful builds.
2. **First rivalry loop for 2–4 players.** A small, fully specified game engine, free agreed provisional allowances, authoritative and idempotent brass calculation, explainable results, corrections and head-to-head history. Decide exact tie/payer/nine-hole rules before implementation. Two-player match play and 2–4-player net stroke are candidate initial formats; avoid implementing the whole catalog at once.
3. **Melbourne beta.** Recruit existing local groups, including older golfers and less frequent app users. Test twosomes and changing group sizes. Observe setup/scoring without coaching, and measure second-round use within each group's normal cadence.
4. **Retention and Club.** Add seasons, useful sharing and requested formats after observing repeat use. Validate paid personal value before building the full subscription offering. Fair stroke allocation remains free.
5. **Store release.** Device validation on both platforms, final identifiers, account recovery/deletion, moderation, accessibility, privacy/store disclosures and purchase lifecycle tests when payments exist.

## First implementation slice

- Shared scoring draft controller: waits for hydration, ignores background reads after hydration, preserves recorded par/putts, and serializes writes.
- No automatic par record solely from opening a hole; advancing explicitly confirms the displayed score.
- Solo/group next, finish and explicit exit actions flush pending scores. Navigation removal guards also flush pending changes and keep the screen open after failure.
- Visible save status and retry action, with loading/error states before editing.
- Group round-row subscription and subscription-time refresh; lobby uses declarative navigation.
- Regression tests for cold loading, background reads, fast advance, unchanged par confirmation, slow concurrent saves, failures/retries and player/hole isolation.

This slice does **not** provide durable offline storage, resolve multi-device conflicting writes, harden database permissions, or change completion transactions. Those remain blockers before a public beta. Local drafts currently survive an ordinary failed save while the screen stays open, not an app process being killed.

## Phone acceptance script for this slice

1. Cold-open a recorded par-5 hole with seven strokes and two putts. Verify no fallback four overwrites it and the putt count stays intact.
2. Open an unrecorded hole; exit without editing. Verify it was not recorded. Open it again and advance without changing par; verify that deliberate confirmation records the displayed score.
3. Tap plus/minus and immediately advance, jump holes in solo edit mode, finish, exit or use system back. Verify the latest score persists.
4. Slow the network and edit again during a save. Verify the later edit wins and advancing waits.
5. Disconnect, edit and try to leave. Verify an understandable failure and retained score. Reconnect and retry. Do not present process-kill recovery as supported yet.
6. Start a group round from another phone; verify guests leave the lobby. Confirm that the deployed Realtime publication includes `rounds`; source subscriptions alone do not prove deployment configuration.
7. Repeat on iOS and Android, including a small display, larger system text and screen reader labels. Observe older testers without coaching.

## Responsibilities

Engineering work, tests, build preparation and product iteration can be handled in this workspace. The owner supplies real golf feedback, recruits testers, manages developer-account identity/payment steps, and approves final business/store decisions. No changes are published merely because a local implementation is complete.

## Local verification of first slice

- Seven scoring-controller regression tests passed with `npm test`.
- TypeScript passed; changed implementation files lint clean.
- iOS and Android JavaScript/Hermes exports passed. These are bundle checks, not installed-device tests.
- `git diff --check` passed. Earlier owner changes were preserved.
- No database migrations or deployments were performed. Phone acceptance remains outstanding.

## Second slice: database authorization and completion

Prepared migrations `20260908000001_round_authorization.sql` and `20260908000002_solo_completion.sql` locally. They prevent membership/score identity changes, restrict score updates to active participants, narrow host force-ending to an authenticated RPC, pin legacy function search paths, enforce spectator visibility across rounds/players/holes, prevent completed-round rejoining, and repair account-deletion foreign keys. Participants retain access to their own round even when spectator visibility is disabled. Spectators are denied if the host or an active participant has blocked them. A live-hidden group becomes spectator-visible under its normal privacy rules after all joined players finish or withdraw and at least one finished result exists.

Solo finalization now requires every hole, derives totals from stored scores and finishes the player's record in one transaction. Existing saved solo participant rows marked joined are backfilled to finished. The client invalidates Today/statistics after completion and displays finalization errors rather than leaving an unhandled rejection.

The database tests execute all migrations unchanged in isolated PGlite PostgreSQL with pgcrypto/pg_trgm. Minimal Supabase auth schema and roles are simulated; this does not validate the hosted project's grants, Realtime publication, Edge Function deployment or platform-specific behavior. Tests cover anonymous/null-auth denial, hostile record movement, own-score permissions, live/private/blocked visibility, host-only force-end, atomic completion, completed code redemption and deletion with scores/invitations.

Before hosted application: inspect schema/migration drift and backup availability; apply in staging, regenerate database types, repeat role tests and the two-phone smoke test. Local success is not a claim that the hosted database has been patched. Shared history deletion when a host removes their account is still a product decision for the ledger phase. Durable offline recovery, transactional creation and wider account/cache hardening remain outstanding.

## Third slice: pending-score recovery and GitHub checkpoint

Pending edits now write to an AsyncStorage journal scoped by player, round and hole, before server writes. Matching server acknowledgments remove only that version of the pending score. On reopening the same hole, a pending local score takes priority over the fetched server score. Corrupt/unreadable journal data fails visibly instead of silently resetting the score. Disk writes occur on edits, not only after the network debounce; OS termination before a disk write completes is still outside the guarantee.

This supersedes the first slice's process-restart limitation once the journal write has completed. It does not yet enable navigating/finishing an entire round offline, restore all query/auth context offline, synchronize other unopened holes in the background, or resolve conflicting edits made on two devices. Existing navigation guards continue to require server acknowledgment.

Phone test: load a hole while connected, disconnect, change its score and allow the local write to complete; terminate the app, reconnect, reopen that round/hole as the same player, and verify that the recovered edit is saved. Repeat with another account to confirm drafts are isolated. Test low-storage failure and retry where practical.

The GitHub checkpoint contains source, tests and migration files; pushing it does not deploy Supabase migrations or publish app builds. The README describes current setup and limitations instead of the old Phase 0 placeholder. GitHub Actions setup remains a later task.

## Hosted verification and iPhone test preparation

The linked `golf-app-dev` project was inspected through Supabase CLI. Its 20 existing migration versions matched the repository. Hosted inspection confirmed anonymous execution privileges on `force_end_round` and an empty scoring Realtime publication. The dashboard reported no managed backups, so a private local snapshot of scoring rows and preflight schema metadata was saved under gitignored `.local-backups/`. This is a targeted recovery snapshot, not a complete Postgres backup.

All three September 8 migrations, including `20260908000003_scoring_realtime.sql`, were rehearsed against the hosted database in one rolled-back transaction, then applied through `supabase db push`. Post-application checks confirmed the new migration history, removal of anonymous/PUBLIC force-end grants, and publication of rounds, round_players and round_holes. The 9 round rows, 9 player rows and 126 score rows were compared before/after and were unchanged. There were no solo rows needing the backfill. Database types were regenerated from the hosted schema.

Expo's compatibility check identified SDK-mismatched clipboard and Babel packages plus outdated patch versions. Dependencies were aligned using `expo install --fix`; compatibility and type checks passed. An Expo Go LAN server was prepared for the owner's iPhone. Physical-device interaction and multi-device Realtime delivery remain unverified until phone testing happens.

## SDK 57 correction after physical-device connection

The owner's iPhone reported Expo Go SDK 57 and rejected the SDK 54 project. The previous dependency check only validated packages against SDK 54; it did not establish compatibility with the installed phone app.

Upgraded Expo to SDK 57 with React Native 0.86.3 and React 19.2.3, aligning Expo modules, animations, router and tooling. Migrated the score navigation guard to Expo Router's own navigation context, removed the external React Navigation dependency, moved splash configuration into its plugin, removed obsolete configuration fields and added the stylesheet declaration required by TypeScript 6. Updated hook memoization to pass the newer React lint checks.

Validation: 22 tests passed; typecheck and ESLint error checks passed (existing formatting warnings remain); Expo Doctor passed all 21 checks; iOS and Android Hermes exports succeeded. The LAN server's iOS manifest reports SDK 57.0.0. Physical iPhone launch and scoring acceptance still require the owner to retry. Dependency audit remediation remains a separate launch-readiness task.

## Round creation regression and layout rollback

Owner testing reached solo setup but starting a round failed. Restored the original setup layout at the owner's request. Kept only an alert for a failed creation request, without asserting a network cause.

Reproduced SQLSTATE 42501 in a new regression test for authenticated INSERT ... RETURNING followed by host membership insertion. The STABLE can_read_round helper cannot see the newly inserted row through its table lookup during RETURNING's SELECT-policy check. Migration 20260908000004_round_creation_visibility checks the new row's user_id directly for ownership and preserves the helper for spectator access. The test failed before this fix and passed afterward; all 23 tests pass.

Rehearsed separate round and membership requests against the hosted database in a rolled-back transaction and applied the migration. No persistent test rounds were created. Physical-device retry remains the final acceptance check.

## First successful iPhone round and scoring scroll fix

The owner confirmed completing and submitting a nine-hole solo round on iPhone. They reported that the notes section was partly clipped and vertical scrolling was unavailable. Replaced the solo scoring body's fixed View with a bounded vertical ScrollView and bottom padding; retained the existing layout, fixed save status and keyboard-aware notes modal. The edit-mode horizontal hole selector does not grow vertically. Group scoring already uses a vertical ScrollView.

Typecheck, targeted lint and the live iOS bundle compile pass. The owner still needs to confirm notes are fully reachable on the physical screen.

## Onboarding and password recovery

Owner testing identified a repeat-onboarding redirect, clipped home-course list/skip footer, awkward friend-search keyboard interaction and missing password recovery.

Completion now cancels stale profile reads, awaits a returned confirmed profile, and publishes it to the query cache before navigation. Failures keep the user on the final step with retry feedback. Regression tests verify that stale reads cannot undo completion and failed writes cannot mark a profile complete.

CoursePicker now scrolls all sections, including nearby courses, inside a bounded keyboard-aware area. The onboarding skip footer is within the safe area and outside the scrolling list; its colors match the ink screen. Repeated course taps are guarded during saves. Friend search has a bounded keyboard-aware scroll area, a correctly sized field, keyboard Done action and explicit dismissal control. ScreenContainer uses explicit flex/safe-area styling and appropriate status-bar contrast on light/dark surfaces.

Sign in now includes Forgot password. The recovery screen requests an email code, verifies it with type recovery using an isolated non-persisted auth client, and only then permits a password update. Verification does not log the user into the main app. The user returns to sign in afterward. Error/retry, code resend, password confirmation and expired-code handling are included. The hosted recovery email template was changed to include the OTP, and the same template is tracked for local Supabase. No recovery emails were sent during implementation and no existing account passwords were changed.

Hosted settings currently use eight-digit codes expiring in one hour and have no custom SMTP sender. The owner explicitly deferred domain/email-service setup until launch preparation. Supabase's default sender only supports project-team addresses with restrictive delivery limits; general tester recovery delivery remains blocked until custom SMTP is configured. See https://supabase.com/docs/guides/auth/auth-smtp.

Validation: all 27 tests pass, typecheck and ESLint error checks pass, and iOS/Android Hermes exports succeed. Physical iPhone acceptance and actual recovery-email delivery remain to be tested by the owner.

## Stale phone build and NativeWind development-server crash

The owner reported unchanged onboarding behavior and confirmed Forgot password was absent, indicating the phone had not loaded the previous change. The old Metro session exposed a crash in NativeWind/react-native-css-interop's virtual-module change event: SDK 57 Metro expects addedFiles metadata that this integration does not supply.

Enabled NativeWind's forceWriteFileSystem option instead of patching dependencies. Restarted Metro with a cleared cache on port 8082 to distinguish the fresh connection from the old 8081 session. Verified the served iOS development bundle includes the new onboarding-completion helper, Forgot password and keyboard controls. File-based style generation may require reload/restart to see styling edits; do not assume hot style refresh proves delivery.

Added a shared SearchField with an always-visible Done control beside the input, explicitly blurring the field and dismissing the keyboard. Used it for course search, onboarding friends and the Search tab. This avoids relying on an iOS accessory toolbar. The existing onboarding fix still needs acceptance on the current physical-device bundle; earlier reports from the outdated bundle do not establish whether it resolves the redirect.

## Three-player group visibility acceptance

Owner confirmed a three-player group with two finished scorecards and one unfinished participant; scores look correct to participants. Read-only hosted inspection confirmed live_visible=false, is_draft=false, visibility=mutuals, two finished and one joined. The spectator rule intentionally withholds the entire non-live round until all active participants finish or withdraw. The legacy mutuals enum currently uses one-way following; reciprocal following is not required.

Found and fixed a separate other-profile defect: recent rounds and counts queried rounds.user_id, excluding rounds the profile owner joined as a guest. They now query the security-invoker user_round_summaries view, filter joined/finished membership, and display that participant's totals. Cache keys include viewer identity and pull-to-refresh updates the list/count. No database visibility rule or existing round setting was changed.

Added a regression for a follower of a finished guest, without following the host or any follow-back, reading the guest's correct score after group completion. All 28 tests pass, typecheck and targeted lint pass. Phone acceptance should finish the remaining participant and refresh the outside follower's feed/profile.
