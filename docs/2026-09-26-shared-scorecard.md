# Shared solo and group scorecard

The solo layout is now the shared scoring face: large PAR heading, editorial score numeral, outlined stroke controls, topographic background and the same running totals. Group mode adds player tabs above it and games below the primary action. One scorekeeper still records everyone’s round.

## Behavior

- Removed Drive landed in / fairway entry controls from scoring. Previously saved fairway data is preserved.
- Group tabs show each player’s recorded score for the current hole, or a dash when unrecorded.
- Continue saves the selected player and moves to another unrecorded player before advancing the hole. Hidden, untouched default scores are not bulk-confirmed.
- Existing draft persistence, retry protection, group completion, game calculations and Brass recording remain in use.
- Optional group putts, GIR, notes and clearing a score live in a Stats & notes sheet.
- Removed repeated navigation coaching from scoring, the feed empty state, lobby, game sheets, ledger and notes. Retained errors, save status, game rules and substantive scoring information.

## Design direction

One familiar scoring surface, with extra group functionality revealed only where it is needed. Native sheets handle optional detail; selecting a player changes the scoring context without introducing a new page.

## Verification

- TypeScript passes; 63 automated tests pass.
- ESLint: zero errors, 14 pre-existing formatting warnings.
- Added tests for cycling through unscored players, returning to skipped players and shared scorecard totals.
- Inspected solo and group layouts and switching players in the iPhone 16e simulator. Fixed a score-numeral sizing issue found there.
- Simulator scroll gestures did not reliably move the screen during this pass; lower-screen scrolling and the full round flow still need a physical-phone check. No existing golf scores were deliberately changed during the visual check.

## Next product improvements

1. A concise round recap that combines final scores, game winners and net Brass.
2. Reliable offline scoring with clear pending/saved state.
3. Consistent optional-detail sheets throughout the app, keeping primary screens focused on the next action.
