import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/lib/hooks/useSession';
import { useCreateDraftRound } from '@/lib/queries/rounds';
import { supabase, type Tables } from '@/lib/supabase';

export default function RoundSetup() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { session } = useSession();
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  const createRound = useCreateDraftRound();

  const courseQ = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data as Tables<'courses'>;
    },
    enabled: !!courseId,
  });

  async function onStart() {
    if (!session || !courseId) return;
    try {
      const round = await createRound.mutateAsync({
        user_id: session.user.id,
        course_id: courseId,
        tee_box: 'default',
        total_score: 0,
        total_par: 0,
        played_at: format(new Date(), 'yyyy-MM-dd'),
        hole_count: holeCount,
      });
      router.replace({
        pathname: '/round/new/score',
        params: { roundId: round.id, hole: '1' },
      });
    } catch {
      Alert.alert('Round could not start', 'Your round could not be created. Please try again.');
    }
  }

  return (
    <ScreenContainer>
      <Text className="text-text-primary text-3xl font-light mt-6 mb-2">Round setup</Text>
      <Text className="text-text-secondary mb-8">{courseQ.data?.name ?? '...'}</Text>

      <Text className="text-text-secondary text-xs uppercase tracking-wider mb-2">Holes</Text>
      <View className="flex-row gap-3 mb-6">
        {[9, 18].map((n) => {
          const active = holeCount === n;
          return (
            <Pressable
              key={n}
              onPress={() => setHoleCount(n as 9 | 18)}
              className={`flex-1 py-4 rounded-xl border items-center ${
                active ? 'border-accent bg-accent-soft' : 'border-border-subtle'
              }`}
            >
              <Text className={`font-semibold ${active ? 'text-accent' : 'text-text-primary'}`}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-auto pb-6">
        <Button
          label="Start scoring"
          onPress={onStart}
          loading={createRound.isPending}
          disabled={!courseId}
        />
      </View>
    </ScreenContainer>
  );
}
