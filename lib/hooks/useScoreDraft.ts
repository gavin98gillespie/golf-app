import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DraftJournal, draftKey } from '@/lib/scoring/draftJournal';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

import { ScoreDraft, type HoleDraft } from '@/lib/scoring/scoreDraft';
import { useUpsertHoleScore } from '@/lib/queries/rounds';
import type { Tables } from '@/lib/supabase';

const journal = new DraftJournal(AsyncStorage);

export function useScoreDraft(input: {
  roundId: string | undefined;
  playerId: string | undefined;
  hole: number;
  ready: boolean;
  existing: Tables<'round_holes'> | undefined;
  coursePar: number | undefined;
}) {
  const mutation = useUpsertHoleScore();
  const saveRef = useRef(mutation.mutateAsync);
  saveRef.current = mutation.mutateAsync;
  const { roundId, playerId, hole, ready, existing, coursePar } = input;
  const draft = useMemo(
    () =>
      new ScoreDraft(
        async (value) => {
          if (!roundId || !playerId) throw new Error('Missing player or round');
          await saveRef.current({
            round_id: roundId,
            player_id: playerId,
            hole_number: hole,
            score: value.score,
            par: value.par,
            putts: value.putts,
            gir: value.gir,
            fairway_hit:
              value.fairwayCategory === null ? null : value.fairwayCategory === 'fairway',
          });
        },
        {
          write: (value) => journal.write(draftKey(playerId!, roundId!, hole), value),
          acknowledge: (value) => journal.acknowledge(draftKey(playerId!, roundId!, hole), value),
        },
      ),
    [roundId, playerId, hole],
  );
  const state = useSyncExternalStore(draft.subscribe, draft.getSnapshot, draft.getSnapshot);
  const [recovery, setRecovery] = useState<{ draft: ScoreDraft; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!roundId || !playerId) return;
    let active = true;
    void journal
      .read(draftKey(playerId, roundId, hole))
      .then((value) => {
        if (!active) return;
        if (value) draft.restore(value);
        setRecovery({ draft, error: false });
      })
      .catch(() => {
        if (active) setRecovery({ draft, error: true });
      });
    return () => {
      active = false;
    };
  }, [draft, roundId, playerId, hole, retry]);
  const recovered = recovery?.draft === draft && !recovery.error;
  const recoveryError = recovery?.draft === draft && recovery.error;
  const navigation = useNavigation();
  const leaving = useRef(false);
  usePreventRemove(
    state.status === 'unsaved' || state.status === 'saving' || state.status === 'error',
    ({ data }) => {
      if (leaving.current) return;
      leaving.current = true;
      void draft
        .flush()
        .then(() => {
          navigation.dispatch(data.action);
        })
        .catch(() => {
          Alert.alert(
            'Score not saved',
            'Keep this screen open and check your connection, then try again.',
          );
        })
        .finally(() => {
          leaving.current = false;
        });
    },
  );

  useEffect(() => {
    if (!ready || !recovered || !roundId || !playerId) return;
    const par = existing?.par ?? coursePar ?? 4;
    draft.hydrate(
      {
        par,
        score: existing?.score ?? par,
        putts: existing?.putts ?? null,
        gir: existing?.gir ?? null,
        fairwayCategory:
          existing?.fairway_hit === true
            ? 'fairway'
            : existing?.fairway_hit === false
              ? 'rough'
              : null,
      },
      !!existing,
    );
  }, [draft, ready, recovered, roundId, playerId, existing, coursePar]);

  useEffect(() => {
    if (!ready || !recovered || state.status !== 'unsaved') return;
    const timer = setTimeout(() => {
      void draft.flush().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, state, ready, recovered]);

  const save = async (confirm = true) => {
    try {
      await draft.flush(confirm);
      return true;
    } catch {
      Alert.alert(
        'Score not saved',
        'Keep this screen open and check your connection, then try again.',
      );
      return false;
    }
  };
  const edit =
    <K extends keyof HoleDraft>(key: K) =>
    (value: HoleDraft[K] | ((prev: HoleDraft[K]) => HoleDraft[K])) =>
      draft.edit(key, value);

  return {
    ...state,
    value: ready && recovered ? state.value : null,
    recoveryError,
    retryRecovery: () => setRetry((value) => value + 1),
    save,
    setPar: edit('par'),
    setScore: edit('score'),
    setFairwayCategory: edit('fairwayCategory'),
    setGir: edit('gir'),
  };
}
