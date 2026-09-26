# One scorecard, integrated games

## Product behavior

- Navigation reads Feed, Play, Games, Me. Feed cards keep their full-card tap target without redundant “View round” copy.
- The group lobby has a compact four-game row instead of a full Skins panel. Skins configuration opens in a sheet. Other games show their rules and carry the chosen game into the scorecard; no result is awarded before a winner is recorded.
- Every started group round uses the normal group scorecard. Legacy game routes now open tools on that scorecard. Scores are entered once into the same round/player/hole records used by golf statistics and Skins.
- The scorecard includes Skins, closest to pin, longest drive, and custom-game controls. Skins shows the current hole's result; manual results for the current hole appear alongside the controls.
- Closest/longest are honor-system winner-entry forms, not distance measurement or stroke-scoring screens. The scorekeeper selects payer, winner, hole and Brass. Built-in names are fixed; custom challenges have an editable name. Each result transfers the entered amount between the two selected players, consistent with the existing ledger model.
- Gross/net uses a compact segmented control. Secondary settings actions are plain, with one primary save action.
- Brass has a reusable coin and amount treatment on Games, Me, the ledger, round summary and scoring screen. Round amounts combine live Skins and manual entries without adding settled Skins ledger awards twice. Overall totals are net ledger results, not a cash wallet.

## Design

Retain the dark green, cream, serif type and brass palette. The scorecard remains the primary workspace; game sheets are secondary tools. Game controls have equal widths and distinct emblems. Native sheet transitions, disclosure controls and existing tab press feedback provide interaction without decorative animation.

## Validation

- TypeScript: pass.
- Automated suite: 60 tests pass, including two new combined-Brass calculation tests.
- ESLint: zero errors; 14 pre-existing formatting warnings outside this work.
- iOS and Android JavaScript exports: pass. These are not signed native release builds.
- iPhone 16e simulator: checked Feed label/card footer, Games balance, profile balance, existing group scorecard, longest-drive form, gross/net settings and return to the same scorecard. Existing golf scores and game settings were not deliberately changed during the visual walkthrough.
- Numeric fields retain iOS Done accessories; forms are in keyboard-avoiding, scrollable sheets. Full software-keyboard behavior still needs a physical iPhone check because the simulator did not display its numeric keyboard during this pass.

No database migration or real-money payment feature is introduced. Existing backend calculation/authorization tests remain in place. Full new-round field testing, including saving a new side-game result on the phone, remains the next acceptance check.
