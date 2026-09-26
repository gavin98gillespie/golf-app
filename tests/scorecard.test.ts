import test from 'node:test';
import assert from 'node:assert/strict';
import { nextUnscoredPlayer, scorecardTotals } from '../lib/games/scorecard';

test('group progression visits unscored players before the next hole', () => {
  const players = ['alex', 'sam', 'pat'];
  assert.equal(nextUnscoredPlayer(players, 'alex', new Set(['alex'])), 'sam');
  assert.equal(nextUnscoredPlayer(players, 'sam', new Set(['alex', 'sam'])), 'pat');
  assert.equal(nextUnscoredPlayer(players, 'pat', new Set(players)), undefined);
});
test('jumping between players cannot skip an unrecorded player', () => {
  assert.equal(nextUnscoredPlayer(['alex', 'sam', 'pat'], 'pat', new Set(['pat'])), 'alex');
  assert.equal(nextUnscoredPlayer(['alex'], 'alex', new Set(['alex'])), undefined);
});
test('solo and selected-player totals use the same hole and par calculation', () => {
  const prior = [
    { hole_number: 1, score: 3, par: 4 },
    { hole_number: 2, score: 8, par: 4 },
  ];
  // The current draft replaces the old hole-2 score rather than being counted twice.
  assert.deepEqual(scorecardTotals(2, 4, 5, 9, prior, []), {
    thru: 2,
    totalScore: 7,
    vsPar: '-2',
    projected: 35,
  });
});
