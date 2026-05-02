import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleScoreGrid } from '@/components/HoleScoreGrid';
import { useFinalizeRound, useRoundHoles } from '@/lib/queries/rounds';
import { supabase, type Tables } from '@/lib/supabase';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
};

export default function Summary() {
  const { roundId } = useLocalSearchParams<{ roundId: string }>();
  const [visibility, setVisibility] = useState<'mutuals' | 'private'>('mutuals');
  const finalize = useFinalizeRound();

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

  async function onSave() {
    if (!roundId) return;
    await finalize.mutateAsync({
      roundId,
      updates: {
        total_score: totals.score,
        total_par: totals.par,
        visibility,
      },
    });
    router.replace('/(app)/(tabs)/profile');
  }

  const totalHoles = roundQ.data?.courses?.hole_count ?? 18;

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

      <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-4">
        <Text className="text-text-secondary text-xs uppercase tracking-wider mb-3">Holes</Text>
        <HoleScoreGrid holes={holesQ.data ?? []} totalHoles={totalHoles} />
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
