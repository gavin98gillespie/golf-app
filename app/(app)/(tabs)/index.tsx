import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ScreenContainer } from '@/components/ScreenContainer';
import { useSession } from '@/lib/hooks/useSession';
import { useDraftRound } from '@/lib/queries/rounds';
import { supabase, type Tables } from '@/lib/supabase';

export default function Feed() {
  const { session } = useSession();
  const draftQ = useDraftRound(session?.user.id);

  // Look up the course name + hole_count for the draft (if any) so the banner
  // is useful and we know how many holes to scan when resuming.
  const courseQ = useQuery({
    queryKey: ['course', draftQ.data?.course_id],
    queryFn: async () => {
      if (!draftQ.data?.course_id) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('name, hole_count')
        .eq('id', draftQ.data.course_id)
        .single();
      if (error) throw error;
      return data as Pick<Tables<'courses'>, 'name' | 'hole_count'>;
    },
    enabled: !!draftQ.data?.course_id,
  });

  // Compute next hole to resume at (smallest hole_number not yet scored).
  const totalHoles = courseQ.data?.hole_count ?? 18;
  const resumeQ = useQuery({
    queryKey: ['resume_hole', draftQ.data?.id, totalHoles],
    queryFn: async () => {
      if (!draftQ.data) return 1;
      const { data, error } = await supabase
        .from('round_holes')
        .select('hole_number')
        .eq('round_id', draftQ.data.id);
      if (error) throw error;
      const scored = new Set((data ?? []).map((r) => r.hole_number));
      for (let n = 1; n <= totalHoles; n++) if (!scored.has(n)) return n;
      return totalHoles;
    },
    enabled: !!draftQ.data,
  });

  const draft = draftQ.data;

  return (
    <ScreenContainer>
      <Text className="text-text-primary text-3xl font-light mt-8">Home</Text>

      {draft && courseQ.data ? (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/round/new/score',
              params: { roundId: draft.id, hole: String(resumeQ.data ?? 1) },
            })
          }
          className="bg-bg-surface border border-accent rounded-2xl p-4 mt-4 active:opacity-80"
        >
          <Text className="text-accent text-xs uppercase tracking-wider font-semibold">
            In progress
          </Text>
          <Text className="text-text-primary text-lg font-semibold mt-1">
            Resume at {courseQ.data.name}
          </Text>
          <Text className="text-text-secondary text-sm mt-1">
            Continue scoring at hole {resumeQ.data ?? 1}
          </Text>
        </Pressable>
      ) : null}

      <Text className="text-text-secondary mt-6">Feed comes in Phase 3.</Text>
    </ScreenContainer>
  );
}
