import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { HoleScoreGrid } from '@/components/HoleScoreGrid';
import { useRoundHoles } from '@/lib/queries/rounds';
import { supabase, type Tables } from '@/lib/supabase';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count' | 'city' | 'state'> | null;
};

export default function RoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const roundQ = useQuery({
    queryKey: ['round', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('rounds')
        .select('*, courses(name, hole_count, city, state)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as RoundWithCourse;
    },
    enabled: !!id,
  });

  const holesQ = useRoundHoles(id);

  const totals = useMemo(() => {
    const scored = holesQ.data ?? [];
    const score = scored.reduce((a, h) => a + h.score, 0);
    const par = scored.reduce((a, h) => a + h.par, 0);
    return { score, par, diff: score - par };
  }, [holesQ.data]);

  if (!roundQ.data) {
    return (
      <ScreenContainer>
        <Text className="text-text-secondary mt-12">Loading...</Text>
      </ScreenContainer>
    );
  }

  const totalHoles = roundQ.data.courses?.hole_count ?? 18;
  const dateStr = format(new Date(roundQ.data.played_at), 'MMMM d, yyyy');

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Back</Text>
      </Pressable>

      <Text className="text-text-secondary text-xs uppercase tracking-wider mt-2">{dateStr}</Text>
      <Pressable
        onPress={() =>
          roundQ.data?.course_id ? router.push(`/course/${roundQ.data.course_id}`) : undefined
        }
        className="active:opacity-70"
      >
        <Text className="text-text-primary text-3xl font-light mt-1 mb-1">
          {roundQ.data.courses?.name ?? 'Round'}
        </Text>
        <Text className="text-accent text-xs uppercase tracking-wider mb-4">View course →</Text>
      </Pressable>

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
    </ScreenContainer>
  );
}
