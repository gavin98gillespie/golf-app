export type FairwayCategory = 'fairway' | 'rough' | 'sand' | 'water' | null;
export type HoleDraft = {
  score: number;
  par: number;
  putts: number | null;
  fairwayCategory: FairwayCategory;
  gir: boolean | null;
};
export type DraftState = {
  value: HoleDraft | null;
  status: 'loading' | 'untouched' | 'unsaved' | 'saving' | 'saved' | 'error';
};

/** One editor per player/hole. Reads hydrate once; only edits or confirmation write.
 * Writes are serialized so an older response cannot overwrite a later edit.
 */
export class ScoreDraft {
  private state: DraftState = { value: null, status: 'loading' };
  private listeners = new Set<() => void>();
  private revision = 0;
  private savedRevision = 0;
  private recorded = false;
  private pending: Promise<void> | null = null;
  private localWrite: Promise<void> = Promise.resolve();

  constructor(
    private readonly save: (value: HoleDraft) => Promise<void>,
    private readonly journal?: {
      write(value: HoleDraft): Promise<void>;
      acknowledge(value: HoleDraft): Promise<void>;
    },
  ) {}

  private checkpoint(value: HoleDraft) {
    this.localWrite = this.journal?.write(value) ?? Promise.resolve();
    void this.localWrite.catch(() => {
      this.publish({ value: this.state.value, status: 'error' });
    });
  }

  restore(value: HoleDraft) {
    if (this.state.value) return;
    this.revision = 1;
    this.publish({ value, status: 'unsaved' });
  }

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(state: DraftState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }

  hydrate(value: HoleDraft, recorded: boolean) {
    if (this.state.value) return;
    this.recorded = recorded;
    this.publish({ value, status: recorded ? 'saved' : 'untouched' });
  }

  edit<K extends keyof HoleDraft>(
    key: K,
    update: HoleDraft[K] | ((prev: HoleDraft[K]) => HoleDraft[K]),
  ) {
    if (!this.state.value) return;
    const next = typeof update === 'function' ? update(this.state.value[key]) : update;
    if (next === this.state.value[key]) return;
    this.revision++;
    const value = { ...this.state.value, [key]: next };
    this.checkpoint(value);
    this.publish({ value, status: 'unsaved' });
  }

  flush = async (confirm = false): Promise<void> => {
    if (!this.state.value) throw new Error('Score has not loaded');
    // Advancing confirms the displayed score, even if the golfer leaves it at par.
    if (confirm && !this.recorded && this.revision === this.savedRevision) {
      this.revision++;
      this.checkpoint(this.state.value);
    }
    if (this.pending) return this.pending;
    // A previous disk failure can be retried without changing the score.
    if (this.state.status === 'error') this.checkpoint(this.state.value);
    this.pending = this.drain();
    try {
      await this.pending;
    } finally {
      this.pending = null;
    }
  };

  private async drain() {
    while (this.savedRevision < this.revision && this.state.value) {
      const revision = this.revision;
      const value = this.state.value;
      this.publish({ value, status: 'saving' });
      try {
        await this.localWrite;
        await this.save(value);
        await this.journal?.acknowledge(value);
      } catch (error) {
        this.publish({ value: this.state.value, status: 'error' });
        throw error;
      }
      this.savedRevision = revision;
      this.recorded = true;
    }
    this.publish({ value: this.state.value, status: this.recorded ? 'saved' : 'untouched' });
  }
}
