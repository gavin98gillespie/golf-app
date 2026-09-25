# Games tab and quick rules — September 24

## Minimal design revision

Four equal-width navigation targets now sit on one baseline: Home, Play, Games, Me. Play has a Brass flag medallion; Games has a matching trophy medallion. The game catalog shows names only, a ledger link and round actions. Selection replaces the catalog with the game title, outlined How to play button, and start/continue actions. Course names and explanatory paragraphs are removed. Multiple active rounds can be chosen in a separate sheet using round number, date and hole count. Skins explanations stay in the rules sheet; hole results are collapsed initially. Critical amount labels, errors and input guidance remain.

Verified the catalog, equal navigation spacing, selected-game screen and rules sheet in an isolated native iPhone component preview, then removed the preview. TypeScript, changed-file ESLint and both mobile bundle exports pass. Authenticated round submission was not repeated for this visual revision.

## Initial implementation (superseded layout below)

Implemented the Games destination alongside Home and Me, preserving the raised round action with a separate touch target. Games links to the existing rivalry ledger and offers Skins, closest to pin, longest drive, and custom games. A selected game can use an active group round or begin group setup. Game intent survives course selection, including adding a course, and appears in the lobby.

“How to play” opens a cream, scorecard-style bottom sheet: four numbered rules, a literal Brass example, scrolling for smaller screens, and a fixed Done control. Rules are also accessible in existing Skins and side-game forms. Closing the sheet preserves the current selection/form.

Skins still uses the existing automatic score-based engine. The other three options use the existing manual payer-to-winner Brass entries; selecting a game prefills the result form but does not save anything. In a new group, add players and play first, then record the side-game result. These are not standalone games or automatic pooled prizes. Match Play is not implemented and is labeled as coming later. No database migration or calculation changes were made.

Validation: TypeScript, changed-file ESLint, all 58 existing tests, and iOS/Android production bundle exports passed. Native iPhone 16e component preview verified the Games layout, opening/closing the Skins rules card with selection retained, full rule/example visibility, and the separate New round sheet. This was an isolated temporary signed-out component fixture, removed afterward; it was not a complete authenticated round walkthrough. Simulator authentication repeatedly returned a native network-connection-lost error, including after restarting the device. Direct backend sign-in with the same temporary account succeeded. Temporary accounts were deleted and cleanup verified. Retest authenticated Games → round → result → ledger on the physical phone.
