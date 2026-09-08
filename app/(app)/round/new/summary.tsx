import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/Button';
import { MonoBadge } from '@/components/MonoBadge';
import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleGrid } from '@/components/HoleGrid';
import { palette } from '@/theme/linksman';
import { useFinalizeRound, useRoundHoles, useUpdateRoundNotes } from '@/lib/queries/rounds';
import { NotesField } from '@/components/NotesField';
import { usePersonalBestAtCourse } from '@/lib/queries/stats';
import { useSession } from '@/lib/hooks/useSession';
import { supabase, type Tables } from '@/lib/supabase';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
};

export default function Summary() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const [visibility, setVisibility] = useState<'mutuals' | 'private'>('mutuals');
  const finalize = useFinalizeRound();
  const updateRoundNotes = useUpdateRoundNotes();

  const roundQ = useQuery({
    queryKey: ['round', roundId],
    queryFn: async () => {
      if (!roundId) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, hole_count)')
        .eq('id', roundId)
        .single();
      if (error) throw error;
      return data as RoundWithCourse;
    },
    enabled: !!roundId,
  });

  const holesQ = useRoundHoles(roundId);

  const totals = useMemo(() => {
    const scored = holesQ.data ?? [];
    const score = scored.reduce((a, h) => a + h.score, 0);
    const par = scored.reduce((a, h) => a + h.par, 0);
    return { score, par, diff: score - par };
  }, [holesQ.data]);

  const { session } = useSession();
  const courseId = roundQ.data?.course_id;
  const bestQ = usePersonalBestAtCourse(session?.user.id, courseId);

  // Personal-best query filters is_draft=false so the in-progress round (which
  // is still a draft until Save is tapped) is never in bestQ.data. So:
  // - bestQ.data == null → first ever completed round at this course
  // - totals.score < bestQ.data.total_score → new best
  const isNewBest =
    bestQ.isFetched && (bestQ.data == null || totals.score < (bestQ.data.total_score ?? Infinity));

  async function onSave() {
    if (!roundId) return;
    try {
      await finalize.mutateAsync({
        roundId,
        updates: { total_score: totals.score, total_par: totals.par, visibility },
      });
      router.replace('/(app)/(tabs)/profile');
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : 'Check your connection and try saving again.';
      Alert.alert('Round not saved', message);
    }
  }

  const totalHoles = roundQ.data?.hole_count ?? roundQ.data?.courses?.hole_count ?? 18;

  return (
    <ScreenContainer>
      <Text className="text-text-secondary text-xs uppercase tracking-wider mt-6">
        Round complete
      </Text>
      <Text className="text-text-primary text-3xl font-light mt-1 mb-4">
        {roundQ.data?.courses?.name ?? '...'}
      </Text>

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-5 mb-4">
        <Text
          style={{ fontSize: 64 }}
          className="text-accent font-light tracking-tight leading-none"
        >
          {totals.score}
        </Text>
        <Text className="text-text-secondary text-sm mt-2">
          {totals.diff >= 0 ? `+${totals.diff}` : totals.diff} · {totalHoles} holes · Par{' '}
          {totals.par}
        </Text>
      </View>

      <View style={{ marginBottom: 16, borderTopWidth: 0.5, borderTopColor: palette.ink + '14' }}>
        <NotesField
          value={roundQ.data?.notes ?? ''}
          onChange={(t) => {
            if (roundQ.data) updateRoundNotes.mutate({ roundId: roundQ.data.id, notes: t });
          }}
          surface="bone"
        />
      </View>

      {isNewBest ? (
        <View className="bg-accent-soft border border-accent rounded-2xl px-4 py-3 mb-4 flex-row items-center gap-2">
          <MonoBadge color={palette.brass} bg="transparent" border={false}>
            {bestQ.data == null ? '◆ FIRST ROUND' : '◆ COURSE BEST'}
          </MonoBadge>
          {bestQ.data != null ? (
            <Text className="text-text-secondary text-xs">(was {bestQ.data.total_score})</Text>
          ) : null}
        </View>
      ) : null}

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-4">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-3">Holes</Text>
        <HoleGrid
          holes={(holesQ.data ?? []).map((h) => ({
            score: h.score,
            par: h.par,
            delta: h.score - h.par,
          }))}
        />
      </View>

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-6">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">
          Visibility
        </Text>
        <View className="flex-row gap-2">
          {(['mutuals', 'private'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setVisibility(v)}
              className={`flex-1 py-3 rounded-xl border items-center ${
                visibility === v ? 'border-accent bg-accent-soft' : 'border-border-subtle'
              }`}
            >
              <Text
                className={`font-semibold capitalize ${
                  visibility === v ? 'text-accent' : 'text-text-primary'
                }`}
              >
                {v === 'mutuals' ? 'Friends' : 'Private'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="text-text-secondary text-xs mt-2">
          {visibility === 'mutuals'
            ? 'Visible to mutual followers when feed launches in Phase 3.'
            : 'Only you can see this round.'}
        </Text>
      </View>

      <View className="mt-auto pb-6">
        <Button label="Save round" onPress={onSave} loading={finalize.isPending} />
      </View>
    </ScreenContainer>
  );
}
