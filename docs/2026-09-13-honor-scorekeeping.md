# One scorekeeper, shared rounds and Brass

The owner’s September 13 request supersedes the consent/confirmation workflow in the earlier rivalry specs and Skins testing notes.

## Product behavior

- Follow a golfer to see their shared rounds. A follow-back is unnecessary. Private rounds and blocks retain their restrictions; groups with live sharing off appear after the group finishes.
- Create a group, add existing accounts or named guests, and score every player from one account. Guests need no login. Account players receive their own recorded scorecard/profile statistics.
- A group member can correct any participant’s score or optional statistics. The server records who last edited the score. Finishing the group marks every fully scored participant finished in one transaction.
- Gross Skins is optional for 2–4 players over 9 or 18 holes. Set any positive Brass stake up to 1,000,000, with two decimal places. Net Skins supports explicit stroke allowances and hole difficulty order.
- A skin pays the entered stake from each opponent. In a three-player game, winning a 50 Brass skin means +100 for the winner and −50 for each opponent. Ties carry; final ties expire.
- Side games are simple editable entries: game name, hole, from player, winner, amount. Closest to pin for 50 records exactly 50 Brass. Entries can be corrected or deleted by the group without participant confirmations.
- Skins settles automatically when scoring is complete. Corrections reverse and recompute prior awards. The ledger keeps totals consistent and retains Skins correction history. There are no payments or cash-out features.

## Implementation

Migration `20260914000001_honor_scorekeeping.sql` is deployed. Guest identities are separate from auth accounts. Composite participant foreign keys keep scores attached to the correct round/player. Server permissions authorize group editors while rejecting outsiders. The former consent RPCs are unavailable to authenticated clients.

The group score screen shows all players on the same hole, with durable local recovery, automatic saves, optional stats/notes, and an explicit save-and-continue action. Advancing returns to the hole header. Game settings and side entries live under Games & Brass. Saved ledger entries link back there for editing.

Network requests have a 20-second timeout and preserve caller cancellation. Existing query retry controls can recover after a stalled request.

## Validation

See the [native visual walkthrough](2026-09-13-visual-walkthrough.md) for screen coverage and remaining limitations. All 56 tests, TypeScript checks, changed-file lint, and iOS/Android production bundle exports passed. Automated database tests cover honor scoring, guests, one-way following, outsider denial, score corrections, decimal Brass editing/deletion, roster changes, automatic settlement, and editor-account deletion.
