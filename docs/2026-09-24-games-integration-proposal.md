# Games and rivalry integration — proposal for feedback

Status: proposed, not approved for implementation. The bottom navigation styling change is separate and implemented.

## Starting point

The app already has group scoring from one account, guests, automatic Skins calculation with adjustable Brass stakes, editable manual side-game transfers, and a persistent opponent-by-opponent ledger. The main gap is making these capabilities a natural part of a round instead of separate forms.

## Proposed journey

1. **Start:** choose course and players as usual, then an optional Games section. Start with Score only or Skins. Show a plain summary of participants, amount and tie rules. Remember settings for the next round, but show what will be reused.
2. **Score:** keep all players on one hole. A small Games row shows that hole’s outcome, carryover and Brass change. “Add a side game” opens a short sheet already set to the current hole and group. Scores are entered once and drive the automatic results.
3. **Side games:** presets for Closest to pin, Longest drive and Custom. Choose the participating players, amount and winner. A game can be set up before its result is known; record the winner afterward. Only selected players contribute. Amount wording must distinguish “50 Brass total” from “50 Brass from each opponent,” and show the exact transfers before saving. A 50-total pot needs payer contributions specified; the app must not silently multiply it by the group size.
4. **Finish:** one recap combines scores, game wins and net Brass for each player. The scorekeeper finishes once; completed results update the ledger without individual approvals. Score corrections automatically recalculate score-based games. Manual side-game corrections update their own transfers.
5. **Return:** keep the full ledger in Me; add a small “Rivalries” link beside Home’s round-list heading so the key feature is one tap away without another bottom tab. A round in Home can include one short game-result line. Detailed Brass history remains for participants, not automatically exposed to every follower.
6. **Rivalry detail:** show the balance against that person, last result, game breakdown and round history. Offer Add result for a quick entry without replaying a full scorecard. Permit correction/removal with a simple last-editor label. Show a corrected result once by default; retain technical reversal history under details. Reuse a guest identity between rounds so its history does not split.

## First implementation slice

Build one complete path before adding formats: three-person Skins round plus a closest-to-pin side game, record one winner, finish the round and see the right rivalry totals. This requires structured side games (participants, funding and winner) layered over the existing transfer model, plus the in-round results strip and unified recap. Keep live projections visibly separate from completed ledger results to prevent double counting.

Next add two-person Match Play, driven by the same hole scores. Defer Nassau, Wolf, presses, seasons and tournaments until repeated real rounds validate the core flow. Longest drive and Custom can share the manual-winner engine; they do not need distance measurement for the first version.

## Rules that carry forward

One scorekeeper, accounts or guests, honor-system editing, no acceptance workflow. Brass amounts are literal, including decimals. Brass is a record of results; there is no payment handling. Stakes, payouts and carryovers should always be stated in plain language.

## Feedback requested

Does this flow put games in the right places? Which matters most for the first polished version: Skins, closest to pin, or Match Play? For closest to pin, should a typed amount default to the total prize or the amount each opponent contributes? Recommendation: default to total prize, with contributions shown explicitly.
