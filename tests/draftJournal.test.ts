import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DraftJournal, draftKey, type DraftStorage } from '../lib/scoring/draftJournal';
import { ScoreDraft, type HoleDraft } from '../lib/scoring/scoreDraft';

const value: HoleDraft = { score: 6, par: 4, putts: 2, gir: false, fairwayCategory: 'rough' };
const key = draftKey('player-a', 'round-a', 1);
function disk() {
  const rows = new Map<string, string>();
  const storage: DraftStorage = {
    getItem: async (key) => rows.get(key) ?? null,
    setItem: async (key, value) => {
      rows.set(key, value);
    },
    removeItem: async (key) => {
      rows.delete(key);
    },
  };
  return { rows, storage };
}

test('pending scores survive a fresh journal and remain scoped to their player', async () => {
  const { storage } = disk();
  await new DraftJournal(storage).write(key, value);
  const restarted = new DraftJournal(storage);
  assert.deepEqual(await restarted.read(key), value);
  assert.equal(await restarted.read(draftKey('player-b', 'round-a', 1)), null);
});

test('acknowledging an older server save preserves the newer disk edit', async () => {
  const { storage } = disk();
  const journal = new DraftJournal(storage);
  await journal.write(key, value);
  const newer = { ...value, score: 7 };
  const writing = journal.write(key, newer);
  const acknowledging = journal.acknowledge(key, value);
  await Promise.all([writing, acknowledging]);
  assert.deepEqual(await journal.read(key), newer);
  await journal.acknowledge(key, newer);
  assert.equal(await journal.read(key), null);
});

test('corrupt local records fail closed and are not deleted', async () => {
  const { storage, rows } = disk();
  rows.set(key, '{broken');
  await assert.rejects(new DraftJournal(storage).read(key));
  assert.equal(rows.get(key), '{broken');
});

test('a failed server save can be restored, retried and acknowledged after restart', async () => {
  const { storage } = disk();
  const journal = new DraftJournal(storage);
  const adapter = {
    write: (value: HoleDraft) => journal.write(key, value),
    acknowledge: (value: HoleDraft) => journal.acknowledge(key, value),
  };
  const original = new ScoreDraft(async () => {
    throw new Error('offline');
  }, adapter);
  original.hydrate(value, true);
  original.edit('score', 8);
  await assert.rejects(original.flush(), /offline/);
  const restoredValue = await new DraftJournal(storage).read(key);
  assert.equal(restoredValue?.score, 8);
  const writes: HoleDraft[] = [];
  const restarted = new ScoreDraft(async (value) => {
    writes.push(value);
  }, adapter);
  restarted.restore(restoredValue!);
  restarted.hydrate(value, true);
  await restarted.flush();
  assert.equal(writes[0]?.score, 8);
  assert.equal(await journal.read(key), null);
});

test('disk failure blocks a server save and can be retried', async () => {
  let fail = true;
  let remote = 0;
  const draft = new ScoreDraft(
    async () => {
      remote++;
    },
    {
      write: async () => {
        if (fail) throw new Error('disk full');
      },
      acknowledge: async () => {},
    },
  );
  draft.hydrate(value, true);
  draft.edit('score', 7);
  await assert.rejects(draft.flush(), /disk full/);
  assert.equal(remote, 0);
  fail = false;
  await draft.flush();
  assert.equal(remote, 1);
});
