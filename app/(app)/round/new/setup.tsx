import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/lib/hooks/useSession';
import { useCreateDraftRound } from '@/lib/queries/rounds';
import { supabase, type Tables } from '@/lib/supabase';
import { palette } from '@/theme/linksman';

export default function RoundSetup() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { session } = useSession();
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  const createRound = useCreateDraftRound();
  const [startError, setStartError] = useState<string | null>(null);

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
    if (createRound.isPending) return;
    setStartError(null);
    if (!session || !courseId) {
      setStartError('Your session or course is missing. Go back and choose your course again.');
      return;
    }
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
      setStartError('We couldn’t start your round. Check your connection and try again.');
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingTop: 24, paddingBottom: 32 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to course selection"
          disabled={createRound.isPending}
          style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <Text style={{ color: palette.sage, fontSize: 17 }}>‹ Change course</Text>
        </Pressable>
        <Text style={{ color: palette.bone, fontSize: 30, marginTop: 16 }}>Round setup</Text>
        <Text style={{ color: palette.bone, fontSize: 18, marginTop: 8, marginBottom: 28 }}>
          {courseQ.data?.name ?? 'Your selected course'}
        </Text>
        <Text style={{ color: palette.bone, fontSize: 18, marginBottom: 12 }}>How many holes?</Text>
        <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 12 }}>
          {([9, 18] as const).map((n) => {
            const active = holeCount === n;
            return (
              <Pressable
                key={n}
                onPress={() => setHoleCount(n)}
                disabled={createRound.isPending}
                accessibilityRole="radio"
                accessibilityLabel={`${n} holes`}
                accessibilityState={{ checked: active, disabled: createRound.isPending }}
                style={{
                  flex: 1,
                  minHeight: 80,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: active ? palette.sage : palette.graphite,
                  backgroundColor: active ? palette.fairway : palette.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: palette.bone, fontSize: 22, fontWeight: '600' }}>
                  {n} holes{active ? ' ✓' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: palette.bone, fontSize: 16, marginTop: 16, marginBottom: 20 }}>
          {holeCount} holes selected. Tap below to begin.
        </Text>
        <Button
          label={`Start ${holeCount}-hole round`}
          onPress={onStart}
          loading={createRound.isPending}
          disabled={!courseId}
        />
        {startError && (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{ color: palette.bone, fontSize: 17, marginTop: 16 }}
          >
            {startError}
          </Text>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
