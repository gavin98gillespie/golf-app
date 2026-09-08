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
