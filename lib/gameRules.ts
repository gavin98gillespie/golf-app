export const GAME_RULES = {
  skins: {
    title: 'Skins',
    subtitle: '2–4 players · 9 or 18 holes',
    summary: 'Win holes. Ties carry forward.',
    rules: [
      'Record a score for every player on the hole. Lowest score wins the skin.',
      'If the lowest score is tied, the skin carries to the next hole. Any carryover left at the end expires.',
      'The winner receives the chosen Brass amount for each skin from every opponent.',
      'Gross uses actual scores. Net uses the stroke allowances and hole difficulty order entered for this round.',
    ],
    example:
      'Three players, 10 Brass per skin: winning one skin earns 20 Brass—10 from each opponent.',
  },
  closest: {
    title: 'Closest to pin',
    subtitle: 'Side game · usually a par 3',
    summary: 'One shot. Nearest to the hole wins.',
    rules: [
      'Pick the hole, players and Brass amount before teeing off.',
      'Recommended rule: only tee shots that finish on the green count.',
      'The eligible ball closest to the hole wins. Measure if it is close.',
      'No eligible shot or an exact tie? Leave it unawarded, unless your group agreed another rule.',
    ],
    example:
      'Record a 50 Brass result from Alex to Sam: Sam gains 50 and Alex loses 50. Add another payer only if that was agreed.',
  },
  drive: {
    title: 'Longest drive',
    subtitle: 'Side game · choose a suitable hole',
    summary: 'Longest tee shot in the fairway.',
    rules: [
      'Choose the hole, players and Brass amount before teeing off.',
      'Recommended rule: the tee shot must finish in the fairway.',
      'The longest eligible drive wins. The scorekeeper records the winner.',
      'No eligible drive or an exact tie? Leave it unawarded unless you agreed a tiebreaker.',
    ],
    example: 'A 20 Brass entry transfers exactly 20 from the selected player to the winner.',
  },
  custom: {
    title: 'Custom game',
    subtitle: 'Your group · your rules',
    summary: 'Record a challenge your way.',
    rules: [
      'Give the game a name everyone understands.',
      'Agree who is playing, how to win and the Brass amount.',
      'Decide how ties work before you begin.',
      'Choose the payer and winner to record the result. One scorekeeper can correct it later.',
    ],
    example:
      '“Sand save, hole 8” for 15 Brass records a 15 Brass transfer between the two selected players.',
  },
} as const;
export type GameKind = keyof typeof GAME_RULES;
export function isGameKind(value: unknown): value is GameKind {
  return typeof value === 'string' && Object.hasOwn(GAME_RULES, value);
}
