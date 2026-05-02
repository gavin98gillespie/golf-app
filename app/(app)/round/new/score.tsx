import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ScoreStepper } from '@/components/ScoreStepper';
import { HoleProgressBar } from '@/components/HoleProgressBar';
import { supabase, type Tables } from '@/lib/supabase';
import { useUpsertHoleScore, useRoundHoles } from '@/lib/queries/rounds';

type RoundWithCourse = Tables<'rounds'> & {
  courses: Pick<Tables<'courses'>, 'name' | 'hole_count'> | null;
};

export default function HoleEntry() {
  const { roundId, hole: holeParam } = useLocalSearchParams<{
    roundId: string;
    hole: string;
  }>();
  const hole = parseInt(holeParam ?? '1', 10);

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

  const courseHolesQ = useQuery({
    queryKey: ['course_holes', roundQ.data?.course_id, roundQ.data?.tee_box],
    queryFn: async () => {
      if (!roundQ.data) return [];
      const { data, error } = await supabase
        .from('course_holes')
        .select('*')
        .eq('course_id', roundQ.data.course_id)
        .eq('tee_box', roundQ.data.tee_box);
      if (error) throw error;
      return (data ?? []) as Tables<'course_holes'>[];
    },
    enabled: !!roundQ.data,
  });

  const roundHolesQ = useRoundHoles(roundId);
  const upsert = useUpsertHoleScore();

  const totalHoles = roundQ.data?.courses?.hole_count ?? 18;
  const courseHole = courseHolesQ.data?.find((h) => h.hole_number === hole);
  const existingHole = roundHolesQ.data?.find((h) => h.hole_number === hole);

  const initialPar = courseHole?.par ?? existingHole?.par ?? 4;
  const initialScore = existingHole?.score ?? initialPar;
  const [par, setPar] = useState(initialPar);
  const [score, setScore] = useState(initialScore);

  // Re-sync local state ONLY when navigating to a different hole. We deliberately
  // don't re-sync on roundHolesQ.data changes — that would race with the user's
  // next tap and revert in-progress edits.
  useEffect(() => {
    const eh = roundHolesQ.data?.find((h) => h.hole_number === hole);
    const ch = courseHolesQ.data?.find((h) => h.hole_number === hole);
    const newPar = ch?.par ?? eh?.par ?? 4;
    setPar(newPar);
    setScore(eh?.score ?? newPar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hole]);

  // Debounced autosave: writes round_holes whenever score or par changes.
  useEffect(() => {
    if (!roundId) return;
    const t = setTimeout(() => {
      upsert.mutate({
        round_id: roundId,
        hole_number: hole,
        score,
        par,
      });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, par, hole, roundId]);

  const running = useMemo(() => {
    const scored = roundHolesQ.data ?? [];
    const sum = scored.reduce((a, h) => a + h.score, 0);
    const parSum = scored.reduce((a, h) => a + h.par, 0);
    return { score: sum, diff: sum - parSum };
  }, [roundHolesQ.data]);

  const isLast = hole >= totalHoles;

  return (
    <ScreenContainer>
      <View className="mt-4">
        <HoleProgressBar
          current={hole}
          total={totalHoles}
          runningScore={running.score}
          runningDiff={running.diff}
        />
      </View>
      <View className="items-center mt-8 mb-6">
        <Text className="text-6xl font-light text-text-primary">{hole}</Text>
        <Text className="text-text-secondary text-sm mt-1">
          Par {par}
          {courseHole?.yardage ? ` · ${courseHole.yardage} yd` : ''}
        </Text>
        {!courseHole ? (
          <View className="flex-row mt-3 gap-2">
            {[3, 4, 5].map((p) => (
              <Pressable
                key={p}
                onPress={() => setPar(p)}
                className={`px-3 py-1 rounded-full border ${
                  par === p ? 'border-accent bg-accent-soft' : 'border-border-subtle'
                }`}
              >
                <Text className={par === p ? 'text-accent' : 'text-text-secondary'}>Par {p}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <ScoreStepper score={score} par={par} onChange={setScore} />
      <View className="flex-row justify-between mt-auto pb-6">
        <Pressable
          onPress={() => hole > 1 && router.setParams({ hole: String(hole - 1) })}
          disabled={hole === 1}
        >
          <Text className={hole === 1 ? 'text-text-muted' : 'text-text-secondary'}>
            ← Hole {hole - 1}
          </Text>
        </Pressable>
        {isLast ? (
          <Pressable
            onPress={() => router.replace({ pathname: '/round/new/summary', params: { roundId } })}
          >
            <Text className="text-accent font-semibold">Finish round →</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.setParams({ hole: String(hole + 1) })}>
            <Text className="text-accent font-semibold">Hole {hole + 1} →</Text>
          </Pressable>
        )}
      </View>
    </ScreenContainer>
  );
}
