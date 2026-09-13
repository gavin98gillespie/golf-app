/** Linksman skins v1: points only, one unit from each opponent per won skin.
 * This is a deterministic calculator, not an authorization/settlement service.
 */
export type SkinsPlayer = {
  id: string;
  /** Agreed strokes RECEIVED over this game's 9 or 18 holes, not an official index. */
  strokesReceived: number;
};
export type SkinsScore = { playerId: string; hole: number; strokes: number };
export type SkinsInput = {
  players: readonly SkinsPlayer[];
  holeCount: 9 | 18;
  mode: 'gross' | 'net';
  /** Hardest-to-easiest permutation of the played hole numbers. Required for net. */
  strokeOrder?: readonly number[];
  scores: readonly SkinsScore[];
};
export type BrassTransfer = {
  awardKey: string;
  from: string;
  to: string;
  brass: number;
  hole: number;
};
export type SkinHole = {
  hole: number;
  state: 'waiting' | 'carried' | 'won';
  skinsAtStake: number | null;
  winnerId: string | null;
  scores: { playerId: string; gross: number; strokesReceived: number; net: number }[];
};
export type SkinsResult = {
  engineVersion: 'skins-v1';
  holes: SkinHole[];
  transfers: BrassTransfer[];
  balances: Record<string, number>;
  resolvedHoles: number;
  allScoresPresent: boolean;
  carryover: number;
  unawardedSkins: number;
};

export function calculateSkins(input: SkinsInput): SkinsResult {
  const { players, holeCount, mode, scores } = input;
  if (holeCount !== 9 && holeCount !== 18) throw new Error('Choose 9 or 18 holes.');
  if (mode !== 'gross' && mode !== 'net') throw new Error('Choose gross or net scoring.');
  if (players.length < 2 || players.length > 4) throw new Error('Skins requires 2–4 players.');
  const ids = players.map((p) => p.id);
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length) {
    throw new Error('Each player needs a unique ID.');
  }
  for (const p of players) {
    if (
      !Number.isInteger(p.strokesReceived) ||
      p.strokesReceived < 0 ||
      p.strokesReceived > holeCount * 3
    ) {
      throw new Error('Enter whole game strokes between zero and three per hole.');
    }
    if (mode === 'gross' && p.strokesReceived !== 0) {
      throw new Error('Gross games cannot apply stroke allowances.');
    }
  }
  const order = input.strokeOrder;
  if (
    mode === 'net' &&
    (!order ||
      order.length !== holeCount ||
      new Set(order).size !== holeCount ||
      order.some((h) => !Number.isInteger(h) || h < 1 || h > holeCount))
  ) {
    throw new Error('Net skins needs a confirmed stroke order for every played hole.');
  }
  const byHole = new Map<number, Map<string, number>>();
  for (const score of scores) {
    if (!ids.includes(score.playerId)) throw new Error('Score belongs to a non-participant.');
    if (!Number.isInteger(score.hole) || score.hole < 1 || score.hole > holeCount) {
      throw new Error('Score is outside the game.');
    }
    if (!Number.isInteger(score.strokes) || score.strokes < 1 || score.strokes > 99) {
      throw new Error('Scores must be whole strokes from 1 to 99.');
    }
    const row = byHole.get(score.hole) ?? new Map<string, number>();
    if (row.has(score.playerId)) throw new Error('Duplicate player score for a hole.');
    row.set(score.playerId, score.strokes);
    byHole.set(score.hole, row);
  }

  const holes: SkinHole[] = [];
  const transfers: BrassTransfer[] = [];
  // Null prototype prevents player IDs such as "__proto__" affecting aggregation.
  const balances: Record<string, number> = Object.create(null);
  for (const id of ids) balances[id] = 0;
  let carry = 0;
  let resolvedHoles = 0;
  let waiting = false;
  for (let hole = 1; hole <= holeCount; hole++) {
    const row = byHole.get(hole);
    const ranked = players.flatMap((p) => {
      const gross = row?.get(p.id);
      if (gross === undefined) return [];
      const received =
        mode === 'gross'
          ? 0
          : Math.floor(p.strokesReceived / holeCount) +
            (order!.indexOf(hole) < p.strokesReceived % holeCount ? 1 : 0);
      return [{ playerId: p.id, gross, strokesReceived: received, net: gross - received }];
    });
    // A later hole cannot resolve a carryover until all earlier holes resolve.
    if (waiting || ranked.length !== players.length) {
      waiting = true;
      holes.push({
        hole,
        state: 'waiting',
        skinsAtStake: null,
        winnerId: null,
        scores: ranked,
      });
      continue;
    }
    resolvedHoles++;
    carry++;
    const low = Math.min(...ranked.map((score) => score.net));
    const winners = ranked.filter((score) => score.net === low);
    const winner = winners.length === 1 ? winners[0]!.playerId : null;
    holes.push({
      hole,
      state: winner ? 'won' : 'carried',
      skinsAtStake: carry,
      winnerId: winner,
      scores: ranked,
    });
    if (!winner) continue;
    for (const opponent of ids) {
      if (opponent === winner) continue;
      transfers.push({
        // Scoped by game ID and settlement revision when persisted.
        awardKey: JSON.stringify(['skins-v1', hole, opponent, winner]),
        from: opponent,
        to: winner,
        brass: carry,
        hole,
      });
      balances[opponent] = balances[opponent]! - carry;
      balances[winner] = balances[winner]! + carry;
    }
    carry = 0;
  }
  const allScoresPresent = resolvedHoles === holeCount;
  return {
    engineVersion: 'skins-v1',
    holes,
    transfers,
    balances,
    resolvedHoles,
    allScoresPresent,
    carryover: allScoresPresent ? 0 : carry,
    // Final tied holes expire; no unagreed tiebreaker or fractional awards.
    unawardedSkins: allScoresPresent ? carry : 0,
  };
}
