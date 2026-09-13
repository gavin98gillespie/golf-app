# First playable skins and Brass ledger

> Superseded where it requires invitations, individual scoring or confirmations: see the September 13 honor-scorekeeping implementation in `docs/2026-09-13-honor-scorekeeping.md`. The owner explicitly requested one-person operation.

Implemented September 13, 2026 on `codex/reliability-and-score-recovery`.

## What is available

- A new group lobby can stay **Score only**, or the host can add **Skins** after 2–4 players join.
- Gross scoring is the default. Net scoring requires explicitly agreed strokes over the played 9/18 holes and a complete hardest-to-easiest hole order. No guessed indexes, slope, or official handicap claims.
- Every game participant accepts the saved rules before the host starts. Changing rules clears acceptance. Changing the joined roster requires the host to save the rules again.
- Scores still use the existing durable saving flow. Skins resolves only fully scored holes in sequence. Missing scores never become par.
- One won skin transfers one Brass from each opponent. Ties carry; final tied skins expire. Brass has no cash value.
- Each participant finishes their scorecard, then opens **View skins** from the group result and confirms the current result. The final confirmation atomically posts pairwise awards.
- **Today → Rivalry ledger** shows net Brass per opponent and an audit of individual game awards/corrections. Confirmed tied games appear with zero Brass.
- A score correction reverses previously posted awards and requires fresh confirmations. Retrying confirmation does not post again. Withdrawal, score deletion, or round deletion voids the game; audit rows remain. Deleting an account does not cascade away other players’ audit history; names fall back to Former player.
- Existing rounds are not retroactively converted into games. Match play, closest-to-pin challenges, circles, seasonal standings, subscriptions, cash amounts, and payments are not included in this slice.

## Verification completed

- 45 automated test results passed, including the existing scoring/auth/onboarding suite.
- Actual PostgreSQL migrations and authenticated roles tested in isolated PGlite: consent, unauthorized writes, outsider reads, missing scores, stale confirmations, deterministic calculator parity, duplicate confirmation, corrections/reversals, withdrawal, account deletion, roster change, and zero-award ties.
- Server vs TypeScript calculator parity covered gross nine-hole and net 2/3/4-player games across nine and eighteen holes.
- TypeScript and lint on modified application files pass; repository-wide lint has existing formatting warnings but no errors.
- iOS and Android production bundles exported successfully. This is compile validation, not an App Store build or physical-device UI test.
- Migration `20260913000001_skins_ledger.sql` deployed to Supabase `tpbgtuhubrqzlvbvusqx`.
- A hosted transaction created temporary players, configured/accepted a game, scored all holes, confirmed it under each authenticated role, verified nine Brass, and rolled everything back.

## iPhone test to run next

1. Open the updated Expo preview. Today should show **Rivalry ledger**.
2. Start a fresh nine-hole group round. Join with a second account/device, then select **Add skins → Gross scores → Save rules** as host.
3. Accept the rules as both players. Check that the host cannot start before both accept, then start.
4. On hole 1, both score 4. On hole 2, A scores 4 and B scores 5: A should win the carried skin plus hole 2, a net **+2 Brass** against B. These amounts remain provisional.
5. Finish A’s card first. No Brass should post while B is still scoring. Finish B’s remaining holes.
6. From the group result, open **View skins**, review the hole outcomes, and confirm with both accounts. Check **Today → Rivalry ledger**: the two accounts should see opposite net amounts.
7. Correct a score and verify the prior awards reverse immediately. Confirm the new result with both accounts and check the audit.
8. Repeat with three players. A two-skin win transfers two Brass from each opponent: **+4 / −2 / −2**.
9. Check the net-rules keyboard Done toolbar, long names, larger text, scrolling, and returning to scoring. These still need physical iPhone validation.

Polling runs only while the relevant screen is visible and the app is active (five seconds for games, ten for ledger). Stale confirmations are rejected on the server. Device usability and genuine concurrent network stress remain follow-up validation; the test engine is not a multi-connection load test.
