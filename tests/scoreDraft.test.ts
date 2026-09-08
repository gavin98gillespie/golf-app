import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { ScoreDraft, type HoleDraft } from '../lib/scoring/scoreDraft';

const hole: HoleDraft = { score: 7, par: 5, putts: 2, fairwayCategory: 'rough', gir: false };
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

test('cold editor cannot save defaults before hydration', async () => {
  const writes: HoleDraft[] = [];
  const draft = new ScoreDraft(async (value) => {
    writes.push(value);
  });
  draft.edit('score', 4);
  await assert.rejects(draft.flush(true), /not loaded/);
  assert.equal(writes.length, 0);
  draft.hydrate(hole, true);
  await draft.flush();
  assert.equal(writes.length, 0);
  assert.deepEqual(draft.getSnapshot().value, hole);
});

test('background reads never replace local edits or historical par', () => {
  const draft = new ScoreDraft(async () => {});
  draft.hydrate(hole, true);
  draft.edit('score', 6);
  draft.hydrate({ ...hole, score: 4, par: 4 }, true);
  assert.deepEqual(draft.getSnapshot().value, { ...hole, score: 6 });
});

test('advancing immediately flushes the edit and preserves untouched putts', async () => {
  const writes: HoleDraft[] = [];
  const draft = new ScoreDraft(async (value) => {
    writes.push(value);
  });
  draft.hydrate(hole, true);
  draft.edit('score', (score) => score - 1);
  await draft.flush(true);
  assert.deepEqual(writes, [{ ...hole, score: 6 }]);
  assert.equal(draft.getSnapshot().status, 'saved');
});

test('viewing a new hole does not record par; advancing explicitly confirms it', async () => {
  let count = 0;
  const draft = new ScoreDraft(async () => {
    count++;
  });
  draft.hydrate({ ...hole, score: 5 }, false);
  await draft.flush();
  assert.equal(count, 0);
  await draft.flush(true);
  await draft.flush(true);
  assert.equal(count, 1);
});

test('slow saves serialize later edits and every flush waits for the latest score', async () => {
  const first = deferred();
  const second = deferred();
  const writes: number[] = [];
  const draft = new ScoreDraft(async (value) => {
    writes.push(value.score);
    await (writes.length === 1 ? first.promise : second.promise);
  });
  draft.hydrate(hole, true);
  draft.edit('score', 6);
  const saving = draft.flush();
  draft.edit('score', 5);
  let finished = false;
  const advancing = draft.flush(true).then(() => {
    finished = true;
  });
  await nextTurn();
  assert.deepEqual(writes, [6]);
  first.resolve();
  await nextTurn();
  assert.deepEqual(writes, [6, 5]);
  assert.equal(finished, false);
  second.resolve();
  await Promise.all([saving, advancing]);
  assert.equal(finished, true);
  assert.equal(draft.getSnapshot().status, 'saved');
});

test('failed writes retain edits for explicit retry', async () => {
  let attempts = 0;
  const writes: HoleDraft[] = [];
  const draft = new ScoreDraft(async (value) => {
    if (++attempts === 1) throw new Error('offline');
    writes.push(value);
  });
  draft.hydrate(hole, true);
  draft.edit('score', 8);
  await assert.rejects(draft.flush(true), /offline/);
  assert.equal(draft.getSnapshot().status, 'error');
  assert.equal(draft.getSnapshot().value?.score, 8);
  await draft.flush(true);
  assert.deepEqual(writes, [{ ...hole, score: 8 }]);
});

test('each player and hole has an independent draft', async () => {
  const writes: string[] = [];
  const first = new ScoreDraft(async () => {
    writes.push('first');
  });
  const second = new ScoreDraft(async () => {
    writes.push('second');
  });
  first.hydrate(hole, true);
  second.hydrate({ ...hole, score: 4 }, true);
  first.edit('score', 9);
  await first.flush();
  assert.deepEqual(writes, ['first']);
  assert.equal(second.getSnapshot().value?.score, 4);
});
