import { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/lib/hooks/useSession';
import { useUserRoundsAtCourse } from '@/lib/queries/stats';
import { supabase, type Tables } from '@/lib/supabase';
import { parseLocalDate } from '@/lib/date';

export default function CourseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();

  const courseQ = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Tables<'courses'>;
    },
    enabled: !!id,
  });

  const roundsQ = useUserRoundsAtCourse(session?.user.id, id);

  const stats = useMemo(() => {
    const rounds = roundsQ.data ?? [];
    if (rounds.length === 0) return null;
    const scores = rounds.map((r) => r.total_score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      played: rounds.length,
      best: Math.min(...scores),
      average: Math.round(avg),
    };
  }, [roundsQ.data]);

  if (!courseQ.data) {
    return (
      <ScreenContainer>
        <Text className="text-text-secondary mt-12">Loading…</Text>
      </ScreenContainer>
    );
  }

  const subtitle = [courseQ.data.city, courseQ.data.state].filter(Boolean).join(', ');

  return (
    <ScreenContainer>
      <Pressable onPress={() => router.back()} className="mt-4 mb-2">
        <Text className="text-text-secondary text-sm">← Back</Text>
      </Pressable>
      <Text className="text-text-primary text-3xl font-light tracking-tight mt-2">
        {courseQ.data.name}
      </Text>
      <Text className="text-text-secondary text-sm mt-1 mb-6">
        {subtitle || '—'} · {courseQ.data.hole_count} holes
      </Text>

      {stats ? (
        <View className="bg-bg-surface border border-border-subtle rounded-2xl p-4 mb-6 flex-row">
          <View className="flex-1">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Played</Text>
            <Text className="text-text-primary text-2xl font-light mt-1">{stats.played}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">Best</Text>
            <Text className="text-text-primary text-2xl font-light mt-1">{stats.best}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-[10px] uppercase tracking-wider">
              Average
            </Text>
            <Text className="text-text-primary text-2xl font-light mt-1">{stats.average}</Text>
          </View>
        </View>
      ) : (
        <Text className="text-text-secondary text-sm mb-6">
          You haven&apos;t scored a round here yet.
        </Text>
      )}

      <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">
        Your rounds here
      </Text>
      <FlatList
        data={roundsQ.data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => {
          const diff = item.total_score - item.total_par;
          const dateStr = format(parseLocalDate(item.played_at), 'MMM d, yyyy');
          return (
            <Pressable
              onPress={() => router.push(`/round/${item.id}`)}
              className="flex-row items-center justify-between py-3 border-b border-border-subtle active:opacity-60"
            >
              <View>
                <Text className="text-text-primary text-sm font-semibold">{dateStr}</Text>
              </View>
              <View className="items-end">
                <Text className="text-text-primary text-base font-semibold">
                  {item.total_score}
                </Text>
                <Text className="text-accent text-xs">{diff >= 0 ? `+${diff}` : diff}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text className="text-text-secondary text-sm mt-2">No rounds at this course yet.</Text>
        }
      />
    </ScreenContainer>
  );
}
