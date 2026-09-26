import test from 'node:test';
import assert from 'node:assert/strict';
import { roundBrassBalance } from '../lib/games/roundBrass';
test('round Brass combines live Skins and side games with the correct direction', () => {
  const entries = [
    { from_player: 'a', to_player: 'b', amount: 50 },
    { from_player: 'b', to_player: 'a', amount: 20 },
  ];
  assert.equal(roundBrassBalance('a', { a: 10, b: -10 }, entries), -20);
  assert.equal(roundBrassBalance('b', { a: 10, b: -10 }, entries), 20);
  assert.equal(roundBrassBalance('spectator', { a: 10 }, entries), 0);
});
test('removed Skins and decimal Brass remain accurate', () => {
  assert.equal(roundBrassBalance('a', undefined, []), 0);
  assert.equal(
    roundBrassBalance('a', { a: 0.1 }, [{ from_player: 'b', to_player: 'a', amount: 0.2 }]),
    0.3,
  );
});
