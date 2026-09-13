import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateSkins, type SkinsInput, type SkinsScore } from '../lib/games/skins';

const players = ['Gavin', 'Alex', 'Chris'].map((id) => ({ id, strokesReceived: 0 }));
const input = (scores: SkinsScore[], extra: Partial<SkinsInput> = {}): SkinsInput => ({
  players,
  scores,
  holeCount: 9,
  mode: 'gross',
  ...extra,
});
const hole = (n: number, values: number[]): SkinsScore[] =>
  values.map((strokes, i) => ({ hole: n, playerId: players[i]!.id, strokes }));

test('three-player carryover produces explainable pairwise Brass, with zero net creation', () => {
  const result = calculateSkins(
    input([...hole(1, [4, 4, 5]), ...hole(2, [5, 5, 6]), ...hole(3, [4, 5, 6])]),
  );
  assert.equal(result.holes[2]!.skinsAtStake, 3);
  assert.equal(result.transfers.length, 2);
  assert.equal(result.balances.Gavin, 6);
  assert.equal(result.balances.Alex, -3);
  assert.equal(result.balances.Chris, -3);
  assert.equal(
    Object.values(result.balances).reduce((a, b) => a + b, 0),
    0,
  );
});

test('missing scores never imply par, a win, or later-hole carryover resolution', () => {
  const result = calculateSkins(
    input([...hole(1, [4, 4, 5]), ...hole(2, [4, 5]), ...hole(3, [3, 5, 6])]),
  );
  assert.equal(result.resolvedHoles, 1);
  assert.equal(result.transfers.length, 0);
  assert.equal(result.holes[2]!.state, 'waiting');
  assert.equal(result.carryover, 1);
  assert.equal(result.allScoresPresent, false);
});

test('nine-hole final ties are unawarded, never silently split or carried into another round', () => {
  const result = calculateSkins(
    input(Array.from({ length: 9 }, (_, i) => hole(i + 1, [4, 4, 5])).flat()),
  );
  assert.equal(result.allScoresPresent, true);
  assert.equal(result.unawardedSkins, 9);
  assert.equal(result.carryover, 0);
  assert.equal(result.transfers.length, 0);
});

test('net strokes wrap and use the confirmed ranking for this nine-hole game', () => {
  const result = calculateSkins(
    input(hole(1, [4, 5, 7]), {
      mode: 'net',
      strokeOrder: [1, 9, 8, 7, 6, 5, 4, 3, 2],
      players: [
        { id: 'Gavin', strokesReceived: 0 },
        { id: 'Alex', strokesReceived: 10 },
        { id: 'Chris', strokesReceived: 0 },
      ],
    }),
  );
  assert.equal(result.holes[0]!.winnerId, 'Alex');
  assert.deepEqual(result.holes[0]!.scores[1], {
    playerId: 'Alex',
    gross: 5,
    strokesReceived: 2,
    net: 3,
  });
  assert.equal(result.balances.Alex, 2);
});

test('net games fail closed without reliable stroke allocation', () => {
  assert.throws(() => calculateSkins(input([], { mode: 'net' })), /confirmed stroke order/);
  assert.throws(
    () => calculateSkins(input([], { mode: 'net', strokeOrder: Array(9).fill(1) })),
    /confirmed stroke order/,
  );
  assert.throws(
    () =>
      calculateSkins(
        input([], {
          players: [
            { id: 'a', strokesReceived: 1 },
            { id: 'b', strokesReceived: 0 },
          ],
        }),
      ),
    /Gross/,
  );
});

test('rejects duplicate scores, outsiders, invalid scores, and duplicate players', () => {
  assert.throws(() => calculateSkins(input([...hole(1, [4, 5, 6]), ...hole(1, [4])])), /Duplicate/);
  assert.throws(
    () => calculateSkins(input([{ hole: 1, playerId: 'outsider', strokes: 4 }])),
    /non-participant/,
  );
  assert.throws(() => calculateSkins(input(hole(1, [0, 5, 6]))), /whole strokes/);
  assert.throws(
    () => calculateSkins(input([], { players: [players[0]!, players[0]!] })),
    /unique ID/,
  );
});

test('supports two and four players across eighteen holes and conserves Brass', () => {
  for (const size of [2, 4]) {
    const group = Array.from({ length: size }, (_, i) => ({ id: String(i), strokesReceived: 0 }));
    const scores = Array.from({ length: 18 }, (_, i) =>
      group.map((p, j) => ({ hole: i + 1, playerId: p.id, strokes: j === i % size ? 3 : 4 })),
    ).flat();
    const result = calculateSkins({ players: group, holeCount: 18, mode: 'gross', scores });
    assert.equal(result.transfers.length, 18 * (size - 1));
    assert.equal(result.allScoresPresent, true);
    assert.equal(new Set(result.transfers.map((t) => t.awardKey)).size, result.transfers.length);
    assert.equal(
      Object.values(result.balances).reduce((a, b) => a + b, 0),
      0,
    );
  }
});

test('score corrections deterministically recompute awards without mutating input', () => {
  const original = input(hole(1, [3, 4, 5]));
  const before = JSON.stringify(original);
  assert.deepEqual(calculateSkins(original), calculateSkins(original));
  const corrected = calculateSkins(input(hole(1, [5, 4, 5])));
  assert.equal(corrected.holes[0]!.winnerId, 'Alex');
  assert.equal(JSON.stringify(original), before);
});
