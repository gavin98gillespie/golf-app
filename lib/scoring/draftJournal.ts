import { z } from 'zod';
import type { HoleDraft } from './scoreDraft';

export type DraftStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
const schema = z.object({
  version: z.literal(1),
  value: z.object({
    score: z.number().int().min(1).max(20),
    par: z.number().int().min(3).max(6),
    putts: z.number().int().min(0).max(10).nullable(),
    fairwayCategory: z.enum(['fairway', 'rough', 'sand', 'water']).nullable(),
    gir: z.boolean().nullable(),
  }),
});

export function draftKey(playerId: string, roundId: string, hole: number) {
  return `linksman:score:v1:${playerId}:${roundId}:${hole}`;
}

/** Serializes disk operations per hole, including acknowledgment. An old network
 * response must never delete a newer score written while that request was pending.
 */
export class DraftJournal {
  private pending = new Map<string, Promise<unknown>>();
  constructor(private readonly storage: DraftStorage) {}

  private run<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = this.pending.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(action);
    this.pending.set(key, next);
    void next
      .finally(() => {
        if (this.pending.get(key) === next) this.pending.delete(key);
      })
      .catch(() => {});
    return next;
  }

  read(key: string): Promise<HoleDraft | null> {
    return this.run(key, async () => {
      const raw = await this.storage.getItem(key);
      if (raw === null) return null;
      // Leave malformed data on disk and report a failure instead of silently
      // treating it as no score and replacing it with remote/default data.
      return schema.parse(JSON.parse(raw)).value;
    });
  }

  write(key: string, value: HoleDraft): Promise<void> {
    const encoded = JSON.stringify(schema.parse({ version: 1, value }));
    return this.run(key, () => this.storage.setItem(key, encoded));
  }

  acknowledge(key: string, value: HoleDraft): Promise<void> {
    const expected = JSON.stringify(schema.parse({ version: 1, value }));
    return this.run(key, async () => {
      if ((await this.storage.getItem(key)) === expected) await this.storage.removeItem(key);
    });
  }
}
