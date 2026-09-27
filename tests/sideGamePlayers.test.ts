import assert from 'node:assert/strict';
import { test } from 'node:test';
import { payerForWinner } from '../lib/games/sideGamePlayers';
test('twosome opponent pays, including after changing the winner', () => {
  assert.equal(payerForWinner(['a', 'b'], 'a', ''), 'b');
  assert.equal(payerForWinner(['a', 'b'], 'b', 'b'), 'a');
  assert.equal(payerForWinner(['a', 'b'], 'missing', 'b'), '');
});
test('larger groups require a distinct selected payer', () => {
  assert.equal(payerForWinner(['a', 'b', 'c'], 'a', ''), '');
  assert.equal(payerForWinner(['a', 'b', 'c'], 'a', 'a'), '');
  assert.equal(payerForWinner(['a', 'b', 'c'], 'a', 'c'), 'c');
});
