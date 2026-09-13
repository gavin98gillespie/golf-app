# Linksman: games that build a rivalry

Date: September 13, 2026.
Status: product direction and proposed release contract, with the skins calculator implemented locally. The user confirmed Brass points only for this version. No live games or persistent Brass ledger have shipped.

This refines the September 7 rivalry design and September 8 review. It supersedes the assumptions that no competitor offers a ledger, that a proprietary handicap must precede games, that a broad game catalog is the first release, and that GPS/maps must come before the rivalry experience. Other recommendations below remain product hypotheses, not user research findings.

## What Live Tourney teaches us

Research covers public product/pricing material and indexed help articles, not a logged-in trial or the user's specific video. The exact video link has not been supplied. Some help pages could be found in search but failed when opened directly. Vendor claims do not establish retention, profitability or independently verified usability.

Live Tourney explicitly offers browser-based live scoring without a download, event/league management, registration, reporting and GHIN integration. Its organizer tools include side games and payout calculation. The takeaway is a simple player experience backed by more capable organizer tools. Linksman should borrow that division of responsibility: agree the game before play; during play, enter a score and see what changed. [Product](https://www.livetourney.com/product)

Its published pricing is $199 per event and $2,700 annually for its highlighted recurring plan, aimed at courses, leagues and organizers. This supports a different purchasing context from a few friends deciding whether to use a new app. Those prices are not evidence of what a casual golfer will pay for Linksman. [Pricing](https://www.livetourney.com/pricing)

Indexed help describes QR-code access and scorecard navigation. We should test a share link and a browser spectator view; guest scorekeeping can follow once its identity and permission model is defined. Do not implement anonymous access by weakening database policies. [Player help](https://support.livetourney.com/player-experience/9oiAhXYCE8NT6aWpEKNMNv/online-leaderboard--scorecard-navigation/wttQ6a1W4Qa1MaNsutx84G)

## The competition changes our claim

18Birdies documents automated group games, including skins, match play, Nassau and Wolf, with stroke allowances. A game catalog alone is not a defensible distinction. [18Birdies games](https://18birdies.com/clubhouse/golf-games/track-your-golf-games-on-the-course-with-18birdies/)

Press publicly markets multiple side games, a running ledger and per-player subscriptions required to participate. That is closer to our proposed category than an event-management product. Its claims have not been independently verified, but they are enough to retire “nobody has built the ledger.” [Press](https://pressbet.golf/)

Our hypothesis: regular groups will prefer an app that is unusually easy to join, explains every result, works for changing combinations of 2–4 friends, and makes their next encounter interesting. We must validate this through repeated rounds, not by counting features.

## The product promise

“Every round adds to the rivalry.”

The central screen answers three questions:

1. Who am I up or down against?
2. What happened in our last round?
3. What changes if we play again?

Brass is a signed competitive balance, not a wallet. Everyone starts level; a negative total means behind, not indebted. No purchase, redemption, conversion rate, cash-entry field, payment link or balance top-up. The ledger should say “Alex leads by 4 Brass,” not “You owe Alex 4.” The side-bet experience comes from agreeing a challenge and seeing a result, with points as the recorded outcome.

Use “Games” and “Side challenges” in the app. “Mini games” can describe the idea in conversation but should not imply distracting arcade tasks while someone is playing golf.

## First playable release

One game selected per group round. Scoring without a game remains fully supported. Do not add all the proposed formats at once.

| Capability                 | First release decision                           | Reason                                                                              |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Skins                      | First implementation, 2–4 people                 | Frequent meaningful outcomes and carryovers; works for the tested threesome         |
| Match play                 | Next game, two people                            | Clear win/loss story for twosomes                                                   |
| Net stroke                 | Subsequent simple option, 2–4                    | Familiar total-score comparison                                                     |
| Closest to the pin         | First side challenge, designated par-3 holes     | Easy to explain; requires manual confirmation                                       |
| Longest drive              | Second challenge, designated holes               | Same confirmation model                                                             |
| Nassau                     | Later, after segment and tie rules are specified | Front/back/overall are three agreements; nine-hole interpretation must be explicit  |
| Wolf, presses, multipliers | Later                                            | Partner selection, changing liabilities and exceptions increase on-course decisions |
| Circles and seasons        | After automatic head-to-head works               | A group must get value without naming a circle or administering a season            |

For a first game, show one short explanation and an example. Once a group has played, remember its last settings and offer “Play this game again.” Never silently reuse allowances or participants without displaying them for agreement.

## First-round journey

### Before the round

Choose course and 9/18 holes, then invite 2–4 players. Select Skins or Score only. Show these settings together:

- Players participating in the game (not just everyone invited to the round).
- Gross scores or agreed net strokes for these exact holes.
- Ties carry; any final unresolved skins are not awarded.
- One Brass per skin from each opponent.
- Live sharing choice.

Each participant accepts the game/rules snapshot. Host setup is not consent on behalf of another account. Rule changes before play clear earlier acceptances. After the first accepted score, roster and rules lock. A later joiner can score socially but cannot silently change the game already underway.

The setup summary should explicitly show total possible per-opponent movement: up to 9 Brass over nine holes or 18 over eighteen for the initial fixed-unit skins variant. Do not imply that one skin always equals one total Brass in groups of different sizes.

### During play

Retain the working large score buttons and save feedback. Add a compact game strip:

- “Hole tied · 2 skins carry forward.”
- “Gavin wins 3 skins · +6 Brass.”
- “Waiting for Chris’s hole 4 score.”

The normal screen should not require opening a separate leaderboard after every hole. Tapping the strip explains the result using gross score, strokes received and resulting net score. Use optional details rather than tiny abbreviations.

A score alone should update every selected game's calculation; never make players score the same hole twice.

Keep a player's saved/completed card separate from the game state. In the tested three-player scenario, two players can finish their cards while the game remains provisional waiting for the third. No automatic Brass award for missing scores, and no forced par defaults.

### After play

Show a provisional result, each person's Brass change, and the largest swing. Require all game participants to confirm before the result becomes final. Provide “Review scores” and a clear pending-player label. No silent timeout settlement in the first release.

The first ledger entry creates a head-to-head relationship automatically. Nobody needs to create a circle or pay before seeing the value. The summary leads to that rivalry, with a simple “Play again” action that opens a new setup rather than dispatching unsolicited invitations.

## Exact skins variant implemented in the calculator

This is a chosen Linksman house-rule variant, not a claim that all golfers play skins this way.

1. Two to four unique players; nine or eighteen played holes.
2. Gross means no allowances. Net requires agreed strokes received for the game and a confirmed hardest-to-easiest ordering of every played hole.
3. Allocate whole game strokes evenly across the holes, with the remainder assigned in stroke order. An allowance of 10 over nine holes means two on the hardest hole and one on each other hole. These are agreed game strokes, not an official Handicap Index.
4. A unique lowest adjusted score wins the hole plus all carried skins.
5. A tie for lowest carries; players tied above the low score do not affect the winner.
6. Each opponent transfers one Brass per skin to the winner.
7. If a player's score is missing, that hole is unresolved. Later holes cannot resolve carryovers until the earlier hole is complete.
8. Ties remaining at the last hole are unawarded. No spillover to a different round, fabricated tiebreaker or fractional awards.
9. No birdie doubles, verification hole, par-or-better requirement, mid-round presses or buy-in in this version.
10. The calculator consumes immutable score snapshots and returns reproducible provisional awards. It does not authorize players or persist results.

Example with Gavin, Alex and Chris:

| Hole | Scores    | Result                     | Brass movement                  |
| ---- | --------- | -------------------------- | ------------------------------- |
| 1    | 4 / 4 / 5 | Low tied; one skin carries | None                            |
| 2    | 5 / 5 / 6 | Low tied; two skins carry  | None                            |
| 3    | 4 / 5 / 6 | Gavin wins three skins     | Alex → Gavin 3; Chris → Gavin 3 |

Gavin gains 6, Alex loses 3, Chris loses 3. Head-to-head shows Gavin +3 against each opponent. Total Brass across the game is zero. The winner has not received three points from an unexplained system account.

### Fairness without a premature “Linksman Index”

The older score-minus-par normalization is not a course-rated handicap. Do not use it as an authoritative fairness promise. Let groups choose gross or explicitly agree the strokes received over their selected nine/eighteen holes. Reconfirm each round; display the effect before play.

Do not silently assign missing stroke indexes by hole order. A net skins game waits for a confirmed order; gross remains available as an explicit choice. Fairness features remain free. Later index work needs course/tee data validation and dedicated testing.

## Side challenges: same record, different evidence

Start with closest to the pin. Host designates the eligible par-3 hole before play. All accepted challenge participants compete; one claims a winner and another participant confirms. For the first release, all participating players confirm the final result with the main game.

Proposed rules: tee shot must finish on the putting surface; nearest qualifying shot wins; no qualifying shot means no award; an unresolved tie means no award. A winner earns one Brass from each other challenge participant. Longest drive similarly requires a designated hole and a drive finishing in the fairway. These definitions must be shown at setup and remain unchanged mid-round.

Barkies and sandies are story-worthy, but add them only after the claim/confirmation/correction workflow is trusted. Do not infer bunker saves or tree hits from score/par alone. Never award repeatedly on each tap.

Allow opting into a challenge separately from the main game. Record the accepted participant set so a spectator or opted-out player is not charged Brass.

## What the ledger should show

Primary: head-to-head rows, sorted by recent shared play:

- “Alex leads by 4 Brass.”
- “You won the last round.”
- “6 games together · last played Saturday.”

Detail: date, course, agreed rules, players, individual outcomes and exact award explanations. Provide all-time and later season filters. A group aggregate is secondary: someone can have a larger total simply because they played more rounds or faced more opponents. Show rounds played and avoid presenting raw group totals as a universal skill ranking.

Never simplify pairwise rivalry transfers through a cash-style debt-netting algorithm: a win over Alex should not turn into a synthetic claim against Chris. Sum the actual directed awards for each pair.

Narrative should be factual and opt-in: a comeback, a lead change, a tied rivalry. No invented “you need to win next week” urgency, no pressure to raise stakes, and no humiliating losing streak notifications. Players control what followers can see.

## Persistence, trust and corrections

The existing app has rounds, memberships and score rows; the game/ledger tables are not deployed yet.

Proposed model:

- round_games: format, immutable rules/roster/allowance snapshot, engine version and current revision.
- round_game_players: accepted rules version and scoring permissions.
- game_result_revisions: score-snapshot hash, result status and audit metadata.
- game_result_confirmations: participant and exact revision confirmed.
- ledger_entries: game, revision, deterministic award key, from/to, whole Brass and explanation.
- round_challenges: designated hole, eligibility/rules, accepted players and confirmed outcome.

Client shows previews. A trusted server function derives the final result from stored scores and accepted settings; it must never accept a client-supplied amount or winner as authoritative. Lock relevant records in one transaction and enforce uniqueness on game/revision/award key. Repeated finish requests must not double-award.

A score correction invalidates confirmations and creates a new revision. Finalized entries must be reversed/replaced through an audited transaction, not quietly overwritten. The displayed ledger must clearly distinguish confirmed and disputed results. Durable score submission and authoritative calculations remain separate responsibilities.

A participant withdrawing mid-game does not cause the engine to drop them and recalculate everyone else's stakes. For the initial release, void the game explicitly if it cannot be completed; preserve the scorecards. A future agreed partial-game rule can be a separately versioned variant. Existing host force-finish behavior cannot be used as proof that missing scores were actually played.

Deletion/account privacy needs a policy before ledger deployment: retain other participants' legitimate history using an anonymized identity where appropriate, rather than cascading away their results. Do not reuse the old proposed cascade-delete ledger schema unexamined.

## Ease of use for older golfers

- Choose clear labels: “Who’s playing?”, “Choose a game”, “Strokes received”, “Review result”.
- Keep text scalable, controls at least 44–48 points, and outcomes understandable without color.
- Score entry is the primary action; other games are computed automatically.
- Remember course/group/rules, but show them before acceptance.
- Show one keyboard-dismissal action when editing, not multiple permanent Done links.
- Consider one designated scorer only with explicit participant delegation and an edit audit.
- Guest play should use scoped invitations and later account claiming; never shared passwords or public write access.
- Use a readable join/share preview before requiring installation. Implement browser scoring only after securing these identities.
- User confidence matters more than decorative animations. Give a small optional celebration for a genuine swing.

## Commercial hypothesis and Melbourne test

Live Tourney's organizer pricing does not validate our consumer business model. First prove that existing groups choose Linksman again without the developer organizing every round.

Keep joining, core games, agreed allowances and viewing one's results free. Explore charging a regular group organizer for season administration, richer rivalry analysis, exports and convenience after repeated use. Do not finalize “free forever” commitments or a subscription price from this research alone. Do not prioritize expensive GPS/data work simply because it is a familiar subscription feature.

Suggested experiment, not a forecast: recruit five existing Melbourne groups for three rounds each, including twosomes/threesomes and older players. Record:

- Time from invitation to the first saved score.
- Whether players can explain the rules and the result without coaching.
- Completion and correction/dispute frequency.
- Whether a second round starts without prompting.
- Whether players actually look at the rivalry before the next round.
- Whether the organizer asks to use it again and what they would pay to keep.

A useful initial gate is four of five groups completing their first game without intervention and three returning within their normal playing cadence. Small samples guide the next iteration; they do not establish product-market fit.

## Build sequence and honest status

Implemented in this turn:

- Deterministic skins calculator for 2–4 players, gross/net, 9/18 holes.
- Pairwise Brass movement, carryovers, final ties, missing-score behavior and validation.
- Eight new test cases; no production game UI or database writes.

Next end-to-end slice:

1. Transactional game creation, frozen participants/settings and consent.
2. Skins setup and live result strip on the existing group score screen.
3. Server calculation, revision confirmation and idempotent ledger commit.
4. One head-to-head list/detail and the post-round result screen.
5. Physical two-, three- and four-player tests including reconnect, correction and withdrawal.

Then add closest-to-pin using the same consent and revision model, followed by match play. Circles, more formats and monetization follow actual repeat use.

Do not show this calculator as a finished rivalry feature in the phone app before authorization, settlement, corrections and acceptance tests exist.
